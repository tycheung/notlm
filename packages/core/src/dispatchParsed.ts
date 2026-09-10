import { emitCoachEvent } from './coachEvents.js';
import { extractMultiSlotPatches } from './discourse.js';
import { evaluateFlowStatuses, nextAvailableSteps } from './flowStatus.js';
import { dependentStepIds } from './flowGraph.js';
import { matchEntityLookup } from './entityLookup.js';
import { matchFaqEntry, matchGlossaryEntry } from './glossary.js';
import { packedUtteranceSummary, parsePackedUtterance } from './packUtterance.js';
import {
  formatBlockedQueueMessage,
  injectBeforeDeferred,
  listMissingRequires,
  planResumeQueue,
} from './queueAdvance.js';
import {
  clearActionQueue,
  describeQueue,
  mergeActionIntoQueue,
  patchQueuedStepSlots,
} from './queueOps.js';
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
import type { DispatchDeps } from './dispatchDeps.js';
import { launchStep } from './dispatchLaunch.js';
import type { IntentParsePack, ParseUtteranceResult } from './types.js';

export function dispatchParsed(
  deps: DispatchDeps,
  intentPack: IntentParsePack,
  parsed: ParseUtteranceResult
): void {
  const { pack, session, ctx, pushAssistant, executeStep, setSession, flashField, clickField } =
    deps;
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

  if (parsed.rawIntent === 'cancel_all') {
    setSession(() => clearActionQueue(session));
    pushAssistant('Cleared the queue.');
    return;
  }

  if (parsed.rawIntent === 'do_it') {
    const head = session.actionQueue[0]?.stepId ?? session.activeStep;
    if (!head) {
      pushAssistant('Nothing in progress to activate — name a step first.');
      return;
    }
    launchStep(deps, head, session.byStep[head] ?? {}, false, { skipGate: true });
    return;
  }

  const packed = parsePackedUtterance(trimmed, intentPack);
  if (packed.actions.length >= 2) {
    let nextSession = session;
    let queue = session.actionQueue;
    for (const action of packed.actions) {
      nextSession = patchStepSlots(nextSession, action.stepId, action.slots);
      const merged = mergeActionIntoQueue(queue, action);
      queue = merged.queue;
    }
    nextSession = setActionQueue(nextSession, queue);
    setSession(() => nextSession);
    const summary = packedUtteranceSummary(queue, pack.steps);
    if (summary) pushAssistant(summary);
    const head = queue[0]!;
    executeStep(head.stepId, { prefill: head.slots });
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
    if (entity.guideId) {
      flashField?.(entity.guideId);
      clickField?.(entity.guideId);
    }
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
  const slotPatches = singleAction?.slots ?? parsed.slotPatches;

  // In-form / active coach-create fill: value-like utterance with no strong new step.
  if (!targetStep || (parsed.confidence === 'low' && session.activeStep)) {
    const fillStep =
      session.actionQueue[0]?.stepId ?? session.activeStep ?? undefined;
    if (fillStep && pack.slots?.[fillStep]) {
      const keys = pack.slots[fillStep]!.map((d) => d.key);
      const multi = extractMultiSlotPatches(trimmed, keys);
      if (Object.keys(multi).length > 0) {
        let next = patchStepSlots(session, fillStep, multi);
        next = patchQueuedStepSlots(next, fillStep, multi);
        setSession(() => next);
        pushAssistant(`Updated details for “${stepTitle(pack, fillStep)}”.`);
        executeStep(fillStep, {
          prefill: { ...(next.byStep[fillStep] ?? {}), ...multi },
          skipCoach: true,
          coachCreate: true,
        });
        return;
      }
    }
  }

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
      pending: { kind: 'confirm', stepId: targetStep, slots: slotPatches },
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

  // Corrections: patch queued step slots (and byStep) without destroying the plan.
  if (parsed.isCorrection) {
    let next = patchStepSlots(session, targetStep, slotPatches, {
      isCorrection: true,
      staleDependents: dependentStepIds(pack.steps, targetStep),
    });
    next = patchQueuedStepSlots(next, targetStep, slotPatches);
    setSession(() => next);
    launchStep(deps, targetStep, slotPatches, true);
    return;
  }

  // Head-stable merge when a queue is already active.
  if (session.actionQueue.length > 0) {
    const action = {
      stepId: targetStep,
      slots: slotPatches,
      rawSegment: trimmed,
    };
    // Unblocking a deferred queued step may insert ahead of the head.
    const injected = injectBeforeDeferred(pack, session, ctx, action);
    if (injected.injected) {
      let next = patchStepSlots(injected.session, targetStep, slotPatches);
      next = {
        ...next,
        discourse: { ...(next.discourse ?? {}), lastStepId: targetStep },
      };
      setSession(() => next);
      if (injected.message) pushAssistant(injected.message);
      launchStep(deps, targetStep, slotPatches, false, { skipGate: true });
      return;
    }
    const { queue, wasHead } = mergeActionIntoQueue(session.actionQueue, action);
    let next = patchStepSlots(session, targetStep, slotPatches);
    next = setActionQueue(next, queue);
    setSession(() => next);
    if (wasHead) {
      // Re-ask current head → reopen (coach-create / modal).
      launchStep(deps, targetStep, slotPatches, false);
      return;
    }
    pushAssistant(
      `Added to the plan. ${describeQueue(queue, (id) => stepTitle(pack, id))}`
    );
    return;
  }

  launchStep(deps, targetStep, slotPatches, false);
}
