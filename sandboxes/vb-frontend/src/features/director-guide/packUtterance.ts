import { FLOW_STEPS } from './flowGraph';
import {
  STEP_ALIASES,
  extractCenterHint,
  extractLanes,
  extractName,
  matchStep,
  normalizeSpeech,
  parseUtterance,
} from './intents';
import {
  firstNDaysOfRange,
  parseDayRelativeDateTimes,
  parseFirstNDaysPhrase,
  parseMonthDayRange,
  parseSquadDayWindow,
  type DateRangeYmd,
} from './dateSlots';
import type { GuideSlotBag, GuideStepId, ParseUtteranceResult } from './types';
import { slotsFromFormatCompile } from './formatDraftCompiler';

export type GuideAction = {
  stepId: GuideStepId;
  slots: GuideSlotBag;
  rawSegment: string;
};

export type PackedUtteranceResult = {
  actions: GuideAction[];
  /** Meta intents that apply to the whole utterance (not queued as steps). */
  meta: ParseUtteranceResult | null;
  referenceRange: DateRangeYmd | null;
  summary: string;
};

const STEP_BOUNDARY_PHRASES: Array<{ stepId: GuideStepId; re: RegExp }> = [
  { stepId: 'create_tournament', re: /\b(?:create|start|make|set\s*up|new)\s+(?:a\s+)?(?:new\s+)?tournaments?\b/i },
  {
    stepId: 'create_event',
    re: /\b(?:create|add|make|set\s*up|new)\s+(?:an?\s+)?(?:new\s+)?(?:(?:team|singles)\s+)?events?\b/i,
  },
  { stepId: 'side_actions', re: /\b(?:side\s*actions?|configure\s+pots?|bracket\s+pot)\b/i },
  { stepId: 'apply_format', re: /\b(?:format\s+editor|format\s+wizard|apply\s+format|set\s*up\s+rounds|structure\s+(?:the\s+)?event|qualifying|cashers|stepladder|single\s*elim|add\s+(?:a\s+)?round|add\s+(?:an?\s+)?edge)\b/i },
  { stepId: 'billing_ready', re: /\b(?:subscription|billing|my\s+plan|passes)\b/i },
  { stepId: 'register_participants', re: /\b(?:register\s+participants|add\s+bowlers|participant\s+management)\b/i },
  { stepId: 'assign_squads', re: /\b(?:assign\s+squads|squad\s+assignment)\b/i },
  { stepId: 'enter_scores', re: /\b(?:enter\s+scores|game\s+scoring)\b/i },
  { stepId: 'bowling_center', re: /\b(?:bowling\s+cent(?:er|re)|add\s+(?:a\s+)?center)\b/i },
];

/** Scope center extraction to text before packed-utterance continuation cues. */
function extractCenterBeforeThen(text: string): string | null {
  const beforeContinuation = text.replace(/\s+\b(?:then|after|and\s+then)\b[\s\S]*/i, '');
  return extractCenterHint(beforeContinuation);
}

