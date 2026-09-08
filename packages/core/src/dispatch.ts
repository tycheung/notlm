import { evaluateFlowStatuses, nextAvailableSteps } from './flowStatus.js';
import { matchFaqEntry, matchGlossaryEntry } from './glossary.js';
import { parseUtterance } from './intents.js';
import { packedUtteranceSummary, parsePackedUtterance } from './packUtterance.js';
import { pathMatchesStep } from './pageContext.js';
import {
  formatBlockedQueueMessage,
  injectBeforeDeferred,
  listMissingRequires,
  planResumeQueue,
} from './queueAdvance.js';
import { goBackToStep, patchStepSlots, setActionQueue } from './slots.js';
import type {
  ChatChoice,
  GuideAction,
  IntentParsePack,
  LoadedPack,
  ParseUtteranceResult,
  SessionSlots,
  StepId,
  StepStatus,
} from './types.js';

export type ParseUtteranceFn = (
  text: string,
  pack: IntentParsePack
) => ParseUtteranceResult | Promise<ParseUtteranceResult>;

export type DispatchDeps = {
  text: string;
  pack: LoadedPack;
  session: SessionSlots;
  ctx: { pathname: string; data: Record<string, unknown> };
  pushAssistant: (text: string, opts?: { choices?: ChatChoice[] }) => void;
  executeStep: (stepId: StepId, opts?: Record<string, unknown>) => void;
  setSession: (updater: (session: SessionSlots) => SessionSlots) => void;
  /** Optional: flash a glossary field guide id (DOM). */
  flashField?: (guideId: string) => void;
  /**
   * Optional utterance parser (e.g. ONNX/JSON ranker hybrid).
   * Defaults to rule-based parseUtterance.
   */
  parseUtteranceFn?: ParseUtteranceFn;
};

const MAX_SUGGESTED_NEXT = 4;

function stepTitle(pack: LoadedPack, stepId: StepId): string {
  return pack.steps.find((s) => s.id === stepId)?.title ?? stepId;
}

function stepChoices(pack: LoadedPack, stepIds: StepId[]): ChatChoice[] {
  return stepIds.map((id) => ({ id, label: stepTitle(pack, id) }));
}

function resolveGoBackStep(session: SessionSlots): StepId | null {
  const hist = session.history;
  if (session.activeStep && hist.length >= 2) {
    const idx = hist.lastIndexOf(session.activeStep);
    if (idx > 0) return hist[idx - 1] ?? null;
  }
  return hist.length >= 2 ? (hist[hist.length - 2] ?? null) : null;
}

/** Prefer pathname, then a single available incomplete step among near-ties. */
function resolveKeywordCollision(
  candidates: StepId[],
  pack: LoadedPack,
  ctx: { pathname: string; data: Record<string, unknown> },
  session: SessionSlots
): StepId | null {
  if (candidates.length <= 1) return candidates[0] ?? null;

  const pathHits = candidates.filter((id) => pathMatchesStep(ctx.pathname, id));
  if (pathHits.length === 1) return pathHits[0] ?? null;

  const statuses = evaluateFlowStatuses(pack, ctx, session.stale);
  const byId = new Map(statuses.map((s) => [s.id, s]));

  const availableIncomplete = candidates.filter((id) => {
    const s = byId.get(id);
    return Boolean(s?.available && !s.complete);
  });
  if (availableIncomplete.length === 1) return availableIncomplete[0] ?? null;

  const available = candidates.filter((id) => byId.get(id)?.available);
  if (available.length === 1) return available[0] ?? null;

  return null;
}

function disambiguationPrompt(pack: LoadedPack, candidates: StepId[]): string {
  const labels = candidates.map((id) => `“${stepTitle(pack, id)}”`);
  if (labels.length === 2) {
    return `That could mean ${labels[0]} or ${labels[1]}. Which one did you mean?`;
  }
  return `That could mean several things. Which one: ${labels.join(', ')}?`;
}

/** Next incomplete available steps, path-relevant first, capped for chat. */
function suggestNextStepOptions(
  pack: LoadedPack,
  ctx: { pathname: string; data: Record<string, unknown> },
  session: SessionSlots
): StepStatus[] {
  const statuses = evaluateFlowStatuses(pack, ctx, session.stale);
  const next = nextAvailableSteps(statuses);
  return [...next]
    .sort((a, b) => {
      const ap = pathMatchesStep(ctx.pathname, a.id) ? 0 : 1;
      const bp = pathMatchesStep(ctx.pathname, b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return 0;
    })
    .slice(0, MAX_SUGGESTED_NEXT);
}

function unintelligiblePrompt(
  pack: LoadedPack,
  options: StepStatus[],
  session: SessionSlots
): string {
  if (session.actionQueue.length > 0) {
    const head = session.actionQueue[0]!;
    return (
      `I didn’t catch that. You still have “${stepTitle(pack, head.stepId)}” queued — ` +
      `say “what’s next” to resume, or name a checklist step.`
    );
  }
  if (options.length === 0) {
    return (
      `I didn’t catch that — and you’re caught up on the checklist. ` +
      `Try naming a step if you want to revisit one.`
    );
  }
  const labels = options.map((s) => `“${s.title}”`);
  if (labels.length === 1) {
    return (
      `I didn’t catch that. From where you are, next up looks like ${labels[0]} — ` +
      `say that name if you want to go there.`
    );
  }
  return (
    `I didn’t catch that. From where you are, next up could be: ${labels.join(', ')}. Which one?`
  );
}

function launchStep(
  deps: DispatchDeps,
  targetStep: StepId,
  slots: Record<string, unknown>,
  isCorrection: boolean
): void {
  const { pack, session, ctx, pushAssistant, executeStep, setSession } = deps;
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
      setSession(() => next);
      if (injected.message) pushAssistant(injected.message);
      executeStep(targetStep, { prefill: slots, skipCoach: true });
      return;
    }
  }

  if (Object.keys(slots).length > 0) {
    setSession((s) => patchStepSlots(s, targetStep, slots, { isCorrection }));
  }
  if (isCorrection) {
    setSession((s) => goBackToStep(s, targetStep, []));
    pushAssistant(`Updated details for “${stepTitle(pack, targetStep)}”. Taking you back there.`);
  } else {
    pushAssistant(`Taking you to “${stepTitle(pack, targetStep)}”.`);
  }
  executeStep(targetStep, { prefill: slots, skipCoach: true });
}

