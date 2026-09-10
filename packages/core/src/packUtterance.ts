import { parseUtterance } from './intents.js';
import { expandActionsWithPrereqs } from './queueOps.js';
import type { GuideAction, IntentParsePack, PackedUtteranceResult } from './types.js';

const PACK_SPLIT_RE = /\band then\b|\bthen\b/i;

function titleFor(steps: IntentParsePack['steps'], stepId: string): string {
  return steps.find((s) => s.id === stepId)?.title ?? stepId;
}

export function parsePackedUtterance(raw: string, pack: IntentParsePack): PackedUtteranceResult {
  const text = raw.trim();
  if (!text) return { actions: [], meta: null };

  const single = parseUtterance(text, pack);
  const metaOnly =
    single.goBack ||
    single.rawIntent === 'whats_next' ||
    single.rawIntent === 'explain_field' ||
    single.rawIntent === 'help' ||
    single.rawIntent === 'cancel_all' ||
    single.rawIntent === 'do_it';
  if (metaOnly) return { actions: [], meta: single };

  const segments = text.split(PACK_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
  if (segments.length <= 1) {
    if (!single.stepId) return { actions: [], meta: null };
    return {
      actions: [
        { stepId: single.stepId, slots: single.slotPatches, rawSegment: text },
      ],
      meta: null,
    };
  }

  const actions: GuideAction[] = [];
  for (const segment of segments) {
    const parsed = parseUtterance(segment, pack);
    if (parsed.stepId) {
      actions.push({
        stepId: parsed.stepId,
        slots: parsed.slotPatches,
        rawSegment: segment,
      });
    }
  }

  return { actions: expandActionsWithPrereqs(pack.steps, actions), meta: null };
}

export function packedUtteranceSummary(
  actions: GuideAction[],
  steps: IntentParsePack['steps']
): string {
  if (actions.length <= 1) {
    const head = actions[0];
    return head ? `Opening ${titleFor(steps, head.stepId)}.` : '';
  }
  return `Queued ${actions.map((a) => titleFor(steps, a.stepId)).join(' → ')}.`;
}
