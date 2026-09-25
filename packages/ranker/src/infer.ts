import { featurizeUtterance } from './features.js';
import type {
  RankerInferResult,
  RankerIntentScore,
  RankerModelJson,
  RankerSlotScore,
} from './types.js';

export type InferRankerOpts = {
  /** Softmax / renorm only over these labels (shortlist + meta). */
  labels?: string[];
};

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

function sortIntents(intents: RankerIntentScore[]): RankerIntentScore[] {
  return [...intents].sort(
    (a, b) => b.probability - a.probability || a.label.localeCompare(b.label)
  );
}

/**
 * Restrict an intent distribution to `labels` and renormalize probabilities.
 * When labels is empty/undefined, returns the full distribution sorted.
 */
export function subsetIntentDistribution(
  intents: RankerIntentScore[],
  labels?: string[]
): RankerIntentScore[] {
  if (!labels?.length) return sortIntents(intents);
  const allow = new Set(labels);
  const subset = intents.filter((i) => allow.has(i.label));
  if (subset.length === 0) return sortIntents(intents);
  const sum = subset.reduce((a, b) => a + b.probability, 0) || 1;
  return sortIntents(
    subset.map((i) => ({
      ...i,
      probability: i.probability / sum,
    }))
  );
}

/** Meta / non-goto labels that should stay in a shortlist softmax. */
export function alwaysKeepLabels(intentLabels: string[]): string[] {
  return intentLabels.filter((l) => !l.startsWith('goto:'));
}

/** Build ranker label subset from step shortlist (+ all meta/unknown). */
export function labelsForStepShortlist(
  intentLabels: string[],
  shortlistStepIds?: string[]
): string[] | undefined {
  if (!shortlistStepIds?.length) return undefined;
  const meta = alwaysKeepLabels(intentLabels);
  const gotos = shortlistStepIds
    .map((id) => `goto:${id}`)
    .filter((l) => intentLabels.includes(l));
  return [...new Set([...meta, ...gotos])];
}

/** Pure-TS inference from ranker.json weights (default / CI path). */
export function inferRankerJson(
  model: RankerModelJson,
  utterance: string,
  opts?: InferRankerOpts
): RankerInferResult {
  const x = featurizeUtterance(utterance, model.dim, model.ngrams);
  const logits = intentLogits(model, x);
  const probs = softmax(logits);
  const all: RankerIntentScore[] = model.intentLabels.map((label, i) => ({
    label,
    score: logits[i] ?? 0,
    probability: probs[i] ?? 0,
  }));
  const intents = subsetIntentDistribution(all, opts?.labels);
  return {
    intent: intents[0] ?? { label: 'unknown', score: 0, probability: 1 },
    intents,
    slots: slotProbs(model, x),
    backend: 'json',
  };
}
