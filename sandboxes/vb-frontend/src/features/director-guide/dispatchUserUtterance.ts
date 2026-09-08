/**
 * Pure-ish dispatcher for Assistant chat utterances.
 * Extracted from GuideProvider to keep the provider focused on wiring.
 */
import { parseUtterance } from './intents';
import {
  getMissingRequiredFill,
  listMissingRequiredFills,
} from './missingRequired';
import { getNavSkip } from './navSkipRegistry';
import { parsePackedUtterance } from './packUtterance';
import {
  findGlossaryEntry,
  formatGlossaryReply,
  glossaryEntryByGuideId,
} from './fieldGlossary';
import { matchDataPoint, type DataPointLexiconEntry } from './dataPointLexicon';
import {
  extractEventNameHint,
  extractPersonNameHint,
} from './participantResolve';
import {
  biasStepByPageContext,
  buildPageContextSnapshot,
  diagnoseTargetFromText,
  lastMentionedStepFromHistory,
} from './pageContext';
import {
  goBackToStep,
  markSideActionsSkipped,
  patchStepSlots,
  setActionQueue,
  type GuideSessionSlots,
} from './slots';
import { slotsFromFormatCompile } from './formatDraftCompiler';
import { extractMatchSavedQuery } from './formatLexicon';
import { eventFormatTemplatesApi } from '../../api/eventFormatTemplates';
import type {
  ChatMessage,
  GuideRuntimeContext,
  GuideStepId,
  GuideStepStatus,
} from './types';

export type GuideUtteranceDeps = {
  text: string;
  location: { pathname: string; search: string };
  ctx: GuideRuntimeContext;
  statuses: GuideStepStatus[];
  nextSteps: GuideStepStatus[];
  siblingSteps: GuideStepId[];
  scoringBlockers: { message: string; stepId: GuideStepId }[];
  messages: ChatMessage[];
  session: GuideSessionSlots;
  setSession: (updater: (s: GuideSessionSlots) => GuideSessionSlots) => void;
  setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  pushAssistant: (text: string) => void;
  executeStep: (stepId: GuideStepId, opts?: Record<string, unknown>) => void;
  flashFields: (ids: string[]) => void;
  confirmParticipantChoice: (index: number) => void;
  runParticipantLookup: (
    person: string,
    dataKey: DataPointLexiconEntry | null,
    opts?: { eventSwitchName?: string | null }
  ) => void;
  openQueuedHead: (session: GuideSessionSlots, summary?: string) => void;
  newMessage: (role: 'user' | 'assistant', text: string) => ChatMessage;
};

