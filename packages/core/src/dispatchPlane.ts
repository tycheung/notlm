/**
 * ADR-011: resolve Ask/Guide/Do for dispatch when routingTree is enabled.
 */

import {
  askModeInstructCopy,
  modeBlocksAutoNavigate,
  modeBlocksMutations,
  resolveInteractionMode,
  type InteractionMode,
} from './interactionMode.js';
import {
  inferPlaneHeuristic,
  laneAllowed,
  laneFromRawIntent,
  resolveEffectivePlane,
  type CapabilityLane,
  type InteractionPlane,
} from './routingTree.js';
import type { AssistantFeatures, LoadedPack, ParseUtteranceResult } from './types.js';

export type DispatchPlaneContext = {
  mode: InteractionMode;
  plane: InteractionPlane;
  usedChromeBias: boolean;
  blockNav: boolean;
  blockMutate: boolean;
  treeEnabled: boolean;
};

export function isRoutingTreeEnabled(
  features?: AssistantFeatures | null,
  pack?: LoadedPack | null
): boolean {
  if (features?.routingTree === true) return true;
  if (features?.routingTree === false) return false;
  return Boolean(pack?.routingTree?.enabled);
}

/** Session flag: last plane/lane/leaf for miss + conversation logging. */
export const LAST_TREE_ROUTING_FLAG = 'lastTreeRouting';

export type TreeRoutingLog = {
  plane?: InteractionPlane;
  lane?: CapabilityLane;
  leaf?: string;
};

export function treeRoutingFromParsed(
  parsed: ParseUtteranceResult | null | undefined
): TreeRoutingLog {
  const out: TreeRoutingLog = {};
  if (parsed?.plane) out.plane = parsed.plane;
  if (parsed?.lane) out.lane = parsed.lane;
  if (parsed?.leaf) out.leaf = parsed.leaf;
  else if (parsed?.lane) out.leaf = parsed.lane;
  return out;
}

export function rememberTreeRouting<T extends { flags?: Record<string, unknown> }>(
  setSession: (updater: (session: T) => T) => void,
  routing: TreeRoutingLog
): void {
  if (!routing.plane && !routing.lane && !routing.leaf) return;
  setSession((s) => ({
    ...s,
    flags: { ...(s.flags ?? {}), [LAST_TREE_ROUTING_FLAG]: routing },
  }));
}

export function treeRoutingFromSession(
  session: { flags?: Record<string, unknown> } | null | undefined
): TreeRoutingLog | null {
  const raw = session?.flags?.[LAST_TREE_ROUTING_FLAG];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: TreeRoutingLog = {};
  if (o.plane === 'ask' || o.plane === 'guide' || o.plane === 'do') {
    out.plane = o.plane;
  }
  if (typeof o.lane === 'string' && o.lane) out.lane = o.lane as CapabilityLane;
  if (typeof o.leaf === 'string' && o.leaf) out.leaf = o.leaf;
  return out.plane || out.lane || out.leaf ? out : null;
}

/** Attach plane/lane onto a parse result (mutates + returns). */
export function annotateParseWithTree(
  parsed: ParseUtteranceResult,
  text: string,
  pack: LoadedPack,
  chrome: InteractionMode
): ParseUtteranceResult {
  const inferred =
    parsed.plane && parsed.planeProbability != null
      ? {
          plane: parsed.plane,
          probability: parsed.planeProbability,
          source: 'ranker' as const,
        }
      : inferPlaneHeuristic(text, {
          faqDomainTokens: pack.faqDomainTokens,
          heuristics: pack.compiledHeuristics,
        });
  const { plane, usedChromeBias } = resolveEffectivePlane(
    inferred,
    chrome,
    pack.routingTree
  );
  const mutationRisk =
    parsed.mutationId && Array.isArray(pack.mutations)
      ? pack.mutations.find((m) => m.id === parsed.mutationId)?.risk
      : undefined;
  const lane =
    parsed.lane ??
    laneFromRawIntent(parsed.rawIntent, {
      faqId: parsed.faqId,
      queryId: parsed.queryId,
      mutationId: parsed.mutationId,
      mutationRisk,
    }) ??
    (parsed.tourId ? 'tour' : parsed.searchId ? 'search' : null);
  parsed.plane = plane;
  parsed.planeProbability = inferred.probability;
  if (lane) {
    parsed.lane = lane;
    if (!parsed.leaf) parsed.leaf = lane;
  }
  parsed.usedChromeBias = usedChromeBias;
  return parsed;
}

