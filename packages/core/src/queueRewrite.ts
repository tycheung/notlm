import { parseUtterance } from './intents.js';
import type { GuideAction, IntentParsePack, SessionSlots, StepId } from './types.js';
import {
  cancelThenJump,
  clearActionQueue,
  describeQueue,
  dropStepsFromQueue,
  jumpStepToHead,
  skipQueueHead,
} from './queueOps.js';

export type QueueRewriteKind =
  | { kind: 'clear' }
  | { kind: 'skip_head' }
  | { kind: 'drop'; stepIds: StepId[] }
  | { kind: 'jump'; stepId: StepId; slots: GuideAction['slots'] }
  | {
      kind: 'cancel_then_jump';
      dropIds: StepId[];
      jumpId: StepId;
      slots: GuideAction['slots'];
    };

const CLEAR_RE =
  /\b((clear|reset|empty)\s+(the\s+)?(queue|plan)|cancel\s+all|start\s+over|forget\s+(the\s+)?(rest|plan|queue))\b/i;
const SKIP_RE = /\b(skip\s+(this|it)|move\s+on|skip\s+this\s+step)\b/i;
const JUST_RE =
  /\b(just|only|go\s+straight\s+to|forget\s+the\s+rest[,.]?\s*)\b/i;
const CANCEL_THEN_RE =
  /\bcancel\b.+\b(go\s+straight\s+to|then\s+(do|create|open)|and\s+(just|only)\b)/i;

function titleOf(pack: IntentParsePack, id: StepId): string {
  return pack.steps.find((s) => s.id === id)?.title ?? id;
}

/** Match step ids mentioned in text via aliases / titles / keywords. */
export function findMentionedStepIds(text: string, pack: IntentParsePack): StepId[] {
  const hits: Array<{ id: StepId; score: number }> = [];
  const lower = text.toLowerCase();
  for (const step of pack.steps) {
    const phrases = [
      step.title,
      ...step.keywords,
      ...(pack.aliases[step.id] ?? []),
    ];
    let best = 0;
    for (const p of phrases) {
      const phrase = p.toLowerCase().trim();
      if (!phrase) continue;
      if (lower.includes(phrase)) best = Math.max(best, phrase.length);
    }
    if (best > 0) hits.push({ id: step.id, score: best });
  }
  return hits.sort((a, b) => b.score - a.score).map((h) => h.id);
}

/**
 * Detect queue rewrite language. Returns null when the utterance is not a rewrite.
 * Only meaningful when a queue is already active (caller may still clear on empty).
 */
export function detectQueueRewrite(
  text: string,
  pack: IntentParsePack,
  session: SessionSlots
): QueueRewriteKind | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (CLEAR_RE.test(trimmed)) return { kind: 'clear' };
  if (SKIP_RE.test(trimmed) && session.actionQueue.length > 0) {
    return { kind: 'skip_head' };
  }

  if (CANCEL_THEN_RE.test(trimmed) || /\bcancel\b.+\b(go straight|then)\b/i.test(trimmed)) {
    const parts = trimmed.split(
      /\b(?:go\s+straight\s+to|then\s+(?:do|create|open)|and\s+(?:just|only))\b/i
    );
    const dropPart = parts[0] ?? trimmed;
    const jumpPart = parts[1] ?? '';
    const jumpId = findMentionedStepIds(jumpPart, pack)[0];
    const dropIds = findMentionedStepIds(dropPart, pack).filter((id) => id !== jumpId);
    if (jumpId) {
      return {
        kind: 'cancel_then_jump',
        dropIds: dropIds.length ? dropIds : findMentionedStepIds(dropPart, pack),
        jumpId,
        slots: {},
      };
    }
    if (dropIds.length === 1) {
      return { kind: 'jump', stepId: dropIds[0]!, slots: {} };
    }
  }

  if (/\bcancel\b/i.test(trimmed) && session.actionQueue.length > 0) {
    const mentioned = findMentionedStepIds(trimmed, pack);
    const queued = new Set(session.actionQueue.map((a) => a.stepId));
    const dropIds = mentioned.filter((id) => queued.has(id));
    if (dropIds.length > 0 && !JUST_RE.test(trimmed)) {
      return { kind: 'drop', stepIds: dropIds };
    }
  }

  if (
    JUST_RE.test(trimmed) &&
    session.actionQueue.length > 0 &&
    !/\bcancel\s+all\b/i.test(trimmed)
  ) {
    const parsed = parseUtterance(trimmed, pack);
    const mentioned = findMentionedStepIds(trimmed, pack);
    const stepId = parsed.stepId ?? mentioned[0];
    if (stepId) {
      return { kind: 'jump', stepId, slots: parsed.slotPatches };
    }
  }

  return null;
}

export type QueueRewriteApplyResult = {
  session: SessionSlots;
  message: string;
  /** When set, reopen/execute this step as the new head. */
  executeHead?: StepId;
};

export function applyQueueRewrite(
  kind: QueueRewriteKind,
  session: SessionSlots,
  pack: IntentParsePack
): QueueRewriteApplyResult {
  const title = (id: StepId) => titleOf(pack, id);

  if (kind.kind === 'clear') {
    return {
      session: clearActionQueue(session),
      message: 'Cleared the queue.',
    };
  }
  if (kind.kind === 'skip_head') {
    const next = skipQueueHead(session);
    const head = next.actionQueue[0];
    return {
      session: next,
      message: head
        ? `Skipped. Continuing with “${title(head.stepId)}”.`
        : 'Skipped. Queue is empty.',
      executeHead: head?.stepId,
    };
  }
  if (kind.kind === 'drop') {
    const next = dropStepsFromQueue(session, kind.stepIds);
    const labels = kind.stepIds.map((id) => `“${title(id)}”`).join(', ');
    const head = next.actionQueue[0];
    return {
      session: next,
      message: head
        ? `Removed ${labels}. ${describeQueue(next.actionQueue, title)}`
        : `Removed ${labels}. Queue is empty.`,
      executeHead: head?.stepId,
    };
  }
  if (kind.kind === 'jump') {
    const next = jumpStepToHead(session, kind.stepId, kind.slots);
    return {
      session: next,
      message: `Okay — jumping to “${title(kind.stepId)}”.`,
      executeHead: kind.stepId,
    };
  }
  // cancel_then_jump
  const next = cancelThenJump(
    session,
    kind.dropIds,
    kind.jumpId,
    kind.slots
  );
  const dropped = kind.dropIds.map((id) => `“${title(id)}”`).join(', ');
  return {
    session: next,
    message: `Cancelled ${dropped}. Opening “${title(kind.jumpId)}”.`,
    executeHead: kind.jumpId,
  };
}
