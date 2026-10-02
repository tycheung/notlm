import type { ParseUtteranceFn } from './dispatchDeps.js';
import { extractEntitySpans } from './oodReply.js';
import { parseUtterance } from './intents.js';
import { expandActionsWithPrereqs } from './queueOps.js';
import { assembleOodReply } from './oodReply.js';
import type {
  GuideAction,
  IntentParsePack,
  PackedUtteranceResult,
  ParseUtteranceResult,
  ReplyBank,
  SessionSlots,
} from './types.js';

const PACK_SPLIT_RE = /\band then\b|\bthen\b|\band\b|,/i;

const OOD_HINT_RE =
  /\b(recipe|muffin|muffins|cupcake|cook|bake|weather|bitcoin|homework|playlist)\b/i;

export type PackedSegment =
  | { kind: 'action'; action: GuideAction }
  | { kind: 'ood'; segment: string; entities: string[] };

export type PackedUtteranceWithOod = PackedUtteranceResult & {
  segments: PackedSegment[];
  oodSegments: string[];
};

function titleFor(steps: IntentParsePack['steps'], stepId: string): string {
  return steps.find((s) => s.id === stepId)?.title ?? stepId;
}

function hasOodHint(segment: string): boolean {
  return OOD_HINT_RE.test(segment);
}

/**
 * Split on conjunctions; classify each segment as in-DAG action or OOD.
 * Uses parseUtteranceFn when provided (else rules). Async parsers fall back to rules per segment.
 */
export function parsePackedUtterance(
  raw: string,
  pack: IntentParsePack,
  opts?: {
    parseUtteranceFn?: ParseUtteranceFn;
    pathname?: string;
    shortlistStepIds?: string[];
    data?: Record<string, unknown>;
  }
): PackedUtteranceWithOod {
  const text = raw.trim();
  if (!text) {
    return { actions: [], meta: null, segments: [], oodSegments: [] };
  }

  const parseFn = opts?.parseUtteranceFn ?? parseUtterance;
  const parseOpts = {
    pathname: opts?.pathname,
    shortlistStepIds: opts?.shortlistStepIds,
    data: opts?.data,
  };

  const runParse = (segment: string): ParseUtteranceResult => {
    const r = parseFn(segment, pack, parseOpts);
    if (r && typeof (r as Promise<unknown>).then === 'function') {
      return parseUtterance(segment, pack, parseOpts);
    }
    return r as ParseUtteranceResult;
  };

  const single = runParse(text);
  const metaOnly =
    single.goBack ||
    single.rawIntent === 'whats_next' ||
    single.rawIntent === 'explain_field' ||
    single.rawIntent === 'help' ||
    single.rawIntent === 'cancel_all' ||
    single.rawIntent === 'do_it';
  if (metaOnly) {
    return { actions: [], meta: single, segments: [], oodSegments: [] };
  }

  const parts = text.split(PACK_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
  const segments = parts.length <= 1 ? [text] : parts;

  const actions: GuideAction[] = [];
  const packedSegments: PackedSegment[] = [];
  const oodSegments: string[] = [];

  for (const segment of segments) {
    const parsed = runParse(segment);
    if (parsed.stepId) {
      const action: GuideAction = {
        stepId: parsed.stepId,
        slots: parsed.slotPatches,
        rawSegment: segment,
      };
      actions.push(action);
      packedSegments.push({ kind: 'action', action });
      continue;
    }
    // Multi-segment unknown, or explicit OOD hint → OOD segment.
    if (segments.length > 1 || hasOodHint(segment)) {
      oodSegments.push(segment);
      packedSegments.push({
        kind: 'ood',
        segment,
        entities: extractEntitySpans(segment),
      });
    }
  }

  // Single-segment with OOD hint and no step → mark OOD for canned refuse.
  if (
    segments.length === 1 &&
    actions.length === 0 &&
    oodSegments.length === 0 &&
    hasOodHint(text)
  ) {
    oodSegments.push(text);
    packedSegments.push({
      kind: 'ood',
      segment: text,
      entities: extractEntitySpans(text),
    });
  }

  // Only expand prereqs for true multi-segment packs; single-step launch
  // still goes through launchStep / requires gating (not queue merge).
  const finalActions =
    segments.length > 1 ? expandActionsWithPrereqs(pack.steps, actions) : actions;

  return {
    actions: finalActions,
    meta: null,
    segments: packedSegments,
    oodSegments,
  };
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

export function composeMixedIntentReply(
  packed: PackedUtteranceWithOod,
  steps: IntentParsePack['steps'],
  session: SessionSlots,
  bank: ReplyBank | undefined,
  productRole?: string,
  heuristics?: import('./heuristics.js').CompiledHeuristics | null
): { text: string; session: SessionSlots } | null {
  if (packed.oodSegments.length === 0) return null;
  const titles = packed.actions.map((a) => titleFor(steps, a.stepId));
  const oodText = packed.oodSegments.join('; ');
  const assembled = assembleOodReply(oodText, {
    session,
    bank,
    productRole,
    partial: packed.actions.length > 0,
    handledTitles: titles,
    heuristics,
  });
  if (packed.actions.length === 0) {
    return { text: assembled.text, session: assembled.session };
  }
  const head = packedUtteranceSummary(packed.actions, steps);
  return {
    text: `${head} ${assembled.text}`.trim(),
    session: assembled.session,
  };
}
