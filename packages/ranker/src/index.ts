export type { RankerModelJson, RankerInferResult, RankerIntentScore, RankerSlotScore } from './types.js';
export { featurizeUtterance, hashToken } from './features.js';
export { inferRankerJson } from './infer.js';
export {
  evaluateRankerSoftScore,
  DEFAULT_RANKER_SOFT_HIT_RATE,
  DEFAULT_RANKER_MIN_PROB,
  type RankerEvalCase,
  type RankerEvalFail,
  type RankerEvalResult,
} from './evaluate.js';
export {
  loadOnnxRuntime,
  createRankerSession,
  type RankerSession,
  type CreateRankerSessionOpts,
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
  const v = env.UIPILOT_ONNX_RANKER?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
