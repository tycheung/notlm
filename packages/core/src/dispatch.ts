import { emitCoachEvent } from './coachEvents.js';
import { filterCandidatesByContext, shortlistStepIds } from './candidateTree.js';
import { resolveDiscourse } from './discourse.js';
import { parseUtterance } from './intents.js';
import { biasStepByPageContext } from './pageContext.js';
import { applyQueueRewrite, detectQueueRewrite } from './queueRewrite.js';
import { handlePendingUtterance } from './dispatchTalk.js';
import { resolveGoBackStep, stepTitle } from './dispatchResolve.js';
import { pickReply } from './replies.js';
import { goBackToStep } from './slots.js';
import { runDraftCompiler } from './draftCompiler.js';
import type { DispatchDeps } from './dispatchDeps.js';
import { launchStep } from './dispatchLaunch.js';
import { dispatchParsed } from './dispatchParsed.js';
import {
  tryDispatchCapabilityCatalog,
  tryHandleContextAsk,
  tryHandleExplainLast,
  tryHandlePendingMutationConfirm,
} from './dispatchCapability.js';
import { phraseLruKey, phraseLruLookup, phraseLruPromote } from './phraseLru.js';
import { activeFlowSteps } from './subgraph.js';
import type { IntentParsePack, ParseUtteranceResult } from './types.js';

export type { DispatchDeps, ParseUtteranceFn } from './dispatchDeps.js';

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

function tryDraftCompilers(live: DispatchDeps): boolean {
  if (!live.draftCompilers) return false;
  const stepId =
    live.session.activeStep ??
    live.session.actionQueue[0]?.stepId ??
    null;
  const candidates = new Set<string>();
  if (stepId) candidates.add(stepId);
  for (const step of live.pack.steps) {
    const nav = live.pack.resolveNav(step.id, live.ctx);
    if (nav?.compilerId) candidates.add(step.id);
  }
  for (const id of candidates) {
    const nav = live.pack.resolveNav(id, live.ctx);
    const run = runDraftCompiler({
      text: live.text,
      stepId: id,
      compilerId: nav?.compilerId,
      draftKey: nav?.draftKey,
      compilers: live.draftCompilers,
      session: live.session,
    });
    if (!run.handled) continue;
    live.setSession(() => run.session);
    if (run.summary) live.pushAssistant(run.summary);
    if (run.missing && run.missing.length > 0) {
      live.pushAssistant(`Still need: ${run.missing.map((m) => m.label).join(', ')}.`);
      live.executeStep(id, { prefill: run.draft, skipCoach: true, coachCreate: true });
      return true;
    }
    if (run.finishRequested && run.draftKey && run.draft) {
      void live.onApplyDraft?.(run.draftKey, run.draft);
      live.pushAssistant('Applying your draft now.');
      return true;
    }
    live.executeStep(id, { prefill: run.draft, skipCoach: true, coachCreate: true });
    return true;
  }
  return false;
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

  const pendingMutation = tryHandlePendingMutationConfirm(live, trimmed);
  if (pendingMutation === true) return;
  if (pendingMutation && typeof (pendingMutation as Promise<unknown>).then === 'function') {
    return (async () => {
      await (pendingMutation as Promise<boolean>);
    })();
  }
  if (tryHandleExplainLast(live, trimmed)) return;
  if (tryHandleContextAsk(live, trimmed)) return;
  const capEarly = tryDispatchCapabilityCatalog(live, trimmed);
  if (capEarly === true) return;
  if (capEarly && typeof (capEarly as Promise<unknown>).then === 'function') {
    return (async () => {
      await (capEarly as Promise<boolean>);
    })();
  }

  const intentPackEarly: IntentParsePack = {
    steps: activeFlowSteps(live.pack, live.session),
    aliases: live.pack.aliases,
    meta: live.pack.meta,
    faq: live.pack.faq,
    normalize: live.pack.normalize,
  };
  const rewrite = detectQueueRewrite(trimmed, intentPackEarly, live.session);
  if (rewrite) {
    const applied = applyQueueRewrite(rewrite, live.session, intentPackEarly);
    live.setSession(() => applied.session);
    live.pushAssistant(applied.message);
    if (applied.executeHead) {
      const head = applied.session.actionQueue[0];
      launchStep(live, applied.executeHead, head?.slots ?? {}, false, {
        skipGate: true,
      });
    }
    return;
  }

  if (tryDraftCompilers(live)) return;

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

  const flowSteps = activeFlowSteps(live.pack, live.session);
  const intentPack: IntentParsePack = {
    steps: flowSteps,
    aliases: live.pack.aliases,
    meta: live.pack.meta,
    faq: live.pack.faq,
    normalize: live.pack.normalize,
  };
  const lruKey = phraseLruKey(parseText, live.ctx.pathname);
  if (live.phraseLru) {
    const cached = phraseLruLookup(live.phraseLru, lruKey);
    if (cached) {
      live.text = parseText;
      dispatchParsed(live, intentPack, applyContextBias(live, cached));
      return;
    }
  }
  const parseFn = live.parseUtteranceFn ?? parseUtterance;
  const shortlist = shortlistStepIds(live.pack, live.ctx, live.session.stale, {
    preferPath: true,
  }).filter((id) => flowSteps.some((s) => s.id === id));
  const parseOpts = {
    pathname: live.ctx.pathname,
    shortlistStepIds: shortlist.length ? shortlist : flowSteps.map((s) => s.id),
    data: live.ctx.data,
  };
  const finish = (parsed: ParseUtteranceResult) => {
    const biased = applyContextBias(live, parsed);
    if (
      live.phraseLru &&
      (biased.stepId || biased.rawIntent === 'faq' || biased.confidence === 'high')
    ) {
      phraseLruPromote(live.phraseLru, lruKey, biased);
    }
    live.text = parseText;
    dispatchParsed(live, intentPack, biased);
  };
  const parsedOrPromise = parseFn(parseText, intentPack, parseOpts);
  if (parsedOrPromise && typeof (parsedOrPromise as Promise<unknown>).then === 'function') {
    return (parsedOrPromise as Promise<ParseUtteranceResult>).then(finish);
  }
  finish(parsedOrPromise as ParseUtteranceResult);
}

