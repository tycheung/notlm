import { emitCoachEvent } from './coachEvents.js';
import { resolveDiscourse } from './discourse.js';
import { evaluateFlowStatuses, nextAvailableSteps } from './flowStatus.js';
import { dependentStepIds } from './flowGraph.js';
import { matchEntityLookup } from './entityLookup.js';
import { matchFaqEntry, matchGlossaryEntry } from './glossary.js';
import { parseUtterance } from './intents.js';
import { packedUtteranceSummary, parsePackedUtterance } from './packUtterance.js';
import {
  formatBlockedQueueMessage,
  injectBeforeDeferred,
  listMissingRequires,
  planResumeQueue,
} from './queueAdvance.js';
import { gateBeforeLaunch, handlePendingUtterance } from './dispatchTalk.js';
import {
  disambiguationPrompt,
  lowConfidencePrompt,
  resolveGoBackStep,
  resolveKeywordCollision,
  stepChoices,
  stepTitle,
  suggestNextStepOptions,
  unintelligiblePrompt,
} from './dispatchResolve.js';
import { pickReply } from './replies.js';
import { goBackToStep, patchStepSlots, setActionQueue } from './slots.js';
import type {
  ChatChoice,
  CoachEvent,
  GuideAction,
  IntentParsePack,
  LoadedPack,
  ParseUtteranceResult,
  SessionSlots,
  StepId,
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
  /** Optional structured telemetry (no secrets). */
  onCoachEvent?: (event: CoachEvent) => void;
};

function trackSession(deps: DispatchDeps): DispatchDeps {
  const tracked: DispatchDeps = {
    ...deps,
    session: deps.session,
    setSession: (updater) => {
      tracked.session = updater(tracked.session);
      deps.setSession(() => tracked.session);
    },
  };
  return tracked;
}

function launchStep(
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
  executeStep(targetStep, { prefill: slots, skipCoach: true });
}