/** Strip tournament date phrases so they are not treated as event-only noise on tournament segment. */
function stripTournamentDateNoise(text: string): string {
  return text.replace(
    /\b(?:from\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\s*(?:to|-|through|thru|until)\s*(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?\d{1,2}(?:st|nd|rd|th)?\b/gi,
    ' '
  );
}

function extractTournamentSlots(segment: string): GuideSlotBag {
  const cleaned = stripTournamentDateNoise(segment);
  const slots: GuideSlotBag = {};
  const name = extractName(cleaned);
  if (name) slots.name = name;
  const center = extractCenterBeforeThen(cleaned);
  if (center) slots.bowling_center_hint = center;
  const lanes = extractLanes(cleaned);
  if (lanes != null) slots.lanes_reserved = lanes;
  // Dates intentionally ignored for tournament form
  return slots;
}

function extractEventSlots(
  segment: string,
  referenceRange: DateRangeYmd | null
): GuideSlotBag {
  const slots: GuideSlotBag = {};
  const name = extractName(segment);
  if (name) slots.name = name;

  if (/\bteam(?:s)?\s+event\b|\bteam\s+format\b|\ba\s+team\s+event\b/i.test(segment)) {
    slots.event_format = 'teams';
  } else if (/\bsingles?\s+event\b|\bsingles\s+format\b/i.test(segment)) {
    slots.event_format = 'singles';
  }

  if (/\bno\s+re-?entr(?:y|ies)\b|\bre-?entr(?:y|ies)\s+not\s+allowed\b|\bwithout\s+re-?entr/i.test(segment)) {
    slots.allows_reentry = false;
  } else if (/\ballow(?:s)?\s+re-?entr/i.test(segment)) {
    slots.allows_reentry = true;
  }

  let eventRange: DateRangeYmd | null = null;
  const nDays = parseFirstNDaysPhrase(segment);
  if (nDays != null && referenceRange) {
    eventRange = firstNDaysOfRange(referenceRange, nDays);
  }
  if (!eventRange) {
    eventRange = parseMonthDayRange(segment);
  }
  if (eventRange) {
    const times = parseDayRelativeDateTimes(segment, eventRange);
    if (times.start_date) slots.start_date = times.start_date;
    else slots.start_date = `${eventRange.startYmd}T00:00:00`;
    if (times.end_date) slots.end_date = times.end_date;
    else slots.end_date = `${eventRange.endYmd}T23:59:59`;
  }

  const squad = parseSquadDayWindow(segment);
  if (squad) {
    if (squad.squad_count != null) slots.squad_count = squad.squad_count;
    if (squad.squad_day != null) slots.squad_day = squad.squad_day;
    if (squad.squad_window_start) slots.squad_window_start = squad.squad_window_start;
    if (squad.squad_window_end) slots.squad_window_end = squad.squad_window_end;
    if (squad.notes) slots.notes = squad.notes;
  }

  return slots;
}

function extractSideActionSlots(segment: string): GuideSlotBag {
  const slots: GuideSlotBag = {};
  if (/\bbracket\b/i.test(segment)) slots.pot_hint = 'bracket';
  else if (/\beliminator\b/i.test(segment)) slots.pot_hint = 'eliminator';
  else if (/\bhigh\s+game\b/i.test(segment)) slots.pot_hint = 'high_game';
  return slots;
}

function extractBillingSlots(segment: string): GuideSlotBag {
  const slots: GuideSlotBag = {};
  if (/\bpass(?:es)?\b/i.test(segment)) slots.focus = 'passes';
  else if (/\bplan\b|\bsubscription\b/i.test(segment)) slots.focus = 'subscription';
  return slots;
}

function extractSlotsForStep(
  stepId: GuideStepId,
  segment: string,
  referenceRange: DateRangeYmd | null
): GuideSlotBag {
  switch (stepId) {
    case 'create_tournament':
      return extractTournamentSlots(segment);
    case 'create_event':
      return extractEventSlots(segment, referenceRange);
    case 'side_actions':
      return extractSideActionSlots(segment);
    case 'billing_ready':
      return extractBillingSlots(segment);
    case 'apply_format': {
      const squad = parseSquadDayWindow(segment);
      const formatSlots = slotsFromFormatCompile(segment, null);
      return squad ? { ...formatSlots, ...squad } : formatSlots;
    }
    default: {
      const single = parseUtterance(segment);
      return single.slotPatches;
    }
  }
}

function findBoundaryHits(text: string): Array<{ index: number; stepId: GuideStepId }> {
  const hits: Array<{ index: number; stepId: GuideStepId }> = [];
  for (const { stepId, re } of STEP_BOUNDARY_PHRASES) {
    re.lastIndex = 0;
    const copy = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = copy.exec(text)) != null) {
      hits.push({ index: m.index, stepId });
    }
  }
  // Also split on "then" / "after that" when followed by step-ish content
  const thenRe = /\b(?:then|after\s+that|next[,:]?)\b/gi;
  let tm: RegExpExecArray | null;
  while ((tm = thenRe.exec(text)) != null) {
    const after = text.slice(tm.index + tm[0].length);
    // Prefer explicit step-boundary hits after the cue over fuzzy matchStep
    // (e.g. "3 squads" must not steal create_event).
    let step: GuideStepId | null = null;
    for (const { stepId, re } of STEP_BOUNDARY_PHRASES) {
      const copy = new RegExp(re.source, re.flags);
      if (copy.test(after)) {
        step = stepId;
        break;
      }
    }
    if (!step) step = matchStep(after);
    if (step) hits.push({ index: tm.index, stepId: step });
  }
  hits.sort((a, b) => a.index - b.index || a.stepId.localeCompare(b.stepId));
  // Dedupe same index
  const out: typeof hits = [];
  for (const h of hits) {
    if (out.length && Math.abs(out[out.length - 1].index - h.index) < 3) continue;
    out.push(h);
  }
  return out;
}

