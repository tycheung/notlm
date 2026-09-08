import { featurizeUtterance } from './features.js';
import type { RankerInferResult, RankerIntentScore, RankerModelJson, RankerSlotScore } from './types.js';

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function intentLogits(model: RankerModelJson, x: Float32Array): number[] {
  const C = model.intentLabels.length;
  const D = model.dim;
  const out = new Array<number>(C).fill(0);
  for (let c = 0; c < C; c += 1) {
    let sum = model.intentB[c] ?? 0;
    const row = c * D;
    for (let d = 0; d < D; d += 1) {
      sum += (model.intentW[row + d] ?? 0) * (x[d] ?? 0);
    }
    out[c] = sum;
  }
  return out;
}

function slotProbs(model: RankerModelJson, x: Float32Array): RankerSlotScore[] {
  const S = model.slotLabels.length;
  const D = model.dim;
  const out: RankerSlotScore[] = [];
  for (let s = 0; s < S; s += 1) {
    let sum = model.slotB[s] ?? 0;
    const row = s * D;
    for (let d = 0; d < D; d += 1) {
      sum += (model.slotW[row + d] ?? 0) * (x[d] ?? 0);
    }
    out.push({ key: model.slotLabels[s]!, probability: sigmoid(sum) });
  }
  return out.sort((a, b) => b.probability - a.probability);
}

/** Pure-TS inference from ranker.json weights (default / CI path). */
export function inferRankerJson(model: RankerModelJson, utterance: string): RankerInferResult {
  const x = featurizeUtterance(utterance, model.dim, model.ngrams);
  const logits = intentLogits(model, x);
  const probs = softmax(logits);
  const intents: RankerIntentScore[] = model.intentLabels.map((label, i) => ({
    label,
    score: logits[i] ?? 0,
    probability: probs[i] ?? 0,
  }));
  intents.sort((a, b) => b.probability - a.probability || a.label.localeCompare(b.label));
  return {
    intent: intents[0] ?? { label: 'unknown', score: 0, probability: 1 },
    intents,
    slots: slotProbs(model, x),
    backend: 'json',
  };
}