export function dispatchUserUtterance(deps: DispatchDeps): void | Promise<void> {
  const trimmed = deps.text.trim();
  if (!trimmed) return;

  const live = trackSession(deps);
  emitCoachEvent(live, { type: 'utterance', textLength: trimmed.length });

  const sink = { pushAssistant: live.pushAssistant, setSession: live.setSession };
  const pendingResult = handlePendingUtterance(
    live.pack,
    live.session,
    trimmed,
    sink
  );
  if (pendingResult.handled) {
    if (pendingResult.launch) {
      launchStep(
        live,
        pendingResult.launch.stepId,
        pendingResult.launch.slots,
        false,
        { skipGate: true }
      );
    }
    return;
  }

  const discourse = resolveDiscourse(trimmed, live.session.discourse);
  if (discourse.kind === 'undo') {
    const prev = resolveGoBackStep(live.session);
    if (!prev) {
      live.pushAssistant('Nothing to undo yet.');
      return;
    }
    live.setSession((s) => goBackToStep(s, prev, []));
    live.pushAssistant(`Okay — back to “${stepTitle(live.pack, prev)}”.`);
    live.executeStep(prev);
    return;
  }
  if (discourse.kind === 'repair_slot') {
    const stepId = live.session.discourse?.lastStepId;
    if (!stepId) {
      live.pushAssistant('Tell me which step to update first.');
      return;
    }
    const slots = discourse.slotHint ? { name: discourse.slotHint } : {};
    if (discourse.slotHint) {
      launchStep(live, stepId, slots, true);
      return;
    }
    live.setSession((s) => ({
      ...s,
      pending: {
        kind: 'ask_slot',
        stepId,
        slotKey: 'name',
        slots: { ...(s.byStep[stepId] ?? {}) },
      },
    }));
    const picked = pickReply(live.session, live.pack.replies, 'ask_slot', {
      prompt: 'What should the new name be?',
      title: stepTitle(live.pack, stepId),
      stepId,
    });
    live.setSession((s) => ({ ...picked.session, pending: s.pending }));
    live.pushAssistant(picked.text);
    emitCoachEvent(live, { type: 'slot_ask', stepId, slotKey: 'name' });
    return;
  }
  if (discourse.kind === 'step') {
    launchStep(live, discourse.stepId, {}, false);
    return;
  }
  const parseText = discourse.kind === 'entity' ? discourse.text : trimmed;

  const intentPack: IntentParsePack = {
    steps: live.pack.steps,
    aliases: live.pack.aliases,
    meta: live.pack.meta,
  };
  const parseFn = live.parseUtteranceFn ?? parseUtterance;
  const parsedOrPromise = parseFn(parseText, intentPack);
  if (parsedOrPromise && typeof (parsedOrPromise as Promise<unknown>).then === 'function') {
    return (parsedOrPromise as Promise<ParseUtteranceResult>).then((parsed) => {
      live.text = parseText;
      dispatchParsed(live, intentPack, parsed);
    });
  }
  live.text = parseText;
  dispatchParsed(live, intentPack, parsedOrPromise as ParseUtteranceResult);
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
    const picked = disambiguationPrompt(pack, session, parsed.candidates);
    setSession(() => ({
      ...picked.session,
      discourse: {
        ...(picked.session.discourse ?? {}),
        lastChoiceIds: parsed.candidates,
      },
    }));
    pushAssistant(picked.text, { choices: stepChoices(pack, parsed.candidates) });
    emitCoachEvent(deps, { type: 'repair', kind: 'ambiguous' });
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

  if (parsed.rawIntent === 'help') {
    const options = suggestNextStepOptions(pack, ctx, session);
    if (options.length === 0) {
      pushAssistant(
        'I guide you through this app’s annotated steps. You’re caught up right now — ask again after something changes.'
      );
      return;
    }
    const labels = options.map((s) => `“${s.title}”`).join(', ');
    pushAssistant(
      `I can help with the steps available now: ${labels}. Pick one, or ask what’s next.`,
      { choices: stepChoices(pack, options.map((o) => o.id)) }
    );
    return;
  }

  const lookup = matchEntityLookup(trimmed, pack.lookups, ctx);
  if (lookup.kind === 'hit') {
    const { entity } = lookup;
    pushAssistant(`Found “${entity.name}”.`);
    setSession((s) => ({
      ...s,
      discourse: {
        ...(s.discourse ?? {}),
        lastEntityId: entity.id,
        lastEntityName: entity.name,
        lastStepId: entity.stepId ?? s.discourse?.lastStepId,
      },
    }));
    if (entity.guideId) flashField?.(entity.guideId);
    if (entity.stepId) executeStep(entity.stepId);
    return;
  }
  if (lookup.kind === 'ambiguous') {
    pushAssistant(`I found a few matches for “${lookup.query}”. Which one did you mean?`, {
      choices: lookup.candidates.map((c) => ({
        id: c.guideId ?? c.id,
        label: c.name,
      })),
    });
    setSession((s) => ({
      ...s,
      discourse: {
        ...(s.discourse ?? {}),
        lastChoiceIds: lookup.candidates.map((c) => c.guideId ?? c.id),
        lastEntityName: lookup.candidates[0]?.name,
      },
    }));
    return;
  }
  if (lookup.kind === 'miss') {
    pushAssistant(
      lookup.query
        ? `I couldn’t find “${lookup.query}” in the current list.`
        : 'Tell me which item to open (for example: show me the Shopping list).'
    );
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
        const message = `I didn’t catch that. ${formatBlockedQueueMessage(pack, head.stepId, missing)}`;
        const picked = pickReply(session, pack.replies, 'repair.unknown', { message });
        setSession(() => picked.session);
        pushAssistant(picked.text);
        emitCoachEvent(deps, { type: 'repair', kind: 'unknown' });
        return;
      }
    }
    const picked = unintelligiblePrompt(pack, options, session);
    setSession(() => picked.session);
    pushAssistant(picked.text, {
      choices: options.length ? stepChoices(pack, options.map((o) => o.id)) : undefined,
    });
    emitCoachEvent(deps, { type: 'repair', kind: 'unknown' });
    return;
  }

  if (
    parsed.confidence === 'low' &&
    !parsed.isCorrection &&
    packed.actions.length < 2 &&
    !(pack.confirm ?? []).includes(targetStep)
  ) {
    const picked = lowConfidencePrompt(pack, session, targetStep);
    setSession(() => ({
      ...picked.session,
      pending: { kind: 'confirm', stepId: targetStep, slots: parsed.slotPatches },
      discourse: {
        ...(picked.session.discourse ?? {}),
        lastChoiceIds: ['__yes__', '__no__'],
      },
    }));
    pushAssistant(picked.text, {
      choices: [
        { id: '__yes__', label: 'Yes' },
        { id: '__no__', label: 'No' },
      ],
    });
    emitCoachEvent(deps, { type: 'repair', kind: 'low_confidence' });
    emitCoachEvent(deps, { type: 'confirm_ask', stepId: targetStep });
    return;
  }

  launchStep(deps, targetStep, singleAction?.slots ?? parsed.slotPatches, parsed.isCorrection);
}
