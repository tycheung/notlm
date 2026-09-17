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
};

export type LlmFallbackResult = {
  reply: string;
  proposed?: MissProposed;
  provider?: { id: string; model: string };
  exchangeId?: string;
};

export type LlmFallbackFn = (
  request: LlmFallbackRequest
) => Promise<LlmFallbackResult | null> | LlmFallbackResult | null;

export const DEFAULT_LLM_FALLBACK_TIMEOUT_MS = 12_000;

/** Learning Mode is opt-in (default off). */
export function isLearningModeEnabled(features?: AssistantFeatures | null): boolean {
  if (!features) return false;
  return features.learningMode === true;
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
