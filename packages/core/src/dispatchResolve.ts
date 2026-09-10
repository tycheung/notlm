import { pickReply } from './replies.js';
import { evaluateFlowStatuses, nextAvailableSteps } from './flowStatus.js';
import { filterCandidatesByContext } from './candidateTree.js';
import { pathMatchesStep } from './pageContext.js';
import type { LoadedPack, SessionSlots, StepId, StepStatus } from './types.js';

export const MAX_SUGGESTED_NEXT = 4;

export function stepTitle(pack: LoadedPack, stepId: StepId): string {
  return pack.steps.find((s) => s.id === stepId)?.title ?? stepId;
}

export function stepChoices(pack: LoadedPack, stepIds: StepId[]) {
  return stepIds.map((id) => ({ id, label: stepTitle(pack, id) }));
}

export function resolveGoBackStep(session: SessionSlots): StepId | null {
  const hist = session.history;
  if (session.activeStep && hist.length >= 2) {
    const idx = hist.lastIndexOf(session.activeStep);
    if (idx > 0) return hist[idx - 1] ?? null;
  }
  return hist.length >= 2 ? (hist[hist.length - 2] ?? null) : null;
}

/** Prefer pathname, then a single available incomplete step among near-ties. */
export function resolveKeywordCollision(
  candidates: StepId[],
  pack: LoadedPack,
  ctx: { pathname: string; data: Record<string, unknown> },
  session: SessionSlots
): StepId | null {
  if (candidates.length <= 1) return candidates[0] ?? null;

  const narrowed = filterCandidatesByContext(candidates, pack, ctx, session);
  if (narrowed.length === 1) return narrowed[0] ?? null;

  const pathHits = narrowed.filter((id) => pathMatchesStep(ctx.pathname, id));
  if (pathHits.length === 1) return pathHits[0] ?? null;

  const statuses = evaluateFlowStatuses(pack, ctx, session.stale);
  const byId = new Map(statuses.map((s) => [s.id, s]));

  const availableIncomplete = narrowed.filter((id) => {
    const s = byId.get(id);
    return Boolean(s?.available && !s.complete);
  });
  if (availableIncomplete.length === 1) return availableIncomplete[0] ?? null;

  const available = narrowed.filter((id) => byId.get(id)?.available);
  if (available.length === 1) return available[0] ?? null;

  return null;
}

export function disambiguationPrompt(
  pack: LoadedPack,
  session: SessionSlots,
  candidates: StepId[]
): { text: string; session: SessionSlots } {
  const labels = candidates.map((id) => `“${stepTitle(pack, id)}”`);
  const message =
    labels.length === 2
      ? `That could mean ${labels[0]} or ${labels[1]}. Which one did you mean?`
      : `That could mean several things. Which one: ${labels.join(', ')}?`;
  return pickReply(session, pack.replies, 'repair.ambiguous', { message });
}

/** Next incomplete available steps, path-relevant first, capped for chat. */
export function suggestNextStepOptions(
  pack: LoadedPack,
  ctx: { pathname: string; data: Record<string, unknown> },
  session: SessionSlots
): StepStatus[] {
  const statuses = evaluateFlowStatuses(pack, ctx, session.stale);
  const next = nextAvailableSteps(statuses);
  return [...next]
    .sort((a, b) => {
      const ap = pathMatchesStep(ctx.pathname, a.id) ? 0 : 1;
      const bp = pathMatchesStep(ctx.pathname, b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return 0;
    })
    .slice(0, MAX_SUGGESTED_NEXT);
}

export function unintelligiblePrompt(
  pack: LoadedPack,
  options: StepStatus[],
  session: SessionSlots
): { text: string; session: SessionSlots } {
  let message: string;
  if (session.actionQueue.length > 0) {
    const head = session.actionQueue[0]!;
    message =
      `I didn’t catch that. You still have “${stepTitle(pack, head.stepId)}” queued — ` +
      `say “what’s next” to resume, or name a checklist step.`;
  } else if (options.length === 0) {
    message =
      `I didn’t catch that — and you’re caught up on the checklist. ` +
      `Try naming a step if you want to revisit one.`;
  } else if (options.length === 1) {
    message =
      `I didn’t catch that. From where you are, next up looks like “${options[0]!.title}” — ` +
      `say that name if you want to go there.`;
  } else {
    const labels = options.map((s) => `“${s.title}”`);
    message = `I didn’t catch that. From where you are, next up could be: ${labels.join(', ')}. Which one?`;
  }
  return pickReply(session, pack.replies, 'repair.unknown', { message });
}

export function lowConfidencePrompt(
  pack: LoadedPack,
  session: SessionSlots,
  stepId: StepId
): { text: string; session: SessionSlots } {
  const title = stepTitle(pack, stepId);
  const message = `Just to check — did you mean “${title}”? Say yes to continue.`;
  return pickReply(session, pack.replies, 'repair.low_confidence', {
    message,
    title,
    stepId,
  });
}
