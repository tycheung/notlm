import type { MissKind, MissProposed } from './missLog.js';
import { DEFAULT_MISS_REPLY_CAP, sanitizeMissText } from './missLog.js';
import type { AssistantFeatures } from './types.js';

export type LlmFallbackRequest = {
  text: string;
  kind: MissKind;
  packId?: string;
  pathname?: string;
  /** Redacted / digest-only host context — never secrets. */
  contextDigest?: string;
  /** Allowed pack step ids for goto proposals (host + LLM catalog). */
  stepIds?: string[];
  /** Allowed FAQ ids when the host wants FAQ proposals constrained. */
  faqIds?: string[];
};

export type LlmFallbackResult = {
  reply: string;
  proposed?: MissProposed;
  provider?: { id: string; model: string; chain?: string; prior?: string };
  exchangeId?: string;
};

export type LlmFallbackFn = (
  request: LlmFallbackRequest
) => Promise<LlmFallbackResult | null> | LlmFallbackResult | null;

export const DEFAULT_LLM_FALLBACK_TIMEOUT_MS = 12_000;

/** Learning Mode is opt-in for MissExchange train windows (legacy). */
export function isLearningModeEnabled(features?: AssistantFeatures | null): boolean {
  if (!features) return false;
  return features.learningMode === true;
}

/**
 * Decision fallback (Laya): **default on** unless explicitly disabled.
 * Hosts should still only pass `fallbackLlm` when a sidecar/proxy is available.
 */
export function isDecisionFallbackEnabled(features?: AssistantFeatures | null): boolean {
  if (!features) return true;
  if (features.layaDecisionFallback === false) return false;
  if (features.layaDecisionFallback === true) return true;
  // Unset: default on (ease of use). learningMode false alone does not disable.
  return true;
}

/**
 * Secondary LLM after Laya refuse: **default off**. Opt in with
 * `features.llmFallbackOnLayaMiss: true` and wire `secondaryFallbackLlm`.
 */
export function isSecondaryLlmFallbackEnabled(
  features?: AssistantFeatures | null
): boolean {
  if (!features) return false;
  return features.llmFallbackOnLayaMiss === true;
}

/**
 * True when primary (Laya) missed — null, refuse, or no actionable proposal.
 * Used to decide whether to call `secondaryFallbackLlm`.
 */
export function isFallbackRefuse(
  result: LlmFallbackResult | null | undefined
): boolean {
  if (!result) return true;
  if (!result.proposed) return true;
  return result.proposed.type === 'refuse';
}

/**
 * Ensure proposed.goto.stepId exists in the pack; otherwise force refuse.
 * Invalid faq/meta proposals are left as-is (host may still show reply text).
 */
export function validateProposedAgainstPack(
  proposed: MissProposed | undefined,
  knownStepIds: ReadonlySet<string> | readonly string[]
): MissProposed {
  if (!proposed) return { type: 'refuse' };
  if (proposed.type !== 'goto') return proposed;
  const id = (proposed.stepId ?? '').trim();
  if (!id) return { type: 'refuse' };
  const set =
    knownStepIds instanceof Set ? knownStepIds : new Set(knownStepIds);
  if (!set.has(id)) return { type: 'refuse' };
  return proposed;
}

/**
 * Trusted goto = type goto with a non-empty stepId present in the pack catalog.
 * Used by hosts to auto-executeStep after decision fallback.
 */
export function isTrustedGoto(
  proposed: MissProposed | undefined,
  knownStepIds: ReadonlySet<string> | readonly string[]
): proposed is MissProposed & { type: 'goto'; stepId: string } {
  const v = validateProposedAgainstPack(proposed, knownStepIds);
  return v.type === 'goto' && Boolean(v.stepId);
}

/** Auto-execute trusted gotos unless the host sets `autoExecuteTrustedGoto: false`. */
export function isAutoExecuteTrustedGotoEnabled(
  features?: AssistantFeatures | null
): boolean {
  if (!features) return true;
  return features.autoExecuteTrustedGoto !== false;
}

