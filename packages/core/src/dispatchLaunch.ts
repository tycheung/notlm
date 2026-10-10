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
import { enterSubgraph } from './subgraph.js';
import { stepTitle } from './dispatchResolve.js';
import type { GuideAction, StepId } from './types.js';

export function launchStep(
  deps: DispatchDeps,
  targetStep: StepId,
  slots: Record<string, unknown>,
  isCorrection: boolean,
  opts?: {
    skipGate?: boolean;
    rawIntent?: string | null;
    confidence?: 'high' | 'mid' | 'low';
    forceOpenSurface?: string;
    forceSurfaceStep?: string | null;
    forceOpenModal?: string;
    skipOpenModal?: boolean;
    forceInstructOnly?: boolean;
  }
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

  // Soft confirm when host marks the step unavailable (even if NLP confidence is high).
  if (!isCorrection && !opts?.skipGate) {
    const reason = pack.unavailableReason?.(targetStep, ctx) ?? null;
    if (reason) {
      let next: import('./types.js').SessionSlots = {
        ...session,
        pending: {
          kind: 'confirm',
          stepId: targetStep,
          slots,
        },
        discourse: {
          ...(session.discourse ?? {}),
          lastChoiceIds: ['__yes__', '__no__'],
        },
      };
      const picked = pickReply(next, pack.replies, 'repair.low_confidence', {
        title: stepTitle(pack, targetStep),
        stepId: targetStep,
        message: reason,
      });
      next = {
        ...picked.session,
        pending: next.pending,
        discourse: next.discourse,
      };
      setSession(() => next);
      pushAssistant(picked.text, {
        choices: [
          { id: '__yes__', label: 'Yes' },
          { id: '__no__', label: 'No' },
        ],
      });
      emitCoachEvent(deps, { type: 'confirm_ask', stepId: targetStep });
      emitCoachEvent(deps, {
        type: 'repair',
        kind: 'low_confidence',
        text: deps.text,
        rawIntent: opts?.rawIntent,
        confidence: opts?.confidence ?? 'high',
      });
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

  const parentStep = pack.steps.find((s) => s.id === targetStep);
  if (parentStep?.subgraph) {
    setSession((s) => enterSubgraph(s, targetStep, parentStep.subgraph!));
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
      emitCoachEvent(deps, {
        type: 'launch',
        stepId: targetStep,
        gated: false,
        text: deps.text,
        rawIntent: opts?.rawIntent,
        confidence: opts?.confidence,
      });
      executeStep(targetStep, {
        prefill: slots,
        skipCoach: true,
        ...(opts?.forceOpenSurface
          ? { forceOpenSurface: opts.forceOpenSurface }
          : {}),
        ...(opts?.forceSurfaceStep !== undefined
          ? { forceSurfaceStep: opts.forceSurfaceStep }
          : {}),
        ...(opts?.forceOpenModal
          ? { forceOpenModal: opts.forceOpenModal }
          : {}),
        ...(opts?.skipOpenModal ? { skipOpenModal: true } : {}),
        ...(opts?.forceInstructOnly ? { forceInstructOnly: true } : {}),
      });
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
  const withAudit = {
    ...picked.session,
    discourse: {
      ...(picked.session.discourse ?? {}),
      lastStepId: targetStep,
      lastCoachAction: {
        kind: 'goto',
        id: targetStep,
        summary: `Opened “${stepTitle(pack, targetStep)}”.`,
      },
    },
  };
  setSession(() => withAudit);
  pushAssistant(text);
  emitCoachEvent(deps, {
    type: 'launch',
    stepId: targetStep,
    gated: !opts?.skipGate,
    correction: isCorrection,
    text: deps.text,
    rawIntent: opts?.rawIntent,
    confidence: opts?.confidence,
  });
  const nav = pack.resolveNav(targetStep, ctx);
  executeStep(targetStep, {
    prefill: slots,
    skipCoach: true,
    coachCreate: Boolean(
      !opts?.skipOpenModal && (nav?.coachCreate || nav?.openModal)
    ),
    ...(opts?.forceOpenSurface
      ? { forceOpenSurface: opts.forceOpenSurface }
      : {}),
    ...(opts?.forceSurfaceStep !== undefined
      ? { forceSurfaceStep: opts.forceSurfaceStep }
      : {}),
    ...(opts?.forceOpenModal ? { forceOpenModal: opts.forceOpenModal } : {}),
    ...(opts?.skipOpenModal ? { skipOpenModal: true } : {}),
    ...(opts?.forceInstructOnly ? { forceInstructOnly: true } : {}),
  });
}
