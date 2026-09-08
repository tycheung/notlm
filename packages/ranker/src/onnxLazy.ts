import { featurizeUtterance } from './features.js';
import { inferRankerJson } from './infer.js';
import { exportIntentOnnx } from './onnxExport.js';
import type { RankerInferResult, RankerModelJson } from './types.js';

type OrtModule = {
  InferenceSession: {
    create: (
      model: Uint8Array,
      options?: { executionProviders?: string[] }
    ) => Promise<{
      run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>>;
    }>;
  };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
};

let ortLoad: Promise<OrtModule | null> | null = null;

/** Lazy-load onnxruntime-node (Node) or onnxruntime-web (browser). Never required. */
export async function loadOnnxRuntime(): Promise<OrtModule | null> {
  if (!ortLoad) {
    ortLoad = (async () => {
      try {
        return (await import('onnxruntime-node')) as unknown as OrtModule;
      } catch {
        try {
          return (await import('onnxruntime-web')) as unknown as OrtModule;
        } catch {
          return null;
        }
      }
    })();
  }
  return ortLoad;
}

export type RankerSession = {
  model: RankerModelJson;
  /** Prefer ONNX when runtime is available; always falls back to JSON. */
  infer: (utterance: string) => Promise<RankerInferResult>;
  backendPreferred: 'onnx' | 'json';
};

/**
 * Create a lazy ranker session. ONNX bytes are built on first infer when preferred.
 * Feature flag should gate construction; this never throws if ORT is missing.
 */
export function createRankerSession(
  model: RankerModelJson,
  opts?: { preferOnnx?: boolean }
): RankerSession {
  const preferOnnx = opts?.preferOnnx !== false;
  let onnxSession: Awaited<ReturnType<OrtModule['InferenceSession']['create']>> | null =
    null;
  let onnxFailed = false;
  let ortTensor: OrtModule['Tensor'] | null = null;

  return {
    model,
    backendPreferred: preferOnnx ? 'onnx' : 'json',
    async infer(utterance: string) {
      if (!preferOnnx || onnxFailed) {
        return inferRankerJson(model, utterance);
      }
      try {
        const ort = await loadOnnxRuntime();
        if (!ort) {
          onnxFailed = true;
          return inferRankerJson(model, utterance);
        }
        if (!onnxSession) {
          const bytes = exportIntentOnnx(model);
          onnxSession = await ort.InferenceSession.create(bytes);
          ortTensor = ort.Tensor;
        }
        const x = featurizeUtterance(utterance, model.dim, model.ngrams);
        const tensor = new ortTensor!('float32', x, [1, model.dim]);
        const out = await onnxSession.run({ X: tensor });
        const probsData = out.probs?.data;
        if (!probsData || probsData.length !== model.intentLabels.length) {
          throw new Error('ONNX output shape mismatch');
        }
        const intents = model.intentLabels.map((label, i) => ({
          label,
          score: Math.log((probsData[i] ?? 1e-9) + 1e-9),
          probability: probsData[i] ?? 0,
        }));
        intents.sort(
          (a, b) => b.probability - a.probability || a.label.localeCompare(b.label)
        );
        // Slots always from JSON head (not in ONNX graph)
        const json = inferRankerJson(model, utterance);
        return {
          intent: intents[0]!,
          intents,
          slots: json.slots,
          backend: 'onnx',
        };
      } catch {
        onnxFailed = true;
        return inferRankerJson(model, utterance);
      }
    },
  };
}
