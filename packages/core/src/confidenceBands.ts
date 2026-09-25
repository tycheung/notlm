/**
 * Calibrated probability → ordinal confidence bands (System One style).
 * Shared by rule parser approximations and ranker hybrid.
 */
export const CONFIDENCE_HIGH_MIN = 0.85;
export const CONFIDENCE_MID_MIN = 0.45;

export type ConfidenceBand = 'high' | 'mid' | 'low';

/** Map a probability in [0, 1] to high / mid / low. */
export function probabilityToConfidence(p: number): ConfidenceBand {
  if (!Number.isFinite(p) || p < CONFIDENCE_MID_MIN) return 'low';
  if (p >= CONFIDENCE_HIGH_MIN) return 'high';
  return 'mid';
}

/**
 * Approximate a probability from rule phrase scores.
 * Exact/boundary hits score ~500; fuzzy ~250.
 */
export function ruleScoreToProbability(topScore: number): number {
  if (!Number.isFinite(topScore) || topScore <= 0) return 0;
  return Math.min(1, topScore / 500);
}
