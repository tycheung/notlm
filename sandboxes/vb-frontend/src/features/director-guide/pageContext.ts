import { FLOW_STEPS } from './flowGraph';
import { getNavSkip } from './navSkipRegistry';
import type {
  ChatMessage,
  GuideRuntimeContext,
  GuideStepId,
  GuideStepStatus,
} from './types';

export type PageContextSnapshot = {
  pathname: string;
  search: string;
  tournamentId: number | null;
  eventId: number | null;
  currentStepHint: GuideStepId | null;
  nextStepIds: GuideStepId[];
  availableStepIds: GuideStepId[];
  scoringBlockerMessages: string[];
};

/** Infer which checklist step best matches the open route/tab. */
export function inferCurrentStepFromRoute(
  pathname: string,
  search: string,
  ctx: GuideRuntimeContext
): GuideStepId | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const tab = (params.get('tab') || '').toLowerCase();

  if (/\/subscription/.test(pathname)) return 'billing_ready';
  if (/bowling-?centers/.test(pathname)) return 'bowling_center';
  if (/\/side-actions(\/|$)/.test(pathname) && !/events\//.test(pathname)) {
    return 'create_tournament';
  }

  if (/\/events\/\d+/.test(pathname) || /\/side-actions\/events\/\d+/.test(pathname)) {
    if (/\/flow/.test(pathname)) return 'advance_rounds';
    switch (tab) {
      case 'format':
      case 'format_editor':
      case 'formateditor':
        return 'apply_format';
      case 'side_actions':
      case 'sideactions':
      case 'side-actions':
        return 'side_actions';
      case 'participants':
        return 'register_participants';
      case 'squads':
        return 'assign_squads';
      case 'lanes':
        return 'assign_lanes';
      case 'scoring':
      case 'game_scoring':
        return 'enter_scores';
      case 'standings':
        return 'run_reports';
      default:
        return ctx.eventId != null ? 'create_event' : null;
    }
  }

  if (/\/tournaments\/\d+/.test(pathname)) return 'create_event';
  if (/\/tournaments\/?$/.test(pathname) || pathname.endsWith('/director') || pathname.endsWith('/admin')) {
    return 'create_tournament';
  }
  return null;
}

export function buildPageContextSnapshot(args: {
  pathname: string;
  search: string;
  ctx: GuideRuntimeContext;
  statuses: GuideStepStatus[];
  nextSteps: GuideStepStatus[];
  scoringBlockerMessages: string[];
}): PageContextSnapshot {
  return {
    pathname: args.pathname,
    search: args.search,
    tournamentId: args.ctx.tournamentId,
    eventId: args.ctx.eventId,
    currentStepHint: inferCurrentStepFromRoute(args.pathname, args.search, args.ctx),
    nextStepIds: args.nextSteps.map((s) => s.id),
    availableStepIds: args.statuses.filter((s) => s.available && !s.complete).map((s) => s.id),
    scoringBlockerMessages: args.scoringBlockerMessages,
  };
}

const STEP_TITLE_RE_CACHE = new Map<GuideStepId, RegExp>();

function titlePattern(stepId: GuideStepId): RegExp {
  let re = STEP_TITLE_RE_CACHE.get(stepId);
  if (re) return re;
  const title = getNavSkip(stepId)?.title || FLOW_STEPS.find((s) => s.id === stepId)?.title || stepId;
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  re = new RegExp(escaped, 'i');
  STEP_TITLE_RE_CACHE.set(stepId, re);
  return re;
}

/** Last step the assistant mentioned in recent chat (for “take me there”). */
export function lastMentionedStepFromHistory(messages: ChatMessage[]): GuideStepId | null {
  const recent = messages.slice(-12).reverse();
  for (const m of recent) {
    if (m.role !== 'assistant') continue;
    for (const step of FLOW_STEPS) {
      if (titlePattern(step.id).test(m.text)) return step.id;
    }
    const goto = m.text.match(/Taking you to [“"]([^”"]+)[”"]/i);
    if (goto?.[1]) {
      const hit = FLOW_STEPS.find(
        (s) => (getNavSkip(s.id)?.title || s.title).toLowerCase() === goto[1].toLowerCase()
      );
      if (hit) return hit.id;
    }
  }
  return null;
}

/**
 * When utterance step is null/ambiguous, prefer page-local step if it's among candidates.
 */
export function biasStepByPageContext(
  stepId: GuideStepId | null,
  page: PageContextSnapshot,
  candidates?: GuideStepId[]
): GuideStepId | null {
  if (stepId) return stepId;
  const hint = page.currentStepHint;
  if (!hint) return null;
  if (candidates && candidates.length > 0) {
    return candidates.includes(hint) ? hint : null;
  }
  return hint;
}

/** Map diagnose-target phrases to a step (default scoring). */
export function diagnoseTargetFromText(text: string): GuideStepId {
  const t = text.toLowerCase();
  if (/\blanes?\b/.test(t)) return 'assign_lanes';
  if (/\bsquads?\b/.test(t)) return 'assign_squads';
  if (/\bparticipants?\b|\bbowlers?\b|\broster\b/.test(t)) return 'register_participants';
  if (/\bformat\b|\brounds?\b/.test(t)) return 'apply_format';
  if (/\breports?\b/.test(t)) return 'run_reports';
  return 'enter_scores';
}
