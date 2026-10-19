import type { ParseUtteranceResult } from './types.js';
import {
  CONFIDENCE_HIGH_MIN,
  type ConfidenceBand,
} from './confidenceBands.js';

/**
 * Action-risk classes for routing quarantine (config-shaped; no host brand).
 * Pack FAQ answers freely; navigate/mutate are gated by confidence / conflict.
 */
export type ActionRisk = 'answer' | 'navigate' | 'mutate' | 'refuse' | 'clarify';

/** Default rawIntent prefixes / exact ids that map to a risk class. */
export type ActionRiskIntentMap = {
  /** Exact rawIntent → risk (wins over prefixes). */
  exact?: Record<string, ActionRisk>;
  /** rawIntent startsWith prefix → risk (first match). */
  prefixes?: Array<{ prefix: string; risk: ActionRisk }>;
};

export type ActionRiskConfig = {
  /**
   * Minimum calibrated probability (or band floor) to allow navigate/mutate
   * without deferring to fallback. Default = CONFIDENCE_HIGH_MIN (0.85).
   */
  actionConfidenceFloor?: number;
  /**
   * When true, mid-confidence navigate/mutate are treated like low (defer).
   * FAQ/answer mid paths stay unchanged.
   */
  treatMidAsLowForActions?: boolean;
  /** Optional host/pack overrides for intent → risk. */
  intentMap?: ActionRiskIntentMap;
};

export const DEFAULT_ACTION_RISK_INTENT_MAP: Required<
  Pick<ActionRiskIntentMap, 'exact' | 'prefixes'>
> = {
  exact: {
    faq: 'answer',
    help: 'answer',
    whats_next: 'answer',
    explain_field: 'answer',
    data_query: 'answer',
    lookup_participant: 'answer',
    ambiguous: 'clarify',
    unknown: 'clarify',
    ood: 'refuse',
    refuse: 'refuse',
    go_back: 'navigate',
    tour: 'navigate',
    search: 'navigate',
    do_it: 'mutate',
    correction: 'mutate',
    cancel_all: 'mutate',
    mutation: 'mutate',
    skip_side_actions: 'mutate',
  },
  prefixes: [
    { prefix: 'goto:', risk: 'navigate' },
    { prefix: 'open:', risk: 'navigate' },
    { prefix: 'nav:', risk: 'navigate' },
    { prefix: 'create:', risk: 'mutate' },
    { prefix: 'delete:', risk: 'mutate' },
    { prefix: 'apply:', risk: 'mutate' },
    { prefix: 'confirm:', risk: 'mutate' },
    { prefix: 'save:', risk: 'mutate' },
    { prefix: 'mutate:', risk: 'mutate' },
  ],
};

export function isActionGated(risk: ActionRisk): boolean {
  return risk === 'navigate' || risk === 'mutate';
}

/**
 * Classify risk from a parse result (catalog heads + rawIntent + surfaces).
 * Host brand / product step ids must not appear here — only generic shapes.
 */
export function actionRiskFromParsed(
  parsed: Pick<
    ParseUtteranceResult,
    | 'rawIntent'
    | 'faqId'
    | 'queryId'
    | 'mutationId'
    | 'tourId'
    | 'searchId'
    | 'openSurface'
    | 'openModal'
    | 'instructOnly'
  >,
  config?: ActionRiskConfig | null
): ActionRisk {
  const map = mergeIntentMap(config?.intentMap);

  // Catalog / surface heads win over rawIntent when present.
  if (parsed.mutationId) return 'mutate';
  if (parsed.tourId || parsed.searchId) return 'navigate';
  if (parsed.queryId || parsed.faqId) return 'answer';
  if (parsed.openSurface || parsed.openModal) {
    return parsed.instructOnly ? 'answer' : 'navigate';
  }

  const raw = parsed.rawIntent;
  if (!raw) return 'clarify';

  const exact = map.exact[raw];
  if (exact) return exact;

  for (const { prefix, risk } of map.prefixes) {
    if (raw.startsWith(prefix)) return risk;
  }

  // Unknown product meta intents default to answer (FAQ-like) unless gated later.
  return 'answer';
}

export function actionRiskFromIntent(
  rawIntent: string | null | undefined,
  config?: ActionRiskConfig | null
): ActionRisk {
  return actionRiskFromParsed({ rawIntent: rawIntent ?? null }, config);
}

/**
 * Whether navigate/mutate should defer (Laya / low_confidence) given confidence.
 */
export function shouldDeferAction(
  risk: ActionRisk,
  confidence: ConfidenceBand | undefined,
  probability: number | undefined,
  config?: ActionRiskConfig | null
): boolean {
  if (!isActionGated(risk)) return false;
  const floor = config?.actionConfidenceFloor ?? CONFIDENCE_HIGH_MIN;
  const midAsLow = config?.treatMidAsLowForActions === true;

  if (typeof probability === 'number' && Number.isFinite(probability)) {
    if (probability < floor) return true;
    // Mid band with treatMidAsLow: still defer even if above floor when in mid.
    if (midAsLow && confidence === 'mid') return true;
    return false;
  }

  const band = confidence ?? 'low';
  if (band === 'low') return true;
  // Mid without calibrated probability: only defer when treatMidAsLowForActions.
  // (When probability is present, the floor check above already applied.)
  if (band === 'mid') return midAsLow;
  // high
  return false;
}

function mergeIntentMap(
  override?: ActionRiskIntentMap | null
): Required<Pick<ActionRiskIntentMap, 'exact' | 'prefixes'>> {
  return {
    exact: { ...DEFAULT_ACTION_RISK_INTENT_MAP.exact, ...(override?.exact ?? {}) },
    prefixes: [
      ...(override?.prefixes ?? []),
      ...DEFAULT_ACTION_RISK_INTENT_MAP.prefixes,
    ],
  };
}