export function dispatchUserUtterance(deps: DispatchDeps): void | Promise<void> {
  const trimmed = deps.text.trim();
  if (!trimmed) return;

  const intentPack: IntentParsePack = {
    steps: deps.pack.steps,
    aliases: deps.pack.aliases,
    meta: deps.pack.meta,
  };
  const parseFn = deps.parseUtteranceFn ?? parseUtterance;
  const parsedOrPromise = parseFn(trimmed, intentPack);
  if (parsedOrPromise && typeof (parsedOrPromise as Promise<unknown>).then === 'function') {
    return (parsedOrPromise as Promise<ParseUtteranceResult>).then((parsed) => {
      dispatchParsed(deps, intentPack, parsed);
    });
  }
  dispatchParsed(deps, intentPack, parsedOrPromise as ParseUtteranceResult);
}

function dispatchParsed(
  deps: DispatchDeps,
  intentPack: IntentParsePack,
  parsed: ParseUtteranceResult
): void {
  const { pack, session, ctx, pushAssistant, executeStep, setSession, flashField } = deps;
  const trimmed = deps.text.trim();

  if (parsed.goBack || parsed.rawIntent === 'go_back') {
    const prevStep = resolveGoBackStep(session);
    if (!prevStep) {
      pushAssistant('There is no earlier step to go back to yet.');
      return;
    }
    setSession((s) => goBackToStep(s, prevStep, []));
    pushAssistant(`Going back to “${stepTitle(pack, prevStep)}”.`);
    executeStep(prevStep);
    return;
  }

  const packed = parsePackedUtterance(trimmed, intentPack);
  if (packed.actions.length >= 2) {
    let nextSession = session;
    for (const action of packed.actions) {
      nextSession = patchStepSlots(nextSession, action.stepId, action.slots);
    }
    nextSession = setActionQueue(nextSession, packed.actions);
    setSession(() => nextSession);
    const summary = packedUtteranceSummary(packed.actions, pack.steps);
    if (summary) pushAssistant(summary);
    executeStep(packed.actions[0]!.stepId, { prefill: packed.actions[0]!.slots });
    return;
  }

  if (parsed.rawIntent === 'ambiguous' && parsed.candidates && parsed.candidates.length >= 2) {
    const resolved = resolveKeywordCollision(parsed.candidates, pack, ctx, session);
    if (resolved) {
      launchStep(deps, resolved, parsed.slotPatches, parsed.isCorrection);
      return;
    }
    pushAssistant(disambiguationPrompt(pack, parsed.candidates), {
      choices: stepChoices(pack, parsed.candidates),
    });
    return;
  }

  if (parsed.rawIntent === 'whats_next') {
    if (session.actionQueue.length > 0) {
      const planned = planResumeQueue(pack, session, ctx, { announceContinue: true });
      for (const msg of planned.messages) pushAssistant(msg);
      if (planned.executeNext) {
        executeStep(planned.executeNext.stepId, { prefill: planned.executeNext.slots });
      }
      return;
    }
    const statuses = evaluateFlowStatuses(pack, ctx, session.stale);
    const next = nextAvailableSteps(statuses)[0];
    if (!next) {
      pushAssistant('You are caught up on the checklist.');
      return;
    }
    pushAssistant(`Next up: ${next.title}.`);
    executeStep(next.id);
    return;
  }

  if (parsed.rawIntent === 'explain_field') {
    const hit = matchGlossaryEntry(pack.glossary ?? [], trimmed);
    if (hit) {
      pushAssistant(hit.text);
      if (hit.guideId) flashField?.(hit.guideId);
      return;
    }
    pushAssistant('Tell me which field you want explained.');
    return;
  }

  const singleAction = packed.actions[0];
  const targetStep = singleAction?.stepId ?? parsed.stepId;

  if (!targetStep) {
    const faqHit = matchFaqEntry(pack.faq ?? [], trimmed);
    if (faqHit) {
      const offer = faqHit.stepId
        ? ` If you want, I can take you to “${stepTitle(pack, faqHit.stepId)}”.`
        : '';
      pushAssistant(`${faqHit.text}${offer}`, {
        choices: faqHit.stepId ? stepChoices(pack, [faqHit.stepId]) : undefined,
      });
      return;
    }
    const options = suggestNextStepOptions(pack, ctx, session);
    if (session.actionQueue.length > 0) {
      const head = session.actionQueue[0]!;
      const missing = listMissingRequires(pack, head.stepId, ctx, session.stale);
      if (missing.length > 0) {
        pushAssistant(
          `I didn’t catch that. ${formatBlockedQueueMessage(pack, head.stepId, missing)}`
        );
        return;
      }
    }
    pushAssistant(unintelligiblePrompt(pack, options, session), {
      choices: options.length ? stepChoices(pack, options.map((o) => o.id)) : undefined,
    });
    return;
  }

  launchStep(deps, targetStep, singleAction?.slots ?? parsed.slotPatches, parsed.isCorrection);
}
