/**
 * Settle catalog QueryAnswer side-effects under ADR-011 plane gates.
 */
import type { QueryAnswer } from './capabilityCatalog.js';
import type { DispatchDeps } from './dispatchDeps.js';
import { resolveDispatchPlane } from './dispatchPlane.js';
import { stepTitle } from './dispatchResolve.js';
import { askModeInstructCopy } from './interactionMode.js';

function surfaceStepFromMutationSlots(
  slots: Record<string, unknown> | undefined
): string | undefined {
  if (!slots) return undefined;
  for (const key of ['tournamentName', 'centerName', 'tournamentId', 'centerId']) {
    const v = slots[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

export function pushCatalogAnswer(deps: DispatchDeps, answer: QueryAnswer): void {
  // Plane must be inferred from the *user* utterance, not assistant copy.
  const planeCtx = resolveDispatchPlane({
    session: deps.session,
    features: deps.features,
    pack: deps.pack,
    text: String(deps.text ?? '').trim() || String(answer.text ?? ''),
  });
  const mode = planeCtx.mode;
  const blockNav = planeCtx.blockNav;
  const blockMutate = planeCtx.blockMutate;
  const hasText = String(answer.text ?? '').trim().length > 0;
  const hasChips =
    (answer.choices?.length ?? 0) > 0 || (answer.links?.length ?? 0) > 0;
  const willNav =
    answer.navigatePath != null && answer.autoNavigate === true && !blockNav;
  const willStep =
    answer.stepId != null && answer.autoStartStep !== false && !blockNav;
  const forceOpenSurface =
    !blockMutate &&
    typeof answer.slots?.forceOpenSurface === 'string'
      ? answer.slots.forceOpenSurface
      : undefined;
  if (blockMutate && typeof answer.slots?.forceOpenSurface === 'string') {
    const copy = askModeInstructCopy(mode);
    if (copy && !hasText) {
      deps.pushAssistant(copy);
      return;
    }
  }
  if (hasText || hasChips) {
    let textOut = answer.text;
    // Never claim “Opening…” when Ask/plane gates block the actual navigate.
    if (
      blockNav &&
      !willNav &&
      !willStep &&
      (answer.navigatePath || answer.stepId) &&
      /^Opening\b/i.test(String(textOut ?? '').trim())
    ) {
      const copy = askModeInstructCopy(mode);
      if (copy) textOut = copy;
    }
    deps.pushAssistant(textOut, {
      choices: answer.choices,
      links: answer.links,
    });
  } else if (willNav || willStep) {
    deps.pushAssistant(
      willStep
        ? `Opening “${stepTitle(deps.pack, answer.stepId!)}”.`
        : 'Opening…'
    );
  } else if (forceOpenSurface) {
    deps.pushAssistant('Opening…');
  } else if (blockNav && (answer.navigatePath || answer.stepId)) {
    const copy = askModeInstructCopy(mode);
    if (copy) deps.pushAssistant(copy);
  }
  if (willNav) {
    deps.navigate?.(answer.navigatePath!);
  }
  if (willStep) {
    const prefill = answer.slots
      ? Object.fromEntries(
          Object.entries(answer.slots).filter(([k]) => k !== 'forceOpenSurface')
        )
      : undefined;
    const surfaceStep = surfaceStepFromMutationSlots(
      answer.slots as Record<string, unknown> | undefined
    );
    deps.executeStep(answer.stepId!, {
      skipCoach: true,
      ...(prefill && Object.keys(prefill).length ? { prefill } : {}),
      ...(forceOpenSurface
        ? {
            forceOpenSurface,
            ...(surfaceStep !== undefined ? { forceSurfaceStep: surfaceStep } : {}),
          }
        : {}),
    });
  } else if (forceOpenSurface && deps.openSurface) {
    deps.openSurface(
      forceOpenSurface,
      surfaceStepFromMutationSlots(answer.slots as Record<string, unknown> | undefined)
    );
  }
}

export function recordCoachAction(
  deps: DispatchDeps,
  action: { kind: string; id: string; summary: string }
): void {
  deps.setSession((s) => ({
    ...s,
    discourse: {
      ...(s.discourse ?? {}),
      lastCoachAction: action,
    },
    flags: {
      ...s.flags,
      lastCoachActions: [
        action,
        ...((Array.isArray(s.flags.lastCoachActions)
          ? s.flags.lastCoachActions
          : []) as unknown[]),
      ].slice(0, 8),
    },
  }));
}

export async function settleCatalogAnswer(
  deps: DispatchDeps,
  pending: QueryAnswer | null | Promise<QueryAnswer | null>
): Promise<boolean> {
  const answer = await Promise.resolve(pending);
  if (!answer) return false;
  const hasText = String(answer.text ?? '').trim().length > 0;
  const forceOpenSurface =
    typeof answer.slots?.forceOpenSurface === 'string'
      ? answer.slots.forceOpenSurface
      : undefined;
  const hasUi =
    (answer.choices?.length ?? 0) > 0 ||
    (answer.links?.length ?? 0) > 0 ||
    (answer.navigatePath != null && answer.autoNavigate === true) ||
    (answer.stepId != null && answer.autoStartStep !== false) ||
    Boolean(forceOpenSurface && deps.openSurface);
  if (!hasText && !hasUi) return false;
  pushCatalogAnswer(deps, answer);
  return true;
}
