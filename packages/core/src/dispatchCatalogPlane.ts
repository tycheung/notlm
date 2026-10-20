/**
 * ADR-011: early capability-catalog hits must honor plane masks and not steal
 * conceptual how-tos into mutation opens.
 *
 * Matched mutations/tours silently elevate the plane for the turn — never
 * preach Ask/Guide/Do switch copy to the user.
 */
import type { MutationDef } from './capabilityCatalog.js';
import type { DispatchDeps } from './dispatchDeps.js';
import {
  isRoutingTreeEnabled,
  resolveDispatchPlane,
  type DispatchPlaneContext,
} from './dispatchPlane.js';
import { DEFAULT_HEURISTICS } from './heuristics.js';
import { laneAllowed } from './routingTree.js';
import { isConceptualQuestion } from './utteranceIntent.js';

export type EarlyCatalogPlaneGate = {
  mutationHit: MutationDef | undefined;
  tourWork: boolean;
  searchWork: boolean;
  /** @deprecated Always null — planes elevate silently. */
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
  let planeCtx: DispatchPlaneContext | null = treeOn
    ? resolveDispatchPlane({
        session: deps.session,
        features: deps.features,
        pack: deps.pack,
        text: trimmed,
        parsed: mutationHit
          ? {
              stepId: null,
              slotPatches: {},
              isCorrection: false,
              goBack: false,
              rawIntent: 'mutation',
              mutationId: mutationHit.id,
            }
          : undefined,
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
    // Silent elevate already applied via parsed.mutationId; keep hit.
    if (
      !laneAllowed(planeCtx.plane, mutLane, deps.pack.routingTree) &&
      !input.forcedMutationId
    ) {
      // Re-resolve at do if mask still rejects (custom pack masks).
      planeCtx = resolveDispatchPlane({
        session: deps.session,
        features: deps.features,
        pack: deps.pack,
        text: trimmed,
        parsed: {
          stepId: null,
          slotPatches: {},
          isCorrection: false,
          goBack: false,
          rawIntent: 'mutation',
          mutationId: mutationHit.id,
          plane: 'do',
          planeProbability: 1,
        },
      });
    }
    void planeCtx;
  }
  if (tourWork && planeCtx?.treeEnabled && !input.forcedTourId) {
    if (
      planeCtx.blockNav ||
      !laneAllowed(planeCtx.plane, 'tour', deps.pack.routingTree)
    ) {
      // Elevate for tour: re-check with guide head.
      const elevated = resolveDispatchPlane({
        session: deps.session,
        features: deps.features,
        pack: deps.pack,
        text: trimmed,
        parsed: {
          stepId: null,
          slotPatches: {},
          isCorrection: false,
          goBack: false,
          rawIntent: 'tour',
          tourId: 'tour',
        },
      });
      if (
        elevated.blockNav ||
        !laneAllowed(elevated.plane, 'tour', deps.pack.routingTree)
      ) {
        tourWork = false;
      }
    }
  }
  if (searchWork && planeCtx?.treeEnabled && !input.forcedSearchId) {
    if (
      planeCtx.blockNav ||
      !laneAllowed(planeCtx.plane, 'search', deps.pack.routingTree)
    ) {
      const elevated = resolveDispatchPlane({
        session: deps.session,
        features: deps.features,
        pack: deps.pack,
        text: trimmed,
        parsed: {
          stepId: null,
          slotPatches: {},
          isCorrection: false,
          goBack: false,
          rawIntent: 'search',
          searchId: 'search',
        },
      });
      if (
        elevated.blockNav ||
        !laneAllowed(elevated.plane, 'search', deps.pack.routingTree)
      ) {
        searchWork = false;
      }
    }
  }
  return { mutationHit, tourWork, searchWork, instructCopy: null };
}
