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
  if (lane) parsed.lane = lane;
  parsed.usedChromeBias = usedChromeBias;
  return parsed;
}

/**
 * When tree on: mask illegal lane outcomes (strip mutate/goto under ask, etc.).
 */
export function applyLaneMaskToParsed(
  parsed: ParseUtteranceResult,
  plane: InteractionPlane,
  pack: LoadedPack
): ParseUtteranceResult {
  const lane = parsed.lane;
  if (!lane || laneAllowed(plane, lane, pack.routingTree)) return parsed;
  // Demote disallowed action to clarify/unknown — do not launch.
  if (
    lane === 'goto' ||
    lane === 'mutation' ||
    lane === 'mutation_high_risk' ||
    lane === 'tour' ||
    lane === 'search'
  ) {
    return {
      ...parsed,
      stepId: null,
      candidates: undefined,
      candidateScores: undefined,
      mutationId: undefined,
      tourId: undefined,
      searchId: undefined,
      openSurface: undefined,
      rawIntent: 'unknown',
      lane: 'disambiguation' as CapabilityLane,
      confidence: 'low',
    };
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