export function dispatchUserUtterance(deps: GuideUtteranceDeps): void {
  const {
    text,
    location,
    ctx,
    statuses,
    nextSteps,
    siblingSteps,
    scoringBlockers,
    messages,
    session: liveSession,
    setSession,
    setMessages,
    pushAssistant,
    executeStep,
    flashFields,
    confirmParticipantChoice,
    runParticipantLookup,
    openQueuedHead,
    newMessage,
  } = deps;


  const trimmed = text.trim();
  if (!trimmed) return;

  const page = buildPageContextSnapshot({
    pathname: location.pathname,
    search: location.search,
    ctx,
    statuses,
    nextSteps,
    scoringBlockerMessages: scoringBlockers.map((b) => b.message),
  });
  const historyBefore = messages;
  const mentioned = lastMentionedStepFromHistory(historyBefore);

  setMessages((prev) => [...prev, newMessage('user', trimmed)]);

  // Confirm pending participant pick
  if (liveSession.pendingParticipantResolve) {
    const pending = liveSession.pendingParticipantResolve;
    const num = Number(trimmed.replace(/\D/g, ''));
    if (Number.isFinite(num) && num >= 1 && num <= pending.candidates.length) {
      confirmParticipantChoice(num - 1);
      return;
    }
    const byName = pending.candidates.findIndex(
      (c) => c.displayName.toLowerCase() === trimmed.toLowerCase()
    );
    if (byName >= 0) {
      confirmParticipantChoice(byName);
      return;
    }
    pushAssistant('Reply with the number of the bowler you meant, or tap a choice below.');
    return;
  }

  // Confirm pending format template pick
  if (liveSession.pendingFormatMatch) {
    const pending = liveSession.pendingFormatMatch;
    const num = Number(trimmed.replace(/\D/g, ''));
    if (Number.isFinite(num) && num >= 1 && num <= pending.candidates.length) {
      const chosen = pending.candidates[num - 1];
      setSession((s) => ({
        ...s,
        pendingFormatMatch: null,
        byStep: {
          ...s.byStep,
          apply_format: {
            ...(s.byStep.apply_format || {}),
            matchedTemplateId: chosen.templateId,
            formatMatchQuery: pending.query,
          },
        },
      }));
      pushAssistant(
        `Using “${chosen.name}”. Opening the format wizard — save/apply when you are ready.`
      );
      executeStep('apply_format', {
        skipCoach: true,
        coachCreate: true,
        prefill: { matchedTemplateId: chosen.templateId },
      });
      return;
    }
    pushAssistant('Reply with the number of the saved format you meant.');
    return;
  }

  const packed = parsePackedUtterance(trimmed);
  const parsed = packed.meta || parseUtterance(trimmed);

  if (parsed.goBack || parsed.rawIntent === 'go_back') {
    const hist = liveSession.history;
    // Prefer the step before the current active step in history.
    let prevStep: GuideStepId | null = null;
    if (liveSession.activeStep && hist.length >= 2) {
      const idx = hist.lastIndexOf(liveSession.activeStep);
      if (idx > 0) prevStep = hist[idx - 1];
      else if (hist[hist.length - 1] === liveSession.activeStep) {
        prevStep = hist[hist.length - 2] ?? null;
      }
    }
    if (!prevStep && hist.length >= 2) {
      prevStep = hist[hist.length - 2];
    }
    if (!prevStep) {
      pushAssistant('There is no earlier step to go back to yet.');
      return;
    }
    setSession((s) => goBackToStep(s, prevStep!));
    pushAssistant(`Going back to “${getNavSkip(prevStep)?.title || prevStep}”.`);
    executeStep(prevStep);
    return;
  }

  if (parsed.rawIntent === 'explain_field') {
    const fromFlash = liveSession.lastFlashedGuideId
      ? glossaryEntryByGuideId(liveSession.lastFlashedGuideId)
      : null;
    const fromText = findGlossaryEntry(trimmed);
    const missing = liveSession.activeStep
      ? getMissingRequiredFill(liveSession.activeStep, liveSession, {
          tournamentId: ctx.tournamentId,
        })
      : null;
    const fromMissing = missing ? glossaryEntryByGuideId(missing.fieldGuideId) : null;
    const entry = fromFlash || fromText || fromMissing;
    if (!entry) {
      pushAssistant(
        'Tell me which field — for example tournament name, bowling center, re-entries, or average.'
      );
      return;
    }
    pushAssistant(formatGlossaryReply(entry));
    if (entry.guideId) flashFields([entry.guideId]);
    return;
  }

  if (parsed.rawIntent === 'lookup_participant') {
    const eventHint = extractEventNameHint(trimmed);
    const person =
      extractPersonNameHint(trimmed) ||
      liveSession.lastResolvedParticipant?.displayName ||
      null;
    const dataKey = matchDataPoint(trimmed);
    if (!person && liveSession.lastResolvedParticipant && dataKey) {
      runParticipantLookup(liveSession.lastResolvedParticipant.displayName, dataKey, {
        eventSwitchName: eventHint,
      });
      return;
    }
    if (!person) {
      pushAssistant('Who should I look up? Say a name like “Where is Bob Benton”.');
      return;
    }
    runParticipantLookup(person, dataKey, { eventSwitchName: eventHint });
    return;
  }

  if (parsed.rawIntent === 'diagnose_scoring') {
    const target = diagnoseTargetFromText(trimmed);
    if (target === 'enter_scores') {
      if (scoringBlockers.length === 0) {
        pushAssistant('Scoring looks unblocked. Opening Game Scoring.');
        executeStep('enter_scores');
        return;
      }
      pushAssistant(scoringBlockers.map((b) => b.message).join(' '));
      executeStep(scoringBlockers[0].stepId);
      return;
    }
    const status = statuses.find((s) => s.id === target);
    if (status && !status.available && status.blockedReason) {
      pushAssistant(status.blockedReason);
      executeStep(target);
      return;
    }
    pushAssistant(`Opening “${getNavSkip(target)?.title || target}”.`);
    executeStep(target);
    return;
  }

  if (parsed.rawIntent === 'whats_next') {
    if (liveSession.actionQueue.length) {
      openQueuedHead(
        liveSession,
        `Resuming queue: ${getNavSkip(liveSession.actionQueue[0].stepId)?.title}.`
      );
      return;
    }
    const takeMeThere =
      /take me there|take me to (?:it|that|there)|go (?:there|to it|to that)|do that|yes take me/i.test(
        trimmed
      );
    let targetId: GuideStepId | null =
      (takeMeThere && mentioned) || nextSteps[0]?.id || siblingSteps[0] || null;
    if (!targetId) {
      pushAssistant('You are caught up on the checklist for the current tournament/event.');
      return;
    }
    const missing = listMissingRequiredFills(targetId, liveSession, {
      tournamentId: ctx.tournamentId,
    });
    pushAssistant(`Next up: ${getNavSkip(targetId)?.title || targetId}.`);
    executeStep(targetId, {
      skipCoach: true,
      coachCreate:
        targetId === 'create_tournament' ||
        targetId === 'create_event' ||
        targetId === 'apply_format',
      flashFieldIds: missing.map((m) => m.fieldGuideId),
    });
    return;
  }

  if (parsed.rawIntent === 'skip_side_actions') {
    setSession((s) => markSideActionsSkipped(s));
    pushAssistant('Okay — side actions marked skipped. You can still add them later.');
    return;
  }

  const matchQuery = extractMatchSavedQuery(trimmed);
  if (matchQuery) {
    void eventFormatTemplatesApi.match(matchQuery).then((hits) => {
      if (!hits.length) {
        pushAssistant(
          `I couldn't find a saved format matching “${matchQuery}”. Describe the structure and I'll draft it.`
        );
        return;
      }
      if (hits.length === 1) {
        const h = hits[0];
        setSession((s) =>
          patchStepSlots(s, 'apply_format', {
            matchedTemplateId: h.template_id,
            formatMatchQuery: matchQuery,
          })
        );
        pushAssistant(`Matched “${h.name}”. Opening the format wizard.`);
        executeStep('apply_format', {
          skipCoach: true,
          coachCreate: true,
          prefill: { matchedTemplateId: h.template_id },
        });
        return;
      }
      setSession((s) => ({
        ...s,
        pendingFormatMatch: {
          query: matchQuery,
          candidates: hits.slice(0, 5).map((h) => ({
            templateId: h.template_id,
            name: h.name,
            description: h.description,
          })),
        },
      }));
      const lines = hits
        .slice(0, 5)
        .map((h, i) => `${i + 1}. ${h.name}${h.description ? ` — ${h.description}` : ''}`)
        .join('\n');
      pushAssistant(
        `I found a few saved formats for “${matchQuery}”. Reply with a number:\n${lines}`
      );
    });
    return;
  }

  // Packed multi-action
  if (packed.actions.length >= 1) {
    let nextSession = liveSession;
    for (const action of packed.actions) {
      nextSession = patchStepSlots(nextSession, action.stepId, action.slots);
    }
    nextSession = setActionQueue(nextSession, packed.actions, packed.referenceRange);
    setSession(nextSession);
    if (packed.summary) pushAssistant(packed.summary);
    const notes = packed.actions
      .map((a) => (typeof a.slots.notes === 'string' ? a.slots.notes : null))
      .filter(Boolean);
    if (notes.length) {
      pushAssistant(
        `I'll remember for later (not filled on this form yet): ${notes.join('; ')}.`
      );
    }
    openQueuedHead(nextSession);
    return;
  }

  let targetStep =
    biasStepByPageContext(parsed.stepId, page) || parsed.stepId || liveSession.activeStep;

  if (/^lock\b/i.test(trimmed) && !/side action|sa entries|pots/i.test(trimmed)) {
    if (page.currentStepHint === 'side_actions' || /side action|entries/i.test(trimmed)) {
      targetStep = 'lock_sa_entries';
    } else if (
      page.currentStepHint === 'assign_squads' ||
      page.currentStepHint === 'assign_lanes' ||
      /squad/i.test(trimmed)
    ) {
      targetStep = 'lock_squads';
    }
  }

  // Format structure utterances while on / targeting apply_format
  const formatish =
    targetStep === 'apply_format' ||
    liveSession.activeStep === 'apply_format' ||
    /qualifying|stepladder|bracket|cashers|add\s+(?:a\s+)?round|add\s+(?:an?\s+)?edge|pay\s+top|top\s+\d+|championship/i.test(
      trimmed
    );
  let formatPrefill = { ...parsed.slotPatches };
  if (formatish && !parsed.goBack) {
    const currentDraft = (liveSession.byStep.apply_format?.formatDraft ||
      null) as import('../../constants/defaultEventStructurePayload').EventStructurePayload | null;
    const compiledSlots = slotsFromFormatCompile(trimmed, currentDraft);
    formatPrefill = { ...formatPrefill, ...compiledSlots };
    targetStep = 'apply_format';
    setSession((s) => patchStepSlots(s, 'apply_format', compiledSlots));
    if (typeof compiledSlots.formatCompileSummary === 'string') {
      pushAssistant(compiledSlots.formatCompileSummary);
    }
    if (compiledSlots.formatFinishRequested) {
      pushAssistant(
        'When the draft looks right, click Apply to event in the wizard (or Save format to library first).'
      );
    }
  }

  if (Object.keys(formatPrefill).length > 0 && !formatish) {
    const stepForSlots = targetStep || 'create_tournament';
    setSession((s) =>
      patchStepSlots(s, stepForSlots, formatPrefill, { isCorrection: parsed.isCorrection })
    );
    targetStep = stepForSlots;
  }

  if (parsed.isCorrection && targetStep) {
    setSession((s) => goBackToStep(s, targetStep!));
    pushAssistant(
      `Updated earlier details for “${getNavSkip(targetStep)?.title || targetStep}”. Taking you back there.`
    );
    executeStep(targetStep, { prefill: formatPrefill, skipCoach: true, coachCreate: true });
    return;
  }

  if (targetStep) {
    if (!formatish || !formatPrefill.formatCompileSummary) {
      pushAssistant(
        Object.keys(parsed.slotPatches).length || formatish
          ? 'Got it — opening that step with your details filled in where possible.'
          : `Taking you to “${getNavSkip(targetStep)?.title || targetStep}”.`
      );
    }
    executeStep(targetStep, {
      prefill: formatPrefill,
      skipCoach: true,
      coachCreate:
        targetStep === 'create_tournament' ||
        targetStep === 'create_event' ||
        targetStep === 'apply_format',
    });
    return;
  }

  pushAssistant(
    'Try “Create tournament” or “Create event”, or ask me how to set something up.'
  );
}
