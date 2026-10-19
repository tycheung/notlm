import type { ActionRisk, ActionRiskIntentMap } from './actionRisk.js';
import { isActionGated } from './actionRisk.js';

/** Default: second score within 15% of top (probability or raw score ratio). */
export const DEFAULT_CONFLICT_DELTA = 0.15;

/** Risk pairs that must not winner-take-all when near-tied. */
export type ConflictRiskPair = readonly [ActionRisk, ActionRisk];

export const DEFAULT_CONFLICT_RISK_PAIRS: readonly ConflictRiskPair[] = [
  ['answer', 'navigate'],
  ['answer', 'mutate'],
  ['navigate', 'mutate'],
  ['clarify', 'navigate'],
  ['clarify', 'mutate'],
] as const;

export type IntentConflictConfig = {
  /** Max |p1 - p2| (or 1 - second/top) to treat as near-tie. Default 0.15. */
  conflictDelta?: number;
  conflictPairs?: readonly ConflictRiskPair[];
};

/** Pack/file shape for `routingConflict.json` (generic; no host brand). */
export type RoutingConflictConfig = IntentConflictConfig & {
  /** Optional intent → risk overrides for this pack. */
  intentMap?: ActionRiskIntentMap;
  /** Documented cue families (telemetry / training); not required at runtime. */
  families?: Array<{
    id: string;
    cues?: string[];
    preferRisk?: ActionRisk;
    avoidRisk?: ActionRisk;
    conflictWithCues?: string[];
  }>;
};

/**
 * True when top two scores are within delta (ratio form: second/top >= 1 - delta).
 */
export function scoresNearTie(
  topScore: number,
  secondScore: number,
  conflictDelta: number = DEFAULT_CONFLICT_DELTA
): boolean {
  if (!(topScore > 0) || !(secondScore > 0)) return false;
  const ratio = secondScore / topScore;
  return ratio >= 1 - conflictDelta;
}

export function risksConflict(
  a: ActionRisk,
  b: ActionRisk,
  pairs: readonly ConflictRiskPair[] = DEFAULT_CONFLICT_RISK_PAIRS
): boolean {
  if (a === b) return false;
  return pairs.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a)
  );
}

/**
 * Conceptual / how-to utterance parsed as navigate|mutate without FAQ/query head.
 * Defer rather than auto-open (audit: reports how-to → open-by-name).
 */
export function conceptualActionConflict(opts: {
  isConceptual: boolean;
  risk: ActionRisk;
  faqId?: string;
  queryId?: string;
}): boolean {
  if (!opts.isConceptual) return false;
  if (opts.faqId || opts.queryId) return false;
  return isActionGated(opts.risk);
}

export function shouldDeferConflict(opts: {
  riskA: ActionRisk;
  riskB: ActionRisk;
  topScore: number;
  secondScore: number;
  config?: IntentConflictConfig | null;
}): boolean {
  const delta = opts.config?.conflictDelta ?? DEFAULT_CONFLICT_DELTA;
  const pairs = opts.config?.conflictPairs ?? DEFAULT_CONFLICT_RISK_PAIRS;
  if (!scoresNearTie(opts.topScore, opts.secondScore, delta)) return false;
  return risksConflict(opts.riskA, opts.riskB, pairs);
}
