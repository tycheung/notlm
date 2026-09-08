import { dependentStepIds } from './flowGraph';
import type { GuideAction } from './packUtterance';
import type { DateRangeYmd } from './dateSlots';
import type { GuideSlotBag, GuideStepId } from './types';
import type { ParticipantMatch } from './participantResolve';

export type PendingParticipantResolve = {
  query: string;
  candidates: ParticipantMatch[];
  dataPointKey: string | null;
};

export type PendingFormatMatch = {
  query: string;
  candidates: { templateId: number; name: string; description?: string | null }[];
};

export type GuideSessionSlots = {
  byStep: Partial<Record<GuideStepId, GuideSlotBag>>;
  history: GuideStepId[];
  activeStep: GuideStepId | null;
  stale: GuideStepId[];
  skippedSideActions: boolean;
  reportsOpened: boolean;
  /** Durable multi-step queue from packed utterances. */
  actionQueue: GuideAction[];
  referenceDates: DateRangeYmd | null;
  lastResolvedParticipant: ParticipantMatch | null;
  pendingParticipantResolve: PendingParticipantResolve | null;
  pendingFormatMatch: PendingFormatMatch | null;
  /** Last field we flashed (for explain_field). */
  lastFlashedGuideId: string | null;
};

export function emptySessionSlots(): GuideSessionSlots {
  return {
    byStep: {},
    history: [],
    activeStep: null,
    stale: [],
    skippedSideActions: false,
    reportsOpened: false,
    actionQueue: [],
    referenceDates: null,
    lastResolvedParticipant: null,
    pendingParticipantResolve: null,
    pendingFormatMatch: null,
    lastFlashedGuideId: null,
  };
}

export function patchStepSlots(
  session: GuideSessionSlots,
  stepId: GuideStepId,
  patches: GuideSlotBag,
  opts?: { isCorrection?: boolean }
): GuideSessionSlots {
  const prev = session.byStep[stepId] || {};
  const nextByStep = {
    ...session.byStep,
    [stepId]: { ...prev, ...patches },
  };
  const history =
    session.history[session.history.length - 1] === stepId
      ? session.history
      : [...session.history, stepId];

  let stale = [...session.stale];
  if (opts?.isCorrection) {
    const deps = dependentStepIds(stepId);
    for (const d of deps) {
      if (!stale.includes(d)) stale.push(d);
    }
    stale = stale.filter((id) => id !== stepId);
  }

  return {
    ...session,
    byStep: nextByStep,
    history,
    activeStep: stepId,
    stale,
  };
}

export function goBackToStep(session: GuideSessionSlots, stepId: GuideStepId): GuideSessionSlots {
  const deps = dependentStepIds(stepId);
  const stale = [...new Set([...session.stale, ...deps])];
  return {
    ...session,
    activeStep: stepId,
    stale: stale.filter((id) => id !== stepId),
    history: [...session.history, stepId],
  };
}

export function markSideActionsSkipped(session: GuideSessionSlots): GuideSessionSlots {
  return { ...session, skippedSideActions: true };
}

export function markReportsOpened(session: GuideSessionSlots): GuideSessionSlots {
  return { ...session, reportsOpened: true };
}

export function clearStale(session: GuideSessionSlots, stepId: GuideStepId): GuideSessionSlots {
  return { ...session, stale: session.stale.filter((id) => id !== stepId) };
}

export function setActionQueue(
  session: GuideSessionSlots,
  queue: GuideAction[],
  referenceDates?: DateRangeYmd | null
): GuideSessionSlots {
  return {
    ...session,
    actionQueue: queue,
    referenceDates: referenceDates !== undefined ? referenceDates : session.referenceDates,
  };
}

/** Mark head action done if it matches stepId; return remaining queue. */
export function completeQueueHead(
  session: GuideSessionSlots,
  stepId: GuideStepId
): GuideSessionSlots {
  const q = session.actionQueue;
  if (!q.length) return session;
  if (q[0].stepId !== stepId) {
    // Still drop first matching occurrence
    const idx = q.findIndex((a) => a.stepId === stepId);
    if (idx < 0) return session;
    return { ...session, actionQueue: [...q.slice(0, idx), ...q.slice(idx + 1)] };
  }
  return { ...session, actionQueue: q.slice(1) };
}
