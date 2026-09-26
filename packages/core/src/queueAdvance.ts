import type {
  GuideAction,
  PackRuntime,
  RuntimeContextBase,
  SessionSlots,
  StepId,
} from './types.js';
import { evaluateFlowStatuses, nextAvailableSteps } from './flowStatus.js';
import { pickReply } from './replies.js';
import { clearStale } from './slots.js';
import { maybeCompleteParentSubgraph } from './subgraph.js';

function titleOf(pack: PackRuntime, stepId: StepId): string {
  return pack.steps.find((s) => s.id === stepId)?.title ?? stepId;
}

/** Direct incomplete (or stale) requires for a step. */
export function listMissingRequires(
  pack: PackRuntime,
  stepId: StepId,
  ctx: RuntimeContextBase,
  staleSteps: Iterable<StepId> = [],
  opts?: { assumeComplete?: Iterable<StepId> }
): StepId[] {
  const step = pack.steps.find((s) => s.id === stepId);
  if (!step) return [];
  const stale = new Set(staleSteps);
  const assumed = new Set(opts?.assumeComplete ?? []);
  return step.requires.filter((req) => {
    if (assumed.has(req)) return false;
    const complete = pack.isComplete[req]?.(ctx) ?? false;
    return !complete || stale.has(req);
  });
}

/** True if `maybeReq` appears in the requires closure of `target`. */
export function isRequiredFor(
  pack: PackRuntime,
  maybeReq: StepId,
  target: StepId
): boolean {
  const visited = new Set<StepId>();
  const stack = [...(pack.steps.find((s) => s.id === target)?.requires ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === maybeReq) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    const nested = pack.steps.find((s) => s.id === id)?.requires ?? [];
    for (const req of nested) stack.push(req);
  }
  return false;
}

export function formatBlockedQueueMessage(
  pack: PackRuntime,
  blockedStepId: StepId,
  missing: StepId[]
): string {
  const blocked = titleOf(pack, blockedStepId);
  if (missing.length === 0) {
    return `“${blocked}” is not available yet.`;
  }
  const labels = missing.map((id) => `“${titleOf(pack, id)}”`);
  if (labels.length === 1) {
    return (
      `“${blocked}” is blocked until you finish ${labels[0]}. ` +
      `Say that step name when you’re ready and I’ll continue the queue.`
    );
  }
  return (
    `“${blocked}” is blocked until you finish: ${labels.join(', ')}. ` +
    `Tell me which to do and I’ll continue the queue afterward.`
  );
}

export type QueueAdvanceResult = {
  session: SessionSlots;
  executeNext: GuideAction | null;
  messages: string[];
  choices?: Array<{ id: string; label: string }>;
};

/**
 * Inspect queue head: run it if available, otherwise explain missing requires
 * and keep the head so mid-queue injection can unblock it.
 */
export function planResumeQueue(
  pack: PackRuntime,
  session: SessionSlots,
  ctx: RuntimeContextBase,
  opts?: { announceContinue?: boolean; assumeComplete?: StepId[] }
): QueueAdvanceResult {
  const head = session.actionQueue[0];
  if (!head) {
    return { session, executeNext: null, messages: [] };
  }

  const missing = listMissingRequires(pack, head.stepId, ctx, session.stale, {
    assumeComplete: opts?.assumeComplete,
  });
  if (missing.length > 0) {
    return {
      session,
      executeNext: null,
      messages: [formatBlockedQueueMessage(pack, head.stepId, missing)],
    };
  }

  const messages =
    opts?.announceContinue === false
      ? []
      : [`Continuing with “${titleOf(pack, head.stepId)}”.`];
  return { session, executeNext: head, messages };
}

/**
 * After a host save: pop matching head (or remove completed mid-queue entry),
 * then resume the next available queued step or explain the DAG block.
 */
