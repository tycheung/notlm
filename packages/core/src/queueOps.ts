import type { FlowStepDef, GuideAction, SessionSlots, SlotBag, StepId } from './types.js';

/** Merge slots into an existing queue entry (same stepId); no duplicate rows. */
export function mergeSlotsIntoAction(
  action: GuideAction,
  slots: SlotBag,
  rawSegment?: string
): GuideAction {
  return {
    ...action,
    slots: { ...action.slots, ...slots },
    rawSegment: rawSegment?.trim() ? rawSegment : action.rawSegment,
  };
}

/**
 * Head-stable enqueue: keep index 0 fixed; append new steps after the head
 * (at end of queue). If `action.stepId` already appears, merge slots in place.
 */
export function mergeActionIntoQueue(
  queue: GuideAction[],
  action: GuideAction
): { queue: GuideAction[]; mergedExisting: boolean; wasHead: boolean } {
  const idx = queue.findIndex((a) => a.stepId === action.stepId);
  if (idx >= 0) {
    const next = [...queue];
    next[idx] = mergeSlotsIntoAction(next[idx]!, action.slots, action.rawSegment);
    return { queue: next, mergedExisting: true, wasHead: idx === 0 };
  }
  if (queue.length === 0) {
    return { queue: [action], mergedExisting: false, wasHead: false };
  }
  // After head: append to tail so head stays stable.
  return { queue: [...queue, action], mergedExisting: false, wasHead: false };
}

export function clearActionQueue(session: SessionSlots): SessionSlots {
  const flags = { ...session.flags };
  delete flags.pendingMutation;
  return {
    ...session,
    actionQueue: [],
    pending: null,
    flags,
  };
}

export function skipQueueHead(session: SessionSlots): SessionSlots {
  if (session.actionQueue.length === 0) return session;
  return { ...session, actionQueue: session.actionQueue.slice(1), pending: null };
}

export function dropStepsFromQueue(
  session: SessionSlots,
  stepIds: Iterable<StepId>
): SessionSlots {
  const drop = new Set(stepIds);
  return {
    ...session,
    actionQueue: session.actionQueue.filter((a) => !drop.has(a.stepId)),
    pending: null,
  };
}

/** Move `stepId` to head (create entry if missing); merge slots. */
export function jumpStepToHead(
  session: SessionSlots,
  stepId: StepId,
  slots: SlotBag = {},
  rawSegment = stepId
): SessionSlots {
  const rest = session.actionQueue.filter((a) => a.stepId !== stepId);
  const prev = session.actionQueue.find((a) => a.stepId === stepId);
  const head: GuideAction = {
    stepId,
    slots: { ...(prev?.slots ?? {}), ...slots },
    rawSegment: rawSegment || prev?.rawSegment || stepId,
  };
  return {
    ...session,
    actionQueue: [head, ...rest],
    pending: null,
  };
}

/** Drop matching steps, then jump `jumpId` to head. */
export function cancelThenJump(
  session: SessionSlots,
  dropIds: StepId[],
  jumpId: StepId,
  slots: SlotBag = {},
  rawSegment?: string
): SessionSlots {
  const cleared = dropStepsFromQueue(session, dropIds);
  return jumpStepToHead(cleared, jumpId, slots, rawSegment ?? jumpId);
}

/** Patch slots on the queued row for `stepId` (and byStep via caller). */
export function patchQueuedStepSlots(
  session: SessionSlots,
  stepId: StepId,
  slots: SlotBag
): SessionSlots {
  const idx = session.actionQueue.findIndex((a) => a.stepId === stepId);
  if (idx < 0) return session;
  const next = [...session.actionQueue];
  next[idx] = mergeSlotsIntoAction(next[idx]!, slots);
  return { ...session, actionQueue: next };
}

/**
 * Expand each action with missing hard requires (in requires order), deduped.
 * Does not invent soft prefers.
 */
export function expandActionsWithPrereqs(
  steps: FlowStepDef[],
  actions: GuideAction[]
): GuideAction[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const out: GuideAction[] = [];
  const seen = new Set<StepId>();

  const addWithRequires = (action: GuideAction) => {
    const step = byId.get(action.stepId);
    for (const req of step?.requires ?? []) {
      if (seen.has(req)) continue;
      addWithRequires({ stepId: req, slots: {}, rawSegment: req });
    }
    if (seen.has(action.stepId)) {
      // Merge slots into existing row.
      const idx = out.findIndex((a) => a.stepId === action.stepId);
      if (idx >= 0) {
        out[idx] = mergeSlotsIntoAction(out[idx]!, action.slots, action.rawSegment);
      }
      return;
    }
    seen.add(action.stepId);
    out.push(action);
  };

  for (const action of actions) addWithRequires(action);
  return out;
}

export function describeQueue(
  queue: GuideAction[],
  titleOf: (id: StepId) => string
): string {
  if (queue.length === 0) return 'Queue is empty.';
  if (queue.length === 1) return `Up next: “${titleOf(queue[0]!.stepId)}”.`;
  return `Plan: ${queue.map((a) => `“${titleOf(a.stepId)}”`).join(' → ')}.`;
}