/**
 * Call host BYO fallback with a timeout. Returns null on failure/timeout
 * so the coach can keep the canned repair reply.
 */
export async function invokeLlmFallback(
  fn: LlmFallbackFn,
  request: LlmFallbackRequest,
  opts?: { timeoutMs?: number; knownStepIds?: ReadonlySet<string> | readonly string[] }
): Promise<LlmFallbackResult | null> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_LLM_FALLBACK_TIMEOUT_MS;
  try {
    const result = await Promise.race([
      Promise.resolve(fn(request)),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
    if (!result || typeof result.reply !== 'string') return null;
    const reply = sanitizeMissText(result.reply, DEFAULT_MISS_REPLY_CAP);
    if (!reply) return null;
    const out: LlmFallbackResult = { reply };
    let proposed: MissProposed | undefined;
    if (result.proposed) {
      proposed =
        result.proposed.type === 'faq' ||
        result.proposed.type === 'goto' ||
        result.proposed.type === 'meta' ||
        result.proposed.type === 'refuse'
          ? result.proposed
          : { type: 'refuse' };
    } else {
      proposed = { type: 'refuse' };
    }
    if (opts?.knownStepIds) {
      proposed = validateProposedAgainstPack(proposed, opts.knownStepIds);
    }
    out.proposed = proposed;
    if (result.provider?.id && result.provider?.model) {
      out.provider = { id: result.provider.id, model: result.provider.model };
    }
    if (typeof result.exchangeId === 'string') out.exchangeId = result.exchangeId;
    return out;
  } catch {
    return null;
  }
}

export type InvokeChainedDecisionFallbackInput = {
  /** Primary decision fallback (Laya / System Two sidecar proxy). */
  primary: LlmFallbackFn;
  /** Optional secondary LLM — only called when primary refuses. */
  secondary?: LlmFallbackFn | null;
  /** When false, never call secondary (default). */
  secondaryEnabled?: boolean;
  request: LlmFallbackRequest;
  opts?: { timeoutMs?: number; knownStepIds?: ReadonlySet<string> | readonly string[] };
};

/**
 * NLU miss cold path inside the operating runtime:
 * primary (Laya) → if refuse and secondary enabled+wired → secondary LLM.
 * Secondary failure keeps the primary refuse (or null if primary failed).
 */
export async function invokeChainedDecisionFallback(
  input: InvokeChainedDecisionFallbackInput
): Promise<LlmFallbackResult | null> {
  const primary = await invokeLlmFallback(input.primary, input.request, input.opts);
  if (!isFallbackRefuse(primary)) return primary;
  if (!input.secondaryEnabled || !input.secondary) return primary;

  const secondary = await invokeLlmFallback(
    input.secondary,
    input.request,
    input.opts
  );
  if (!secondary) return primary;

  const prior = primary?.provider?.id ?? 'laya';
  return {
    ...secondary,
    provider: secondary.provider
      ? {
          id: secondary.provider.id,
          model: secondary.provider.model,
          chain: 'laya_then_llm',
          prior,
        }
      : { id: 'llm', model: 'unknown', chain: 'laya_then_llm', prior },
    exchangeId: secondary.exchangeId ?? primary?.exchangeId,
  };
}

/**
 * Compose primary + optional secondary into one `LlmFallbackFn` for hosts that
 * still pass a single prop. Prefer wiring `secondaryFallbackLlm` on the React host.
 */
export function composeDecisionFallbackChain(input: {
  primary: LlmFallbackFn;
  secondary?: LlmFallbackFn | null;
  secondaryEnabled?: boolean;
}): LlmFallbackFn {
  return (request) =>
    invokeChainedDecisionFallback({
      primary: input.primary,
      secondary: input.secondary,
      secondaryEnabled: input.secondaryEnabled,
      request,
    });
}
