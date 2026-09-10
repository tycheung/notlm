import type { ScenarioCase } from '@uipilot/core';
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

export type RankerEvalResult = {
  ok: boolean;
  hitRate: number;
  hits: number;
  total: number;
  minHitRate: number;
  fails: RankerEvalFail[];
};

function expectedLabel(c: RankerEvalCase): string | null {
  const e = c.expect;
  if (e.goBack) return 'meta:go_back';
  if (e.rawIntent) return `meta:${e.rawIntent}`;
  if (typeof e.stepId === 'string' && e.stepId) return `goto:${e.stepId}`;
  return null;
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
  let hits = 0;
  for (const c of labeled) {
    const want = expectedLabel(c)!;
    const inferred = inferRankerJson(model, c.utterance);
    const actual = inferred.intent.label;
    const ok =
      actual === want && inferred.intent.probability >= minProbability;
    if (ok) hits += 1;
    else {
      fails.push({
        utterance: c.utterance,
        expected: want,
        actual,
        probability: inferred.intent.probability,
      });
    }
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
  };
}
