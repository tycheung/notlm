import { featurizeUtterance } from './features.js';
import { inferRankerJson, subsetIntentDistribution } from './infer.js';
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

export type RankerInferOpts = { labels?: string[] };

export type RankerSession = {
  model: RankerModelJson;
  /** Prefer ONNX when runtime + prebuilt bytes are available; always falls back to JSON. */
  infer: (utterance: string, opts?: RankerInferOpts) => Promise<RankerInferResult>;
  backendPreferred: 'onnx' | 'json';
};

export type CreateRankerSessionOpts = {
  preferOnnx?: boolean;
  /** Pre-built ONNX bytes from offline training (never synthesized at runtime). */
  onnxBytes?: Uint8Array;
};

/**
 * Create a lazy ranker session.
 * ONNX runs only when preferOnnx and onnxBytes are both provided; otherwise JSON.
 */
export function createRankerSession(
  model: RankerModelJson,
  opts?: CreateRankerSessionOpts
): RankerSession {
  const onnxBytes = opts?.onnxBytes;
  const preferOnnx = opts?.preferOnnx !== false && !!onnxBytes;
  let onnxSession: Awaited<ReturnType<OrtModule['InferenceSession']['create']>> | null =
    null;
  let onnxFailed = false;
  let ortTensor: OrtModule['Tensor'] | null = null;

  return {
    model,
    backendPreferred: preferOnnx ? 'onnx' : 'json',
    async infer(utterance: string, inferOpts?: RankerInferOpts) {
      if (!preferOnnx || onnxFailed || !onnxBytes) {
        return inferRankerJson(model, utterance, inferOpts);
      }
      try {
        const ort = await loadOnnxRuntime();
        if (!ort) {
          onnxFailed = true;
          return inferRankerJson(model, utterance, inferOpts);
        }
        if (!onnxSession) {
          onnxSession = await ort.InferenceSession.create(onnxBytes);
          ortTensor = ort.Tensor;
        }
        const x = featurizeUtterance(utterance, model.dim, model.ngrams);
        const tensor = new ortTensor!('float32', x, [1, model.dim]);
        const out = await onnxSession.run({ X: tensor });
        const probsData = out.probs?.data;
        if (!probsData || probsData.length !== model.intentLabels.length) {
          throw new Error('ONNX output shape mismatch');
        }
        const all = model.intentLabels.map((label, i) => ({
          label,
          score: Math.log((probsData[i] ?? 1e-9) + 1e-9),
          probability: probsData[i] ?? 0,
        }));
        const intents = subsetIntentDistribution(all, inferOpts?.labels);
        const json = inferRankerJson(model, utterance, inferOpts);
        return {
          intent: intents[0]!,
          intents,
          slots: json.slots,
          backend: 'onnx',
        };
      } catch {
        onnxFailed = true;
        return inferRankerJson(model, utterance, inferOpts);
      }
    },
  };
}
