import type { GuideAction, SessionSlots, SlotBag, StepId } from './types.js';

export function emptySession(): SessionSlots {
  return {
    byStep: {},
    history: [],
    activeStep: null,
    stale: [],
    actionQueue: [],
    flags: {},
  };
}

export function patchStepSlots(
  session: SessionSlots,
  stepId: StepId,
  patches: SlotBag,
  opts?: { isCorrection?: boolean; staleDependents?: StepId[] }
): SessionSlots {
  const prev = session.byStep[stepId] || {};
  const byStep = { ...session.byStep, [stepId]: { ...prev, ...patches } };
  let stale = session.stale;
  if (opts?.isCorrection && opts.staleDependents?.length) {
    stale = [...new Set([...stale, ...opts.staleDependents])];
  }
  return { ...session, byStep, stale };
}

export function setActionQueue(session: SessionSlots, queue: GuideAction[]): SessionSlots {
  return { ...session, actionQueue: queue };
}

export function completeQueueHead(session: SessionSlots): SessionSlots {
  if (session.actionQueue.length === 0) return session;
  return { ...session, actionQueue: session.actionQueue.slice(1) };
}

/** Pop the head only when it matches `stepId` (avoids dropping deferred work). */
export function completeQueueHeadIfMatch(
  session: SessionSlots,
  stepId: StepId
): SessionSlots {
  const head = session.actionQueue[0];
  if (!head || head.stepId !== stepId) return session;
  return completeQueueHead(session);
}

export function clearStale(session: SessionSlots, stepId: StepId): SessionSlots {
  return { ...session, stale: session.stale.filter((id) => id !== stepId) };
}

export function goBackToStep(session: SessionSlots, stepId: StepId, staleDependents: StepId[]): SessionSlots {
  const history = session.history.includes(stepId)
    ? session.history.slice(0, session.history.indexOf(stepId) + 1)
    : [...session.history, stepId];
  return {
    ...session,
    activeStep: stepId,
    history,
    stale: [...new Set([...session.stale, ...staleDependents])],
  };
}
