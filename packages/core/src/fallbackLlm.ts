import type { MissKind, MissProposed } from './missLog.js';
import { DEFAULT_MISS_REPLY_CAP, sanitizeMissText } from './missLog.js';
import {
  aliasContentCoverage,
  contentTokens,
  looksLikeClearOod,
  normalizeAsk,
} from './askNormalize.js';
import {
  looksLikeContextAsk,
  looksLikeExplainLast,
} from './capabilityCatalog.js';
import { looksLikeFaqQuestion } from './glossary.js';
import {
  DEFAULT_HEURISTICS,
  type CompiledHeuristics,
} from './heuristics.js';
import { hasTokenBoundaryMatch } from './fuzzyText.js';
import type { AssistantFeatures } from './types.js';

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Loose nav-verb sniff from pack heuristics (first token of each nav verb). */
function looksLikeNavSniff(
  userText: string,
  heuristics?: CompiledHeuristics | null
): boolean {
  const h = heuristics ?? DEFAULT_HEURISTICS;
  const roots = [
    ...new Set(
      (h.source.navCommandVerbs ?? [])
        .map((v) => v.trim().split(/\s+/)[0]?.toLowerCase())
        .filter((w): w is string => Boolean(w))
    ),
  ];
  if (!roots.length) return false;
  return new RegExp(`\\b(${roots.map(escapeRe).join('|')})\\b`, 'i').test(userText);
}

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
  queryIds?: string[];
  mutationIds?: string[];
  tourIds?: string[];
  searchIds?: string[];
  /** Optional image payload for vision LLM (host only when visionFallback on). */
  imageBase64?: string;
  imageMime?: string;
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

/** Canned OOD template from Laya sidecar / degraded proxy — still a miss for chaining. */
const CANNED_OOD_REFUSE_RE = /\bdo not have the ability to help with\b/i;

/**
 * Whether primary (Laya) should trigger secondary LLM — includes canned refuse
 * text even when `proposed.type` is meta/faq (sidecar bug or degraded stub).
 */