function scrubActionHeads(parsed: ParseUtteranceResult): ParseUtteranceResult {
  return {
    ...parsed,
    stepId: null,
    candidates: undefined,
    candidateScores: undefined,
    mutationId: undefined,
    tourId: undefined,
    searchId: undefined,
    openSurface: undefined,
    rawIntent:
      parsed.faqId || parsed.queryId ? parsed.rawIntent : 'unknown',
    lane: (parsed.faqId
      ? 'faq'
      : parsed.queryId
        ? 'query'
        : 'disambiguation') as CapabilityLane,
    confidence: parsed.faqId || parsed.queryId ? parsed.confidence : 'low',
  };
}

/**
 * When tree on: mask illegal lane outcomes (strip mutate/goto under ask, etc.).
 * Also scrub action heads when the annotated lane is ask-safe but co-attached
 * goto/mutation/tour/search ids remain (lane/model disagreement).
 */
export function applyLaneMaskToParsed(
  parsed: ParseUtteranceResult,
  plane: InteractionPlane,
  pack: LoadedPack
): ParseUtteranceResult {
  const tree = pack.routingTree;
  const gotoOk = laneAllowed(plane, 'goto', tree);
  const mutOk =
    laneAllowed(plane, 'mutation', tree) ||
    laneAllowed(plane, 'mutation_high_risk', tree);
  const tourOk = laneAllowed(plane, 'tour', tree);
  const searchOk = laneAllowed(plane, 'search', tree);
  const hasIllegalHeads =
    (Boolean(parsed.stepId) && !gotoOk) ||
    (Boolean(parsed.mutationId) && !mutOk) ||
    (Boolean(parsed.tourId) && !tourOk) ||
    (Boolean(parsed.searchId) && !searchOk);
  if (hasIllegalHeads) return scrubActionHeads(parsed);

  const lane = parsed.lane;
  if (!lane || laneAllowed(plane, lane, tree)) return parsed;
  if (
    lane === 'goto' ||
    lane === 'mutation' ||
    lane === 'mutation_high_risk' ||
    lane === 'tour' ||
    lane === 'search'
  ) {
    return scrubActionHeads(parsed);
  }
  return parsed;
}

export function resolveDispatchPlane(input: {
  session: { flags?: Record<string, unknown> } | null | undefined;
  features?: AssistantFeatures | null;
  pack: LoadedPack;
  text: string;
  parsed?: ParseUtteranceResult | null;
}): DispatchPlaneContext {
  const chrome = resolveInteractionMode(input.session, input.features);
  const treeEnabled = isRoutingTreeEnabled(input.features, input.pack);
  if (!treeEnabled) {
    return {
      mode: chrome,
      plane: chrome,
      usedChromeBias: false,
      blockNav: modeBlocksAutoNavigate(chrome),
      blockMutate: modeBlocksMutations(chrome),
      treeEnabled: false,
    };
  }
  let parsed = input.parsed ?? {
    stepId: null,
    slotPatches: {},
    isCorrection: false,
    goBack: false,
    rawIntent: null,
  };
  parsed = annotateParseWithTree(parsed, input.text, input.pack, chrome);
  const plane = parsed.plane ?? 'ask';
  return {
    mode: plane,
    plane,
    usedChromeBias: Boolean(parsed.usedChromeBias),
    blockNav: modeBlocksAutoNavigate(plane),
    blockMutate: modeBlocksMutations(plane),
    treeEnabled: true,
  };
}

export { askModeInstructCopy };
