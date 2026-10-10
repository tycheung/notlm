import type { MissKind } from './missLog.js';
import { isDecisionFallbackMissKind } from './missLog.js';
import type { DispatchDeps } from './dispatchDeps.js';

/** When true, skip canned repair bubbles; decision fallback shows Thinking… instead. */
export type DecisionFallbackUiPolicy = {
  deferDecisionFallbackUi?: boolean;
  /** Skip Yes/No on low confidence and invoke Laya→LLM instead. */
  deferLowConfidenceToFallback?: boolean;
};

export function shouldDeferRepairUi(
  kind: MissKind,
  deps: DecisionFallbackUiPolicy | undefined,
  opts?: { includeLowConfidence?: boolean }
): boolean {
  if (!deps?.deferDecisionFallbackUi) return false;
  return isDecisionFallbackMissKind(kind, opts);
}

export function pushRepairAssistant(
  deps: DispatchDeps,
  kind: MissKind,
  text: string,
  opts?: Parameters<DispatchDeps['pushAssistant']>[1],
  policyOpts?: { includeLowConfidence?: boolean }
): void {
  if (shouldDeferRepairUi(kind, deps, policyOpts)) return;
  const msg = String(text ?? '').trim();
  // Never push a blank/whitespace bubble when Laya defer is off.
  deps.pushAssistant(
    msg || 'I didn’t catch that — try rephrasing.',
    opts
  );
}
