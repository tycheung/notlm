/**
 * Hierarchical routing tree (ADR-011): plane → lane → leaf config + masks.
 * Generic; no host-brand strings.
 */

import type { CompiledHeuristics } from './heuristics.js';
import { anyReTest, DEFAULT_HEURISTICS } from './heuristics.js';
import type { InteractionMode } from './interactionMode.js';
import { isConceptualQuestion } from './utteranceIntent.js';

/** Stage0 NLU plane (same labels as chrome InteractionMode). */
export type InteractionPlane = InteractionMode;

/** Capability lanes (training taxonomy + runtime mask keys). */
export const CAPABILITY_LANES = [
  'faq',
  'goto',
  'query',
  'mutation',
  'mutation_high_risk',
  'context',
  'tour',
  'search',
  'ood',
  'disambiguation',
  'compare',
  'handoff',
  'audit',
] as const;

export type CapabilityLane = (typeof CAPABILITY_LANES)[number];

export type RoutingTreeConfig = {
  /** When false, pack has tree file but host may still leave features.routingTree off. */
  enabled?: boolean;
  /** Soft bias from chrome when plane probability &lt; this (default 0.55). */
  planeSoftBiasBelow?: number;
  /** Override platform plane→lane mask. */
  laneMask?: Partial<Record<InteractionPlane, CapabilityLane[]>>;
  /**
   * Optional leaf model stems keyed by lane or autosplit child id (`goto__a`).
   * Values are pack file stems, e.g. `ranker.leaves.goto`.
   */
  leaves?: Record<string, string>;
  /** Max autosplit depth recorded for this pack (training). */
  autosplitMaxDepth?: number;
  /**
   * Doc/ops remap table (catalog → lane). Not read at runtime except
   * `remap.plane`, which is normalized into {@link laneMask} when mask absent.
   */
  remap?: {
    plane?: Partial<Record<InteractionPlane, string[]>>;
    catalog?: Record<string, string>;
  };
};

/**
 * Normalize pack JSON: promote `remap.plane` → `laneMask` when mask missing.
 * Keeps packs that only documented masks under remap.plane working.
 */
export function normalizeRoutingTree(
  raw: RoutingTreeConfig | null | undefined
): RoutingTreeConfig | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const out: RoutingTreeConfig = { ...raw };
  if (!out.laneMask || Object.keys(out.laneMask).length === 0) {
    const plane = raw.remap?.plane;
    if (plane && typeof plane === 'object') {
      const mask: Partial<Record<InteractionPlane, CapabilityLane[]>> = {};
      for (const p of ['ask', 'guide', 'do'] as const) {
        const list = plane[p];
        if (!Array.isArray(list) || !list.length) continue;
        mask[p] = list.filter(isCapabilityLane);
      }
      if (Object.keys(mask).length) out.laneMask = mask;
    }
  }
  return out;
}

export const DEFAULT_PLANE_SOFT_BIAS_BELOW = 0.55;

/** Platform default: ask = answer-ish; guide adds nav; do adds mutate. */
export const DEFAULT_LANE_MASK: Record<InteractionPlane, readonly CapabilityLane[]> = {
  ask: [
    'faq',
    'query',
    'context',
    'compare',
    'handoff',
    'audit',
    'ood',
    'disambiguation',
  ],
  guide: [
    'faq',
    'query',
    'context',
    'compare',
    'handoff',
    'audit',
    'ood',
    'disambiguation',
    'goto',
    'tour',
    'search',
  ],
  do: [...CAPABILITY_LANES],
};

export function isCapabilityLane(value: unknown): value is CapabilityLane {
  return (
    typeof value === 'string' &&
    (CAPABILITY_LANES as readonly string[]).includes(value)
  );
}

export function laneMaskForPlane(
  plane: InteractionPlane,
  tree?: RoutingTreeConfig | null
): ReadonlySet<CapabilityLane> {
  const overlay = tree?.laneMask?.[plane];
  const list =
    overlay && overlay.length > 0 ? overlay : DEFAULT_LANE_MASK[plane];
  return new Set(list.filter(isCapabilityLane));
}

export function laneAllowed(
  plane: InteractionPlane,
  lane: CapabilityLane,
  tree?: RoutingTreeConfig | null
): boolean {
  return laneMaskForPlane(plane, tree).has(lane);
}

export type PlaneInferResult = {
  plane: InteractionPlane;
  probability: number;
  source: 'heuristic' | 'ranker' | 'chrome_bias';
};

/**
 * Stage0 heuristic when no plane ranker (or as fallback).
 * Prefers ask for conceptual; guide for nav; do for mutate verbs.
 */
