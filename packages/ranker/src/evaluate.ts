import type { ScenarioCase } from '@notlm/core';
import {
  CONFIDENCE_HIGH_MIN,
  CONFIDENCE_MID_MIN,
  probabilityToConfidence,
} from '@notlm/core';
import { inferRankerJson } from './infer.js';
import type { RankerModelJson } from './types.js';

export const DEFAULT_RANKER_SOFT_HIT_RATE = 0.85;
export const DEFAULT_RANKER_MIN_PROB = 0.35;

export type RankerEvalCase = ScenarioCase & { id?: string };

export type RankerEvalFail = {
  utterance: string;
  expected: string;
  actual: string;
  probability: number;
};

export type RankerBandMetrics = {
  high: { hits: number; total: number; hitRate: number };
  mid: { hits: number; total: number; hitRate: number };
  low: { hits: number; total: number; hitRate: number };
};

export type RankerEvalResult = {
  ok: boolean;
  hitRate: number;
  hits: number;
  total: number;
  minHitRate: number;
  fails: RankerEvalFail[];
  /** Per calibrated-band accuracy among labeled cases. */
  bands: RankerBandMetrics;
};

function expectedLabel(c: RankerEvalCase): string | null {
  const e = c.expect;
  if (e.goBack) return 'meta:go_back';
  if (e.rawIntent) return `meta:${e.rawIntent}`;
  if (typeof e.stepId === 'string' && e.stepId) return `goto:${e.stepId}`;
  return null;
}

function emptyBand(): RankerBandMetrics['high'] {
  return { hits: 0, total: 0, hitRate: 0 };
}

/**
 * Soft-score gate: fraction of labeled corpus/scenarios where the JSON ranker's
 * top intent matches the teacher label (and meets minProbability).
 */
export function evaluateRankerSoftScore(
  model: RankerModelJson,
  cases: RankerEvalCase[],
  opts?: { minHitRate?: number; minProbability?: number }
): RankerEvalResult {
  const minHitRate = opts?.minHitRate ?? DEFAULT_RANKER_SOFT_HIT_RATE;
  const minProbability = opts?.minProbability ?? DEFAULT_RANKER_MIN_PROB;
  const labeled = cases.filter((c) => expectedLabel(c) != null);
  const fails: RankerEvalFail[] = [];
  const bands: RankerBandMetrics = {
    high: emptyBand(),
    mid: emptyBand(),
    low: emptyBand(),
  };
  let hits = 0;
  for (const c of labeled) {
    const want = expectedLabel(c)!;
    const inferred = inferRankerJson(model, c.utterance);
    const actual = inferred.intent.label;
    const p = inferred.intent.probability;
    const band = probabilityToConfidence(p);
    bands[band].total += 1;
    const ok = actual === want && p >= minProbability;
    if (ok) {
      hits += 1;
      bands[band].hits += 1;
    } else {
      fails.push({
        utterance: c.utterance,
        expected: want,
        actual,
        probability: p,
      });
    }
  }
  for (const key of ['high', 'mid', 'low'] as const) {
    const b = bands[key];
    b.hitRate = b.total === 0 ? 0 : b.hits / b.total;
  }
  const total = labeled.length;
  const hitRate = total === 0 ? 0 : hits / total;
  return {
    ok: total > 0 && hitRate + 1e-9 >= minHitRate,
    hitRate,
    hits,
    total,
    minHitRate,
    fails,
    bands,
  };
}

export { CONFIDENCE_HIGH_MIN, CONFIDENCE_MID_MIN };
