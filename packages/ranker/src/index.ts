export type { RankerModelJson, RankerInferResult, RankerIntentScore, RankerSlotScore } from './types.js';
export { featurizeUtterance } from './features.js';
export {
  inferRankerJson,
  subsetIntentDistribution,
  labelsForStepShortlist,
  alwaysKeepLabels,
  type InferRankerOpts,
} from './infer.js';
export {
  inferDecision,
  inferDecisionFromRanked,
  type RankerDecision,
} from './decision.js';
export {
  evaluateRankerSoftScore,
  DEFAULT_RANKER_SOFT_HIT_RATE,
  DEFAULT_RANKER_MIN_PROB,
  type RankerEvalCase,
  type RankerEvalFail,
  type RankerEvalResult,
  type RankerBandMetrics,
} from './evaluate.js';
export {
  loadOnnxRuntime,
  createRankerSession,
  type RankerSession,
  type CreateRankerSessionOpts,
  type RankerInferOpts,
} from './onnxLazy.js';
export {
  createHybridUtteranceParser,
  createJsonHybridParser,
  extractHeuristicSlots,
  type UtteranceParser,
} from './hybrid.js';

export function isOnnxRankerEnabled(
  features?: { onnxRanker?: boolean },
  env: Record<string, string | undefined> = typeof process !== 'undefined'
    ? (process.env as Record<string, string | undefined>)
    : {}
): boolean {
  if (features?.onnxRanker === true) return true;
  if (features?.onnxRanker === false) return false;
  const v = env.NOTLM_ONNX_RANKER?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