export function inferPlaneHeuristic(
  text: string,
  opts?: {
    faqDomainTokens?: readonly string[] | null;
    heuristics?: CompiledHeuristics | null;
  }
): PlaneInferResult {
  const h = opts?.heuristics ?? DEFAULT_HEURISTICS;
  const t = text.trim();
  if (!t) {
    return { plane: 'ask', probability: 0.4, source: 'heuristic' };
  }
  if (
    (h.oodTopicRe && h.oodTopicRe.test(t)) ||
    anyReTest(h.oodPhraseRes, t) ||
    anyReTest(h.oodQuestionFrames, t)
  ) {
    return { plane: 'ask', probability: 0.9, source: 'heuristic' };
  }
  // Mutate-shaped commands
  if (
    /\b(create|delete|remove|apply|assign|save|regenerate|generate|lock|unlock|confirm)\b/i.test(
      t
    ) &&
    !/\b(how|what|why|when|where|explain|difference|vs\.?)\b/i.test(t)
  ) {
    return { plane: 'do', probability: 0.75, source: 'heuristic' };
  }
  // Navigate / open
  if (
    (h.navCommand && h.navCommand.test(t)) ||
    /\b(open|take me|go to|show me|navigate|jump to|bring up)\b/i.test(t)
  ) {
    if (isConceptualQuestion(t, opts?.faqDomainTokens, h)) {
      return { plane: 'ask', probability: 0.7, source: 'heuristic' };
    }
    return { plane: 'guide', probability: 0.72, source: 'heuristic' };
  }
  if (isConceptualQuestion(t, opts?.faqDomainTokens, h)) {
    return { plane: 'ask', probability: 0.8, source: 'heuristic' };
  }
  // Tours / walkthrough → guide
  if (/\b(tour|walk me|walkthrough|onboarding|show me around)\b/i.test(t)) {
    return { plane: 'guide', probability: 0.7, source: 'heuristic' };
  }
  return { plane: 'ask', probability: 0.55, source: 'heuristic' };
}

/**
 * Confident plane wins over chrome. Low confidence → soft bias toward chrome
 * when provided; else keep inferred plane.
 */
export function resolveEffectivePlane(
  inferred: PlaneInferResult,
  chrome?: InteractionMode | null,
  tree?: RoutingTreeConfig | null
): {
  plane: InteractionPlane;
  usedChromeBias: boolean;
  inferred: PlaneInferResult;
} {
  const floor = tree?.planeSoftBiasBelow ?? DEFAULT_PLANE_SOFT_BIAS_BELOW;
  if (inferred.probability >= floor) {
    return { plane: inferred.plane, usedChromeBias: false, inferred };
  }
  if (chrome === 'ask' || chrome === 'guide' || chrome === 'do') {
    return {
      plane: chrome,
      usedChromeBias: true,
      inferred: { ...inferred, source: 'chrome_bias' },
    };
  }
  return { plane: inferred.plane, usedChromeBias: false, inferred };
}

/** Map parse/catalog outcome → capability lane for mask checks. */
export function laneFromRawIntent(
  rawIntent: string | null | undefined,
  opts?: {
    faqId?: string | null;
    queryId?: string | null;
    mutationId?: string | null;
    /** From pack `mutations[].risk` when known. */
    mutationRisk?: 'low' | 'high' | string | null;
  }
): CapabilityLane | null {
  if (opts?.faqId) return 'faq';
  if (opts?.queryId) return 'query';
  if (opts?.mutationId) {
    // Prefer pack catalog risk; id heuristics are generic (no host brand).
    if (opts.mutationRisk === 'high') return 'mutation_high_risk';
    if (/delete|high_risk|_high\b/i.test(opts.mutationId)) {
      return 'mutation_high_risk';
    }
    return 'mutation';
  }
  const r = (rawIntent || '').toLowerCase();
  if (!r || r === 'unknown' || r === 'ambiguous') return 'disambiguation';
  if (r === 'ood' || r === 'refuse') return 'ood';
  if (r === 'faq' || r === 'conceptual_question') return 'faq';
  if (r === 'data_query' || r.startsWith('query')) return 'query';
  if (r === 'mutation' || r.startsWith('mutate')) return 'mutation';
  if (r === 'tour') return 'tour';
  if (r === 'search') return 'search';
  if (r.startsWith('goto:') || r.startsWith('open:') || r.startsWith('nav:')) {
    return 'goto';
  }
  if (
    r === 'whats_next' ||
    r === 'help' ||
    r === 'explain_field' ||
    r === 'go_back'
  ) {
    return 'context';
  }
  if (r === 'lookup_participant') return 'search';
  return null;
}