export function shouldEscalateToSecondaryLlm(
  result: LlmFallbackResult | null | undefined
): boolean {
  if (isFallbackRefuse(result)) return true;
  const reply = result?.reply?.trim() ?? '';
  if (reply && CANNED_OOD_REFUSE_RE.test(reply)) return true;
  return false;
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
 * Used by hosts to offer a chip; auto-execute requires {@link isAutoExecutableTrustedGoto}.
 */
export function isTrustedGoto(
  proposed: MissProposed | undefined,
  knownStepIds: ReadonlySet<string> | readonly string[]
): proposed is MissProposed & { type: 'goto'; stepId: string } {
  const v = validateProposedAgainstPack(proposed, knownStepIds);
  return v.type === 'goto' && Boolean(v.stepId);
}

/** Domain tokens that must agree with Laya goto aliases / step id (pack-extensible). */
const DEFAULT_GOTO_DOMAIN = new Set([
  'settings',
  'billing',
  'profile',
  'dashboard',
  'report',
  'reports',
  'search',
  'help',
]);

function gotoDomainSet(
  extra?: readonly string[] | null
): Set<string> {
  const set = new Set(DEFAULT_GOTO_DOMAIN);
  if (extra?.length) {
    for (const t of extra) {
      const w = String(t).toLowerCase().trim();
      if (w) set.add(w);
    }
  }
  return set;
}

function gotoAgreesWithUtterance(
  userText: string,
  proposed: MissProposed & { type: 'goto'; stepId: string },
  domainTokens?: readonly string[] | null
): boolean {
  const needle = normalizeAsk(userText);
  const domain = gotoDomainSet(domainTokens);
  const userDomain = contentTokens(needle).filter((t) => domain.has(t));
  // No domain words: only allow when the user clearly asked to navigate.
  // Prevents context/FAQ/OOD from default-allowing a Laya goto chip.
  if (!userDomain.length) return looksLikeNavSniff(userText);
  const stepToks = contentTokens(proposed.stepId.replace(/_/g, ' '));
  if (userDomain.some((t) => stepToks.includes(t) || proposed.stepId.includes(t))) {
    return true;
  }
  const aliases = proposed.aliases ?? [];
  for (const alias of aliases) {
    const a = String(alias).toLowerCase().trim();
    if (!a) continue;
    if (userDomain.some((t) => hasTokenBoundaryMatch(a, t))) return true;
    if (aliasContentCoverage(needle, a) >= 0.5) return true;
  }
  return false;
}

/**
 * Auto-execute only high-confidence trusted gotos (Laya sets `aliases` when
 * conf ≥ 0.85). Medium-confidence or refuse-shaped replies must not navigate —
 * prevents OOD → silent `billing_ready` side-effects.
 */
export function isAutoExecutableTrustedGoto(
  proposed: MissProposed | undefined,
  knownStepIds: ReadonlySet<string> | readonly string[],
  reply?: string,
  userText?: string,
  domainTokens?: readonly string[] | null
): proposed is MissProposed & { type: 'goto'; stepId: string } {
  if (!isTrustedGoto(proposed, knownStepIds)) return false;
  if (userText && looksLikeClearOod(userText)) return false;
  const text = (reply ?? '').trim();
  if (text && CANNED_OOD_REFUSE_RE.test(text)) return false;
  if (/\bdo not have the ability\b/i.test(text)) return false;
  // High-confidence signal from Laya (aliases attached only when conf ≥ 0.85).
  const aliases = proposed.aliases;
  if (!(Array.isArray(aliases) && aliases.some((a) => String(a).trim().length > 0))) {
    return false;
  }
  if (userText && !gotoAgreesWithUtterance(userText, proposed, domainTokens)) {
    return false;
  }
  return true;
}

/**
 * Whether the host should surface a goto chip / take-you-to reply from Laya.
 * Blocks clear OOD and untrusted take-you-to chips that steal the turn.
 */
export function shouldSurfaceTrustedGoto(
  proposed: MissProposed | undefined,
  knownStepIds: ReadonlySet<string> | readonly string[],
  reply: string | undefined,
  userText: string,
  domainTokens?: readonly string[] | null
): boolean {
  if (looksLikeClearOod(userText)) return false;
  if (looksLikeContextAsk(userText)) return false;
  if (looksLikeExplainLast(userText)) return false;
  if (looksLikeFaqQuestion(userText)) return false;
  if (!isTrustedGoto(proposed, knownStepIds)) return false;
  if (!gotoAgreesWithUtterance(userText, proposed, domainTokens)) return false;
  const text = (reply ?? '').trim();
  if (CANNED_OOD_REFUSE_RE.test(text) || /\bdo not have the ability\b/i.test(text)) {
    return false;
  }
  if (isAutoExecutableTrustedGoto(proposed, knownStepIds, reply, userText, domainTokens)) {
    return true;
  }
  // Medium-confidence goto chip only when the user clearly asked to navigate.
  return looksLikeNavSniff(userText);
}

/** Default System One refuse when Laya would otherwise offer a spurious goto. */
export function defaultOodRefuseReply(
  userText?: string,
  productRole?: string
): string {
  const topic = (userText ?? 'that').trim().slice(0, 48) || 'that';
  const role = productRole?.trim() || 'a product assistant';
  return `No — I am ${role}, and I do not have the ability to help with ${topic}. Try a workflow step name or product question.`;
}

/** Clarify when Laya proposes a goto that disagrees with the user's domain words. */
export function mismatchedGotoClarifyReply(_userText?: string): string {
  return 'Which screen did you mean? Name the step or surface you want to open.';
}

/** Auto-execute trusted gotos unless the host sets `autoExecuteTrustedGoto: false`. */
export function isAutoExecuteTrustedGotoEnabled(
  features?: AssistantFeatures | null
): boolean {
  if (!features) return true;
  return features.autoExecuteTrustedGoto !== false;
}

export function isVisionFallbackEnabled(features?: AssistantFeatures | null): boolean {
  if (!features) return false;
  return features.visionFallback === true;
}

function clampCatalogId(
  proposed: MissProposed,
  key: 'queryId' | 'mutationId' | 'tourId' | 'searchId',
  known: ReadonlySet<string> | readonly string[]
): MissProposed {
  const id = (proposed[key] ?? '').trim();
  const set = known instanceof Set ? known : new Set(known);
  if (!id || !set.has(id)) return { type: 'refuse' };
  return proposed;
}

export type InvokeLlmFallbackOpts = {
  timeoutMs?: number;
  knownStepIds?: ReadonlySet<string> | readonly string[];
  knownQueryIds?: ReadonlySet<string> | readonly string[];
  knownMutationIds?: ReadonlySet<string> | readonly string[];
  knownTourIds?: ReadonlySet<string> | readonly string[];
  knownSearchIds?: ReadonlySet<string> | readonly string[];
};

/**
 * Call host BYO fallback with a timeout. Returns null on failure/timeout
 * so the assistant can keep the canned repair reply.
 */
export async function invokeLlmFallback(
  fn: LlmFallbackFn,
  request: LlmFallbackRequest,
  opts?: InvokeLlmFallbackOpts
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
        result.proposed.type === 'refuse' ||
        result.proposed.type === 'query' ||
        result.proposed.type === 'mutation' ||
        result.proposed.type === 'tour' ||
        result.proposed.type === 'search'
          ? result.proposed
          : { type: 'refuse' };
    } else {
      proposed = { type: 'refuse' };
    }
    if (opts?.knownStepIds) {
      proposed = validateProposedAgainstPack(proposed, opts.knownStepIds);
    }
    if (opts?.knownQueryIds && proposed.type === 'query') {
      proposed = clampCatalogId(proposed, 'queryId', opts.knownQueryIds);
    }
    if (opts?.knownMutationIds && proposed.type === 'mutation') {
      proposed = clampCatalogId(proposed, 'mutationId', opts.knownMutationIds);
    }
    if (opts?.knownTourIds && proposed.type === 'tour') {
      proposed = clampCatalogId(proposed, 'tourId', opts.knownTourIds);
    }
    if (opts?.knownSearchIds && proposed.type === 'search') {
      proposed = clampCatalogId(proposed, 'searchId', opts.knownSearchIds);
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
  opts?: InvokeLlmFallbackOpts;
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
  if (!shouldEscalateToSecondaryLlm(primary)) return primary;
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
