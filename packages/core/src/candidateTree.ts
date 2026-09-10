import { evaluateFlowStatuses } from './flowStatus.js';
import { pathMatchesStep } from './pageContext.js';
import type { PackRuntime, RuntimeContextBase, SessionSlots, StepId } from './types.js';

/**
 * Context-tree shortlist: available incomplete steps, preferring pathname hits.
 * Used to shrink the leaf classifier set and cut alias collisions.
 */
export function shortlistStepIds(
  pack: PackRuntime,
  ctx: RuntimeContextBase,
  stale: Iterable<StepId> = [],
  opts?: { preferPath?: boolean }
): StepId[] {
  const statuses = evaluateFlowStatuses(pack, ctx, stale);
  const available = statuses
    .filter((s) => s.available && !s.complete)
    .map((s) => s.id);
  if (opts?.preferPath === false) return available;
  const pathHits = available.filter((id) => pathMatchesStep(ctx.pathname, id));
  return pathHits.length > 0 ? pathHits : available;
}

/**
 * Narrow near-tied parse candidates with page + availability context.
 * Returns original candidates when context cannot reduce the set.
 */
export function filterCandidatesByContext(
  candidates: StepId[],
  pack: PackRuntime,
  ctx: RuntimeContextBase,
  session: SessionSlots
): StepId[] {
  if (candidates.length <= 1) return candidates;

  const pathHits = candidates.filter((id) => pathMatchesStep(ctx.pathname, id));
  const pool = pathHits.length > 0 ? pathHits : candidates;

  const statuses = evaluateFlowStatuses(pack, ctx, session.stale);
  const byId = new Map(statuses.map((s) => [s.id, s]));

  const availableIncomplete = pool.filter((id) => {
    const s = byId.get(id);
    return Boolean(s?.available && !s.complete);
  });
  if (availableIncomplete.length >= 1) return availableIncomplete;

  const available = pool.filter((id) => byId.get(id)?.available);
  if (available.length >= 1) return available;

  return pool;
}
