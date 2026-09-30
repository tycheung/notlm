import { emitCoachEvent } from './coachEvents.js';
import { extractMultiSlotPatches } from './discourse.js';
import { evaluateFlowStatuses, nextAvailableSteps } from './flowStatus.js';
import { dependentStepIds } from './flowGraph.js';
import { matchEntityLookup } from './entityLookup.js';
import { looksLikeNavCommand, matchFaqEntry, matchGlossaryEntry } from './glossary.js';
import { looksLikeSurfaceAsk } from './normalizeConfig.js';
import { packedUtteranceSummary, parsePackedUtterance, composeMixedIntentReply } from './packUtterance.js';
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
import { pushRepairAssistant } from './repairUi.js';
import { goBackToStep, patchStepSlots, setActionQueue } from './slots.js';
import type { DispatchDeps } from './dispatchDeps.js';
import { launchStep } from './dispatchLaunch.js';
import type { IntentParsePack, ParseUtteranceResult } from './types.js';
import { isConceptualQuestion } from './utteranceIntent.js';
import { tryDispatchCapabilityCatalog } from './dispatchCapability.js';

export function dispatchParsed(
  deps: DispatchDeps,
  intentPack: IntentParsePack,
  parsed: ParseUtteranceResult
): void {
  const { pack, session, ctx, pushAssistant, executeStep, setSession, flashField, clickField } =
    deps;
  const trimmed = deps.text.trim();

  // Parsed capability catalog ids (ranker / fallback).
  if (
    parsed.queryId ||
    parsed.mutationId ||
    parsed.tourId ||
    parsed.searchId ||
    parsed.rawIntent === 'data_query' ||
    parsed.rawIntent === 'mutation' ||
    parsed.rawIntent === 'tour' ||
    parsed.rawIntent === 'search'
  ) {
    const cap = tryDispatchCapabilityCatalog(deps, trimmed, {
      queryId: parsed.queryId,
      mutationId: parsed.mutationId,
      tourId: parsed.tourId,
      searchId: parsed.searchId,
    });
    if (cap === true) return;
    if (cap && typeof (cap as Promise<unknown>).then === 'function') {
      void (cap as Promise<boolean>);
      return;
    }
  }

  // First-class FAQ intent from parse (question-shaped catalog hit).
  if (parsed.rawIntent === 'faq' && parsed.faqId) {
    const faqHit =
      (pack.faq ?? []).find((e) => e.id === parsed.faqId) ??
      matchFaqEntry(pack.faq ?? [], trimmed);
    if (faqHit) {
      const offer = faqHit.stepId
        ? ` If you want, I can take you to “${stepTitle(pack, faqHit.stepId)}”.`
        : '';
      const links =
        faqHit.href || faqHit.action
          ? [
              {
                label: faqHit.label ?? 'Learn more',
                href: faqHit.href,
                action: faqHit.action,
              },
            ]
          : undefined;
      pushAssistant(`${faqHit.text}${offer}`, {
        choices: faqHit.stepId ? stepChoices(pack, [faqHit.stepId]) : undefined,
        links,
        intentKey: faqHit.id,
      });
      return;
    }
  }

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
    setSession((s) => {
      const cleared = clearActionQueue(s);
      const flags = { ...cleared.flags };
      delete flags.pendingMutation;
      return {
        ...cleared,
        flags,
        discourse: {
          ...(cleared.discourse ?? {}),
          lastChoiceIds: undefined,
          lastOfferedSteps: undefined,
        },
      };
    });
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

  const packed = parsePackedUtterance(trimmed, intentPack, {
    parseUtteranceFn: deps.parseUtteranceFn,
    pathname: ctx.pathname,
    data: ctx.data,
  });

  if (
    isConceptualQuestion(trimmed) &&
    (packed.actions.length > 0 || packed.oodSegments.length > 0)
  ) {
    emitCoachEvent(deps, {
      type: 'repair',
      kind: 'unknown',
      text: trimmed,
      rawIntent: 'conceptual_question',
      confidence: parsed.confidence,
    });
    pushRepairAssistant(deps, 'unknown', '');
    return;
  }

  // Pure or partial OOD with canned entity-aware refuse.
  if (packed.oodSegments.length > 0) {
    // Conceptual FAQ-style asks must not queue spurious step hits from shared tokens.
    if (isConceptualQuestion(trimmed) && packed.actions.length > 0) {
      emitCoachEvent(deps, {
        type: 'repair',
        kind: 'unknown',
        text: trimmed,
        rawIntent: 'conceptual_question',
        confidence: parsed.confidence,
      });
      pushRepairAssistant(deps, 'unknown', '');
      return;
    }
    const mixed = composeMixedIntentReply(
      packed,
      pack.steps,
      session,
      pack.replies,
      pack.productRole
    );
    if (mixed) {
      if (isConceptualQuestion(trimmed)) {
        emitCoachEvent(deps, {
          type: 'repair',
          kind: 'unknown',
          text: trimmed,
          rawIntent: 'conceptual_question',
          confidence: parsed.confidence,
        });
        pushRepairAssistant(deps, 'unknown', '');
        return;
      }
      setSession(() => mixed.session);
      if (packed.actions.length === 0) {
        pushRepairAssistant(deps, 'unknown', mixed.text);
        emitCoachEvent(deps, {
          type: 'repair',
          kind: 'unknown',
          text: trimmed,
          rawIntent: 'ood',
          confidence: parsed.confidence,
        });
        return;
      }
      // Partial: queue in-DAG actions then tell user about OOD remainder.
      let nextSession = mixed.session;
      let queue = session.actionQueue;
      for (const action of packed.actions) {
        nextSession = patchStepSlots(nextSession, action.stepId, action.slots);
        const merged = mergeActionIntoQueue(queue, action);
        queue = merged.queue;
      }
      nextSession = setActionQueue(nextSession, queue);
      setSession(() => nextSession);
      pushAssistant(mixed.text);
      const head = queue[0];
      if (head) executeStep(head.stepId, { prefill: head.slots });
      return;
    }
  }

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

  // Prefer a confident step hit over entity-list lookup (“open create tournament form”
  // must not be treated as opening a tournament named “create form”).
  const earlyStep =
    packed.actions[0]?.stepId ??
    (parsed.stepId && parsed.confidence !== 'low' ? parsed.stepId : null);
  const preferStepOverLookup =
    Boolean(earlyStep) &&
    (parsed.confidence === 'high' ||
      parsed.confidence === 'mid' ||
      (typeof parsed.rawIntent === 'string' && parsed.rawIntent.startsWith('goto:')));

  if (parsed.rawIntent === 'ambiguous' && parsed.candidates && parsed.candidates.length >= 2) {
    const resolved = resolveKeywordCollision(parsed.candidates, pack, ctx, session);
    if (resolved) {
      launchStep(deps, resolved, parsed.slotPatches, parsed.isCorrection, {
        rawIntent: parsed.rawIntent,
        confidence: parsed.confidence,
      });
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
    pushRepairAssistant(deps, 'ambiguous', picked.text, {
      choices: stepChoices(pack, parsed.candidates),
    });
    emitCoachEvent(deps, {
      type: 'repair',
      kind: 'ambiguous',
      text: trimmed,
      rawIntent: parsed.rawIntent,
      confidence: parsed.confidence,
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
    const faqHit = matchFaqEntry(pack.faq ?? [], trimmed);
    if (faqHit) {
      const offer = faqHit.stepId
        ? ` If you want, I can take you to “${stepTitle(pack, faqHit.stepId)}”.`
        : '';
      pushAssistant(`${faqHit.text}${offer}`, {
        choices: faqHit.stepId ? stepChoices(pack, [faqHit.stepId]) : undefined,
        intentKey: faqHit.id,
      });
      return;
    }
    emitCoachEvent(deps, {
      type: 'repair',
      kind: 'unknown',
      text: trimmed,
      rawIntent: parsed.rawIntent,
      confidence: parsed.confidence,
    });
    pushRepairAssistant(deps, 'unknown', 'Tell me which field you want explained.');
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

  const lookup = preferStepOverLookup
    ? ({ kind: 'none' } as const)
    : matchEntityLookup(trimmed, pack.lookups, ctx, pack.normalize);
  if (lookup.kind === 'hit') {
    const { entity } = lookup;
    const def = pack.lookups?.find((l) => l.id === lookup.lookupId);
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
    const openPath = def?.openPathTemplate?.replace(/\{\{\s*id\s*\}\}/gi, entity.id);
    if (openPath) deps.navigate?.(openPath);
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

  // Question-shaped asks: answer product FAQ (with optional step chip) before navigating.
  // Prefer any FAQ catalog hit over step nav unless this is an explicit nav/create command
  // (compare asks like "tournament vs event" must not fall through to Laya OOD).
  {
    const faqHitEarly = matchFaqEntry(pack.faq ?? [], trimmed);
    if (faqHitEarly && !looksLikeNavCommand(trimmed)) {
      const offer = faqHitEarly.stepId
        ? ` If you want, I can take you to “${stepTitle(pack, faqHitEarly.stepId)}”.`
        : '';
      const links =
        faqHitEarly.href || faqHitEarly.action
          ? [
              {
                label: faqHitEarly.label ?? 'Learn more',
                href: faqHitEarly.href,
                action: faqHitEarly.action,
              },
            ]
          : undefined;
      pushAssistant(`${faqHitEarly.text}${offer}`, {
        choices: faqHitEarly.stepId
          ? stepChoices(pack, [faqHitEarly.stepId])
          : undefined,
        links,
        intentKey: faqHitEarly.id,
      });
      return;
    }
  }

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
    // “the form?” / “what form” while a create/edit step is queued → open that surface.
    const surfaceAsk = looksLikeSurfaceAsk(trimmed, pack.normalize);
    const queuedSurface =
      session.actionQueue[0]?.stepId ?? session.activeStep ?? undefined;
    if (surfaceAsk && queuedSurface) {
      pushAssistant(
        `Opening “${stepTitle(pack, queuedSurface)}” — that’s the form still on your queue.`
      );
      executeStep(queuedSurface, {
        prefill: session.byStep[queuedSurface] ?? session.actionQueue[0]?.slots,
        coachCreate: true,
      });
      return;
    }
    const faqHit = matchFaqEntry(pack.faq ?? [], trimmed);
    if (faqHit) {
      const offer = faqHit.stepId
        ? ` If you want, I can take you to “${stepTitle(pack, faqHit.stepId)}”.`
        : '';
      const links =
        faqHit.href || faqHit.action
          ? [
              {
                label: faqHit.label ?? 'Learn more',
                href: faqHit.href,
                action: faqHit.action,
              },
            ]
          : undefined;
      pushAssistant(`${faqHit.text}${offer}`, {
        choices: faqHit.stepId ? stepChoices(pack, [faqHit.stepId]) : undefined,
        links,
        intentKey: faqHit.id,
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
        pushRepairAssistant(deps, 'unknown', picked.text);
        emitCoachEvent(deps, {
          type: 'repair',
          kind: 'unknown',
          text: trimmed,
          rawIntent: parsed.rawIntent,
          confidence: parsed.confidence,
        });
        return;
      }
    }
    const picked = unintelligiblePrompt(pack, options, session);
    setSession(() => picked.session);
    pushRepairAssistant(deps, 'unknown', picked.text, {
      choices: options.length ? stepChoices(pack, options.map((o) => o.id)) : undefined,
    });
    emitCoachEvent(deps, {
      type: 'repair',
      kind: 'unknown',
      text: trimmed,
      rawIntent: parsed.rawIntent,
      confidence: parsed.confidence,
    });
    return;
  }

  if (
    (parsed.confidence === 'low' || parsed.confidence === 'mid') &&
    !parsed.isCorrection &&
    packed.actions.length < 2 &&
    !(pack.confirm ?? []).includes(targetStep)
  ) {
    if (deps.deferLowConfidenceToFallback) {
      emitCoachEvent(deps, {
        type: 'repair',
        kind: 'low_confidence',
        text: trimmed,
        rawIntent: parsed.rawIntent,
        confidence: parsed.confidence,
      });
      return;
    }
    // Mid with near-tie candidates → chips; otherwise soft Yes/No confirm.
    if (
      parsed.confidence === 'mid' &&
      parsed.candidates &&
      parsed.candidates.length >= 2
    ) {
      const picked = disambiguationPrompt(pack, session, parsed.candidates);
      setSession(() => ({
        ...picked.session,
        discourse: {
          ...(picked.session.discourse ?? {}),
          lastChoiceIds: parsed.candidates,
        },
      }));
      pushRepairAssistant(deps, 'ambiguous', picked.text, {
        choices: stepChoices(pack, parsed.candidates),
      });
      emitCoachEvent(deps, {
        type: 'repair',
        kind: 'ambiguous',
        text: trimmed,
        rawIntent: parsed.rawIntent,
        confidence: parsed.confidence,
      });
      return;
    }
    const picked = lowConfidencePrompt(pack, session, targetStep);
    setSession(() => ({
      ...picked.session,
      pending: { kind: 'confirm', stepId: targetStep, slots: slotPatches },
      discourse: {
        ...(picked.session.discourse ?? {}),
        lastChoiceIds: ['__yes__', '__no__'],
      },
    }));
    pushRepairAssistant(
      deps,
      'low_confidence',
      picked.text,
      {
        choices: [
          { id: '__yes__', label: 'Yes' },
          { id: '__no__', label: 'No' },
        ],
      },
      { includeLowConfidence: true }
    );
    emitCoachEvent(deps, {
      type: 'repair',
      kind: 'low_confidence',
      text: trimmed,
      rawIntent: parsed.rawIntent,
      confidence: parsed.confidence,
    });
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
    launchStep(deps, targetStep, slotPatches, true, {
      rawIntent: parsed.rawIntent,
      confidence: parsed.confidence,
    });
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
      launchStep(deps, targetStep, slotPatches, false, {
        skipGate: true,
        rawIntent: parsed.rawIntent,
        confidence: parsed.confidence,
      });
      return;
    }
    const { queue, wasHead } = mergeActionIntoQueue(session.actionQueue, action);
    let next = patchStepSlots(session, targetStep, slotPatches);
    next = setActionQueue(next, queue);
    setSession(() => next);
    if (wasHead) {
      // Re-ask current head → reopen (coach-create / modal).
      launchStep(deps, targetStep, slotPatches, false, {
        rawIntent: parsed.rawIntent,
        confidence: parsed.confidence,
      });
      return;
    }
    pushAssistant(
      `Added to the plan. ${describeQueue(queue, (id) => stepTitle(pack, id))}`
    );
    return;
  }

  launchStep(deps, targetStep, slotPatches, false, {
    rawIntent: parsed.rawIntent,
    confidence: parsed.confidence,
  });
}
