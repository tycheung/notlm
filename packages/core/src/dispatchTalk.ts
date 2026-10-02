import { extractMultiSlotPatches, extractSlotAnswer } from './discourse.js';
import { isAffirmative, isNegative, pickReply } from './replies.js';
import { patchStepSlots } from './slots.js';
import type {
  ChatChoice,
  LoadedPack,
  SessionSlots,
  SlotBag,
  StepId,
} from './types.js';

export type TalkSink = {
  pushAssistant: (text: string, opts?: { choices?: ChatChoice[] }) => void;
  setSession: (updater: (session: SessionSlots) => SessionSlots) => void;
};

function titleOf(pack: LoadedPack, stepId: StepId): string {
  return pack.steps.find((s) => s.id === stepId)?.title ?? stepId;
}

function firstMissingSlot(
  pack: LoadedPack,
  stepId: StepId,
  slots: SlotBag
): { key: string; ask: string } | null {
  const defs = pack.slots?.[stepId] ?? [];
  for (const def of defs) {
    if (def.required === false) continue;
    const val = slots[def.key];
    if (val === undefined || val === null || String(val).trim() === '') {
      return { key: def.key, ask: def.ask };
    }
  }
  return null;
}

/** Ask for a missing slot or confirm, else return false to proceed with launch. */
export function gateBeforeLaunch(
  pack: LoadedPack,
  session: SessionSlots,
  stepId: StepId,
  slots: SlotBag,
  sink: TalkSink
): boolean {
  const merged = { ...(session.byStep[stepId] ?? {}), ...slots };
  const missing = firstMissingSlot(pack, stepId, merged);
  if (missing) {
    let next: SessionSlots = {
      ...session,
      pending: {
        kind: 'ask_slot',
        stepId,
        slotKey: missing.key,
        slots: merged,
      },
    };
    const picked = pickReply(next, pack.replies, 'ask_slot', {
      prompt: missing.ask,
      title: titleOf(pack, stepId),
      stepId,
    });
    next = { ...picked.session, pending: next.pending };
    sink.setSession(() => next);
    sink.pushAssistant(picked.text);
    return true;
  }

  if ((pack.confirm ?? []).includes(stepId)) {
    let next: SessionSlots = {
      ...session,
      pending: { kind: 'confirm', stepId, slots: merged },
      discourse: {
        ...(session.discourse ?? {}),
        lastChoiceIds: ['__yes__', '__no__'],
      },
    };
    const picked = pickReply(next, pack.replies, 'confirm', {
      title: titleOf(pack, stepId),
      stepId,
    });
    next = { ...picked.session, pending: next.pending };
    sink.setSession(() => next);
    sink.pushAssistant(picked.text, {
      choices: [
        { id: '__yes__', label: 'Yes' },
        { id: '__no__', label: 'No' },
      ],
    });
    return true;
  }

  return false;
}

/**
 * Consume a pending multi-turn prompt. Returns:
 * - `handled: true` when the utterance was consumed as a pending answer
 * - optional `launch` when confirm/proactive/slot-complete should navigate
 */
export function handlePendingUtterance(
  pack: LoadedPack,
  session: SessionSlots,
  text: string,
  sink: TalkSink
): { handled: boolean; launch?: { stepId: StepId; slots: SlotBag } } {
  const pending = session.pending;
  if (!pending) return { handled: false };

  if (pending.kind === 'ask_slot') {
    const knownKeys = (pack.slots?.[pending.stepId] ?? []).map((d) => d.key);
    const multi = extractMultiSlotPatches(
      text,
      knownKeys,
      pack.compiledHeuristics
    );
    const singleVal = extractSlotAnswer(text);
    let slots = { ...pending.slots };
    if (Object.keys(multi).length > 0) {
      slots = { ...slots, ...multi };
    } else if (singleVal) {
      slots = { ...slots, [pending.slotKey]: singleVal };
    } else {
      sink.pushAssistant(pending.slotKey ? `Please provide a value.` : 'Go ahead…');
      return { handled: true };
    }
    let next: SessionSlots = patchStepSlots(
      { ...session, pending: null },
      pending.stepId,
      slots
    );
    sink.setSession(() => next);
    const still = firstMissingSlot(pack, pending.stepId, slots);
    if (still) {
      next = {
        ...next,
        pending: {
          kind: 'ask_slot',
          stepId: pending.stepId,
          slotKey: still.key,
          slots,
        },
      };
      const picked = pickReply(next, pack.replies, 'ask_slot', {
        prompt: still.ask,
        title: titleOf(pack, pending.stepId),
        stepId: pending.stepId,
      });
      sink.setSession(() => ({ ...picked.session, pending: next.pending }));
      sink.pushAssistant(picked.text);
      return { handled: true };
    }
    if ((pack.confirm ?? []).includes(pending.stepId)) {
      if (gateBeforeLaunch(pack, next, pending.stepId, slots, sink)) {
        return { handled: true };
      }
    }
    return { handled: true, launch: { stepId: pending.stepId, slots } };
  }

  if (pending.kind === 'confirm') {
    if (isNegative(text)) {
      const picked = pickReply(
        { ...session, pending: null },
        pack.replies,
        'cancel',
        {}
      );
      sink.setSession(() => ({ ...picked.session, pending: null }));
      sink.pushAssistant(picked.text);
      return { handled: true };
    }
    if (isAffirmative(text) || /^yes\b/i.test(text)) {
      sink.setSession((s) => ({ ...s, pending: null }));
      return {
        handled: true,
        launch: { stepId: pending.stepId, slots: pending.slots },
      };
    }
    // Unrelated utterance — drop pending and let normal dispatch continue.
    sink.setSession((s) => ({ ...s, pending: null }));
    return { handled: false };
  }

  if (pending.kind === 'proactive') {
    if (isNegative(text) || text.trim().toLowerCase() === 'not now') {
      const picked = pickReply(
        { ...session, pending: null },
        pack.replies,
        'affirm_skip',
        {}
      );
      sink.setSession(() => ({ ...picked.session, pending: null }));
      sink.pushAssistant(picked.text);
      return { handled: true };
    }
    // Only bare affirmatives accept the offer (chips send "Yes — …"). Step aliases
    // fall through so slot/confirm gates still run.
    if (isAffirmative(text)) {
      sink.setSession((s) => ({ ...s, pending: null }));
      return { handled: true, launch: { stepId: pending.stepId, slots: {} } };
    }
    sink.setSession((s) => ({ ...s, pending: null }));
    return { handled: false };
  }

  return { handled: false };
}