function titleFor(stepId: GuideStepId): string {
  return FLOW_STEPS.find((s) => s.id === stepId)?.title || stepId;
}

/**
 * Parse one or many guide actions from a (possibly packed) utterance.
 */
export function parsePackedUtterance(raw: string, now: Date = new Date()): PackedUtteranceResult {
  const text = raw.trim();
  if (!text) {
    return { actions: [], meta: null, referenceRange: null, summary: '' };
  }

  const singleMeta = parseUtterance(text);
  const metaOnly =
    singleMeta.rawIntent === 'go_back' ||
    singleMeta.rawIntent === 'whats_next' ||
    singleMeta.rawIntent === 'diagnose_scoring' ||
    singleMeta.rawIntent === 'skip_side_actions' ||
    singleMeta.rawIntent === 'explain_field' ||
    singleMeta.rawIntent === 'lookup_participant';

  // Whole-utterance reference range (tournament dates) even if ignored on tournament form
  const referenceRange = parseMonthDayRange(text, now);

  if (metaOnly && !/\b(?:create|add|make)\s+(?:a\s+)?(?:new\s+)?(?:tournament|event)\b/i.test(text)) {
    return {
      actions: [],
      meta: singleMeta,
      referenceRange,
      summary: '',
    };
  }

  const hits = findBoundaryHits(text);
  const actions: GuideAction[] = [];

  if (hits.length === 0) {
    const stepId = singleMeta.stepId;
    if (stepId) {
      actions.push({
        stepId,
        slots: extractSlotsForStep(stepId, text, referenceRange),
        rawSegment: text,
      });
    }
  } else {
    for (let i = 0; i < hits.length; i += 1) {
      const start = hits[i].index;
      const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
      const segment = text.slice(start, end).trim();
      if (!segment) continue;
      const stepId = hits[i].stepId;
      actions.push({
        stepId,
        slots: extractSlotsForStep(stepId, segment, referenceRange),
        rawSegment: segment,
      });
    }
  }

  // Dedupe consecutive identical stepIds by merging slots
  const merged: GuideAction[] = [];
  for (const a of actions) {
    const prev = merged[merged.length - 1];
    if (prev && prev.stepId === a.stepId) {
      prev.slots = { ...prev.slots, ...a.slots };
      prev.rawSegment = `${prev.rawSegment} ${a.rawSegment}`.trim();
    } else {
      merged.push({ ...a, slots: { ...a.slots } });
    }
  }

  const summary =
    merged.length <= 1
      ? merged[0]
        ? `Opening ${titleFor(merged[0].stepId)}.`
        : ''
      : `Queued ${merged.map((a) => titleFor(a.stepId)).join(' → ')}. I'll continue after each step succeeds.`;

  return {
    actions: merged,
    meta: metaOnly ? singleMeta : null,
    referenceRange,
    summary,
  };
}

/** Exported for tests — known aliases presence. */
export function packerKnowsStep(stepId: GuideStepId): boolean {
  return Boolean(STEP_ALIASES[stepId]?.length || FLOW_STEPS.some((s) => s.id === stepId));
}

export function normalizeForPack(text: string): string {
  return normalizeSpeech(text);
}
