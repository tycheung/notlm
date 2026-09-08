import { evaluateFlowStatuses, nextAvailableSteps } from './flowStatus.js';
import { parseUtterance } from './intents.js';
import { biasStepByPageContext } from './pageContext.js';
import { packedUtteranceSummary, parsePackedUtterance } from './packUtterance.js';
import { goBackToStep, patchStepSlots, setActionQueue } from './slots.js';
import type { LoadedPack, SessionSlots, StepId } from './types.js';

export type DispatchDeps = {
  text: string;
  pack: LoadedPack;
  session: SessionSlots;
  ctx: { pathname: string; data: Record<string, unknown> };
  pushAssistant: (text: string) => void;
  executeStep: (stepId: StepId, opts?: Record<string, unknown>) => void;
  setSession: (updater: (session: SessionSlots) => SessionSlots) => void;
};

function stepTitle(pack: LoadedPack, stepId: StepId): string {
  return pack.steps.find((s) => s.id === stepId)?.title ?? stepId;
}

function resolveGoBackStep(session: SessionSlots): StepId | null {
  const hist = session.history;
  if (session.activeStep && hist.length >= 2) {
    const idx = hist.lastIndexOf(session.activeStep);
    if (idx > 0) return hist[idx - 1] ?? null;
  }
  return hist.length >= 2 ? (hist[hist.length - 2] ?? null) : null;
}

export function dispatchUserUtterance(deps: DispatchDeps): void {
  const { text, pack, session, ctx, pushAssistant, executeStep, setSession } = deps;
  const trimmed = text.trim();
  if (!trimmed) return;

  const intentPack = { steps: pack.steps, aliases: pack.aliases, meta: pack.meta };
  const parsed = parseUtterance(trimmed, intentPack);

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

  if (parsed.rawIntent === 'whats_next') {
    if (session.actionQueue.length > 0) {
      const head = session.actionQueue[0]!;
      pushAssistant(`Resuming queue: ${stepTitle(pack, head.stepId)}.`);
      executeStep(head.stepId, { prefill: head.slots });
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
    pushAssistant('Tell me which field you want explained.');
    return;
  }

  const singleAction = packed.actions[0];
  const targetStep = biasStepByPageContext(
    singleAction?.stepId ?? parsed.stepId,
    ctx.pathname,
    pack.steps
  );

  if (!targetStep) {
    pushAssistant('Try naming a checklist step, or ask “what’s next”.');
    return;
  }

  const slots = singleAction?.slots ?? parsed.slotPatches;
  if (Object.keys(slots).length > 0) {
    setSession((s) => patchStepSlots(s, targetStep, slots, { isCorrection: parsed.isCorrection }));
  }
  if (parsed.isCorrection) {
    setSession((s) => goBackToStep(s, targetStep, []));
    pushAssistant(`Updated details for “${stepTitle(pack, targetStep)}”. Taking you back there.`);
  } else {
    pushAssistant(`Taking you to “${stepTitle(pack, targetStep)}”.`);
  }
  executeStep(targetStep, { prefill: slots, skipCoach: true });
}