function applyContextBias(
  live: DispatchDeps,
  parsed: ParseUtteranceResult
): ParseUtteranceResult {
  const metaSkip = new Set([
    'faq',
    'go_back',
    'whats_next',
    'explain_field',
    'help',
    'cancel_all',
    'do_it',
    'skip_side_actions',
    'lookup_participant',
  ]);
  if (parsed.goBack || (parsed.rawIntent && metaSkip.has(parsed.rawIntent))) {
    return parsed;
  }
  const shortlist = shortlistStepIds(live.pack, live.ctx, live.session.stale, {
    preferPath: true,
  });
  let next = { ...parsed };
  if (next.candidates && next.candidates.length >= 2) {
    const filtered = filterCandidatesByContext(
      next.candidates,
      live.pack,
      live.ctx,
      live.session
    );
    if (filtered.length === 1) {
      next = {
        ...next,
        stepId: filtered[0]!,
        candidates: undefined,
        rawIntent: `goto:${filtered[0]}`,
      };
    } else if (filtered.length >= 2 && filtered.length < next.candidates.length) {
      next = { ...next, candidates: filtered, rawIntent: 'ambiguous' };
    }
  }
  if (!next.stepId && shortlist.length === 1 && next.candidates?.length) {
    const only = shortlist[0]!;
    if (next.candidates.includes(only)) {
      next = {
        ...next,
        stepId: only,
        candidates: undefined,
        rawIntent: `goto:${only}`,
        confidence: next.confidence ?? 'mid',
      };
    }
  } else if (!next.stepId && next.candidates?.length) {
    const biased = biasStepByPageContext(
      null,
      live.ctx.pathname,
      live.pack.steps,
      next.candidates
    );
    if (biased && next.candidates.includes(biased)) {
      next = {
        ...next,
        stepId: biased,
        candidates: undefined,
        rawIntent: `goto:${biased}`,
        confidence: next.confidence ?? 'mid',
      };
    }
  }
  return next;
}