export function advanceAfterStepCompleted(
  pack: PackRuntime,
  session: SessionSlots,
  ctx: RuntimeContextBase,
  completedStepId: StepId
): QueueAdvanceResult {
  let next: SessionSlots = clearStale(session, completedStepId);
  const sub = maybeCompleteParentSubgraph(pack, next, completedStepId);
  next = sub.session;
  if (sub.completedParent) {
    // Parent exits subgraph; treat parent as completed for queue resume.
    next = clearStale(next, sub.completedParent);
  }
  const head = next.actionQueue[0];

  if (head?.stepId === completedStepId) {
    next = { ...next, actionQueue: next.actionQueue.slice(1) };
  } else if (next.actionQueue.some((a) => a.stepId === completedStepId)) {
    next = {
      ...next,
      actionQueue: next.actionQueue.filter((a) => a.stepId !== completedStepId),
    };
  }

  const assumeComplete = [completedStepId];
  if (sub.completedParent) assumeComplete.push(sub.completedParent);

  const resumed = planResumeQueue(pack, next, ctx, {
    // Host just asserted completion — binders/getContext often lag one tick.
    assumeComplete,
  });
  if (resumed.executeNext || resumed.messages.length > 0) {
    return resumed;
  }

  // Proactive offer: next incomplete available step (dialogue, not auto-nav).
  const statuses = evaluateFlowStatuses(pack, ctx, next.stale);
  const offer = nextAvailableSteps(statuses).find((s) => s.id !== completedStepId);
  if (!offer) {
    return resumed;
  }

  let offered: SessionSlots = {
    ...next,
    pending: { kind: 'proactive' as const, stepId: offer.id },
    discourse: {
      ...(next.discourse ?? {}),
      lastStepId: completedStepId,
      lastChoiceIds: [offer.id, '__no__'],
    },
  };
  const picked = pickReply(offered, pack.replies, 'proactive', {
    title: offer.title,
    done: titleOf(pack, completedStepId),
    stepId: offer.id,
  });
  offered = { ...picked.session, pending: offered.pending };

  return {
    session: offered,
    executeNext: null,
    messages: [picked.text],
    choices: [
      { id: offer.id, label: `Yes — ${offer.title}` },
      { id: '__no__', label: 'Not now' },
    ],
  };
}

export type InjectResult = {
  session: SessionSlots;
  /** True when `inject` was placed ahead of a deferred queued step. */
  injected: boolean;
  message: string | null;
};

/**
 * If `inject` unblocks a queued step, place it before the first such target
 * (and move it forward if it was already later in the queue).
 */
export function injectBeforeDeferred(
  pack: PackRuntime,
  session: SessionSlots,
  ctx: RuntimeContextBase,
  inject: GuideAction
): InjectResult {
  const queue = session.actionQueue;
  if (queue.length === 0) {
    return { session, injected: false, message: null };
  }

  let targetIndex = -1;
  for (let i = 0; i < queue.length; i += 1) {
    const targetId = queue[i]!.stepId;
    if (targetId === inject.stepId) continue;
    const missing = listMissingRequires(pack, targetId, ctx, session.stale);
    if (missing.includes(inject.stepId) || isRequiredFor(pack, inject.stepId, targetId)) {
      targetIndex = i;
      break;
    }
  }

  if (targetIndex < 0) {
    return { session, injected: false, message: null };
  }

  const target = queue[targetIndex]!;
  const without = queue.filter((a) => a.stepId !== inject.stepId);
  const insertAt = without.findIndex((a) => a.stepId === target.stepId);
  const at = insertAt < 0 ? 0 : insertAt;
  const nextQueue = [...without.slice(0, at), inject, ...without.slice(at)];

  return {
    session: { ...session, actionQueue: nextQueue },
    injected: true,
    message:
      `I’ll do “${titleOf(pack, inject.stepId)}” next so we can reach ` +
      `“${titleOf(pack, target.stepId)}”.`,
  };
}
