import { emitCoachEvent } from './coachEvents.js';
import { dependentStepIds } from './flowGraph.js';
import { gateBeforeLaunch } from './dispatchTalk.js';
import type { DispatchDeps } from './dispatchDeps.js';
import {
  formatBlockedQueueMessage,
  injectBeforeDeferred,
  listMissingRequires,
} from './queueAdvance.js';
import { patchQueuedStepSlots } from './queueOps.js';
import { pickReply } from './replies.js';
import { goBackToStep, patchStepSlots, setActionQueue } from './slots.js';
import { stepTitle } from './dispatchResolve.js';
import type { GuideAction, StepId } from './types.js';

export function launchStep(
  deps: DispatchDeps,
  targetStep: StepId,
  slots: Record<string, unknown>,
  isCorrection: boolean,
  opts?: { skipGate?: boolean }
): void {
  const { pack, session, ctx, pushAssistant, executeStep, setSession } = deps;
  const sink = { pushAssistant, setSession };

  if (!isCorrection) {
    const missing = listMissingRequires(pack, targetStep, ctx, session.stale);
    if (missing.length > 0) {
      const message = formatBlockedQueueMessage(pack, targetStep, missing);
      const picked = pickReply(session, pack.replies, 'repair.blocked', { message });
      setSession(() => picked.session);
      pushAssistant(picked.text);
      emitCoachEvent(deps, { type: 'blocked', stepId: targetStep, missing });
      emitCoachEvent(deps, { type: 'repair', kind: 'blocked' });
      return;
    }
  }

  if (
    !isCorrection &&
    !opts?.skipGate &&
    gateBeforeLaunch(pack, session, targetStep, slots, sink)
  ) {
    const pending = deps.session.pending;
    if (pending?.kind === 'ask_slot') {
      emitCoachEvent(deps, {
        type: 'slot_ask',
        stepId: targetStep,
        slotKey: pending.slotKey,
      });
    } else if (pending?.kind === 'confirm') {
      emitCoachEvent(deps, { type: 'confirm_ask', stepId: targetStep });
    }
    return;
  }

  const action: GuideAction = {
    stepId: targetStep,
    slots,
    rawSegment: targetStep,
  };

  if (!isCorrection && session.actionQueue.length > 0) {
    const injected = injectBeforeDeferred(pack, session, ctx, action);
    if (injected.injected) {
      let next = injected.session;
      if (Object.keys(slots).length > 0) {
        next = patchStepSlots(next, targetStep, slots);
      }
      next = {
        ...next,
        discourse: { ...(next.discourse ?? {}), lastStepId: targetStep },
      };
      setSession(() => next);
      if (injected.message) pushAssistant(injected.message);
      emitCoachEvent(deps, { type: 'launch', stepId: targetStep, gated: false });
      executeStep(targetStep, { prefill: slots, skipCoach: true });
      return;
    }
  }

  const staleDependents = isCorrection
    ? dependentStepIds(pack.steps, targetStep)
    : [];
  let next = session;
  if (Object.keys(slots).length > 0) {
    next = patchStepSlots(next, targetStep, slots, {
      isCorrection,
      staleDependents,
    });
  }
  if (isCorrection) {
    next = goBackToStep(next, targetStep, staleDependents);
  }
  next = {
    ...next,
    pending: null,
    discourse: { ...(next.discourse ?? {}), lastStepId: targetStep },
  };
  if (next.actionQueue.length === 0) {
    next = setActionQueue(next, [
      { stepId: targetStep, slots, rawSegment: targetStep },
    ]);
  } else if (next.actionQueue[0]?.stepId === targetStep) {
    next = patchQueuedStepSlots(next, targetStep, slots);
  }
  const picked = pickReply(next, pack.replies, 'launch', {
    title: stepTitle(pack, targetStep),
    stepId: targetStep,
  });
  const text = isCorrection
    ? `Updated details for “${stepTitle(pack, targetStep)}”. ${picked.text}`
    : picked.text;
  setSession(() => picked.session);
  pushAssistant(text);
  emitCoachEvent(deps, {
    type: 'launch',
    stepId: targetStep,
    gated: !opts?.skipGate,
    correction: isCorrection,
  });
  const nav = pack.resolveNav(targetStep, ctx);
  executeStep(targetStep, {
    prefill: slots,
    skipCoach: true,
    coachCreate: Boolean(nav?.coachCreate || nav?.openModal),
  });
}
