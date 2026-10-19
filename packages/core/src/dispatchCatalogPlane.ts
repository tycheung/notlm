/**
 * ADR-011: early capability-catalog hits must honor plane masks and not steal
 * conceptual how-tos into mutation opens.
 */
import type { MutationDef } from './capabilityCatalog.js';
import type { DispatchDeps } from './dispatchDeps.js';
import {
  isRoutingTreeEnabled,
  resolveDispatchPlane,
  type DispatchPlaneContext,
} from './dispatchPlane.js';
import { askModeInstructCopy } from './interactionMode.js';
import { DEFAULT_HEURISTICS } from './heuristics.js';
import { laneAllowed } from './routingTree.js';
import { isConceptualQuestion } from './utteranceIntent.js';

export type EarlyCatalogPlaneGate = {
  mutationHit: MutationDef | undefined;
  tourWork: boolean;
  searchWork: boolean;
  /** When set, caller should pushAssistant and return true (handled). */
  instructCopy: string | null;
};

export function gateEarlyCatalogByPlane(input: {
  deps: DispatchDeps;
  trimmed: string;
  mutationHit: MutationDef | undefined;
  tourWork: boolean;
  searchWork: boolean;
  forcedMutationId?: string | null;
  forcedTourId?: string | null;
  forcedSearchId?: string | null;
}): EarlyCatalogPlaneGate {
  let { mutationHit, tourWork, searchWork } = input;
  const { deps, trimmed } = input;
  const treeOn = isRoutingTreeEnabled(deps.features, deps.pack);
  const planeCtx: DispatchPlaneContext | null = treeOn
    ? resolveDispatchPlane({
        session: deps.session,
        features: deps.features,
        pack: deps.pack,
        text: trimmed,
      })
    : null;
  const heuristics = deps.pack.compiledHeuristics ?? DEFAULT_HEURISTICS;
  if (
    mutationHit &&
    !input.forcedMutationId &&
    isConceptualQuestion(trimmed, deps.pack.faqDomainTokens, heuristics)
  ) {
    mutationHit = undefined;
  }
  if (mutationHit && planeCtx?.treeEnabled) {
    const mutLane =
      mutationHit.risk === 'high' ? 'mutation_high_risk' : 'mutation';
    if (
      planeCtx.blockMutate ||
      !laneAllowed(planeCtx.plane, mutLane, deps.pack.routingTree)
    ) {
      if (!input.forcedMutationId) {
        const copy = askModeInstructCopy(planeCtx.mode);
        if (copy) {
          return {
            mutationHit: undefined,
            tourWork,
            searchWork,
            instructCopy: copy,
          };
        }
        mutationHit = undefined;
      }
    }
  }
  if (tourWork && planeCtx?.treeEnabled && !input.forcedTourId) {
    if (
      planeCtx.blockNav ||
      !laneAllowed(planeCtx.plane, 'tour', deps.pack.routingTree)
    ) {
      tourWork = false;
    }
  }
  if (searchWork && planeCtx?.treeEnabled && !input.forcedSearchId) {
    if (
      planeCtx.blockNav ||
      !laneAllowed(planeCtx.plane, 'search', deps.pack.routingTree)
    ) {
      searchWork = false;
    }
  }
  return { mutationHit, tourWork, searchWork, instructCopy: null };
}
