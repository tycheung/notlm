/**
 * Shared utterance normalization for FAQ / catalog / discourse matching.
 * Strips disfluency + polite frames, then exposes content-token helpers so
 * "assign the temporary badge please" can hit "assign temporary badge".
 * Filler / stopword lists come from compiled pack heuristics.
 */
import {
  DEFAULT_HEURISTICS,
  type CompiledHeuristics,
} from './heuristics.js';

function resolveH(h?: CompiledHeuristics | null): CompiledHeuristics {
  return h ?? DEFAULT_HEURISTICS;
}

export function normalizeAsk(
  utterance: string,
  heuristics?: CompiledHeuristics | null
): string {
  const h = resolveH(heuristics);
  let n = utterance
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    // Drop HTML/XML tags before tokenizing so markup cannot pollute FAQ match.
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    // Path-style tokens ("actions-needed") match spaced product language.
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 4; i++) {
    let next = n;
    if (h.askDisfluencyLead) next = next.replace(h.askDisfluencyLead, '');
    if (h.askPoliteTrail) next = next.replace(h.askPoliteTrail, '');
    next = next.trim();
    if (next === n) break;
    n = next;
  }
  return n;
}

/** Content tokens for coverage scoring (stopwords removed). */
export function contentTokens(
  text: string,
  heuristics?: CompiledHeuristics | null
): string[] {
  const stop = resolveH(heuristics).contentStopwords;
  return normalizeAsk(text, heuristics)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stop.has(t));
}

/**
 * Fraction of `label` content tokens that appear as an ordered subsequence
 * in `needle` content tokens. 1 = full coverage.
 */
export function aliasContentCoverage(
  needle: string,
  label: string,
  heuristics?: CompiledHeuristics | null
): number {
  const hay = contentTokens(needle, heuristics);
  const need = contentTokens(label, heuristics);
  if (!need.length || !hay.length) return 0;
  let from = 0;
  let hit = 0;
  for (const tok of need) {
    let found = -1;
    for (let i = from; i < hay.length; i++) {
      if (hay[i] === tok) {
        found = i;
        break;
      }
    }
    if (found < 0) continue;
    hit += 1;
    from = found + 1;
  }
  return hit / need.length;
}

/** Bag-of-words coverage (order-insensitive) for paraphrase FAQ/compare asks. */
export function aliasContentCoverageBagable(
  needle: string,
  label: string,
  heuristics?: CompiledHeuristics | null
): number {
  const hay = new Set(contentTokens(needle, heuristics));
  const need = contentTokens(label, heuristics);
  if (!need.length || !hay.size) return 0;
  let hit = 0;
  for (const tok of need) {
    if (hay.has(tok)) hit += 1;
  }
  return hit / need.length;
}

/** Best of ordered + bag-of-words when the label is multi-token. */
export function bestAliasContentCoverage(
  needle: string,
  label: string,
  heuristics?: CompiledHeuristics | null
): number {
  const ordered = aliasContentCoverage(needle, label, heuristics);
  const labelToks = contentTokens(label, heuristics);
  // 2+ content tokens: allow bag-of-words so word-order paraphrases hit
  // (e.g. "baker vs standard" ↔ "standard vs baker"). Singletons stay ordered-only.
  if (labelToks.length < 2) return ordered;
  return Math.max(
    ordered,
    aliasContentCoverageBagable(needle, label, heuristics)
  );
}

/**
 * Clear out-of-domain asks that System One should refuse locally (never Laya goto).
 * Keep this conservative — in-domain product questions must stay false.
 * Topic bag + phrase patterns from pack heuristics.
 */
export function looksLikeClearOod(
  utterance: string,
  heuristics?: CompiledHeuristics | null
): boolean {
  const h = resolveH(heuristics);
  const n = normalizeAsk(utterance, heuristics);
  if (!n) return false;
  if (h.oodTopicRe?.test(n)) return true;
  for (const re of h.oodPhraseRes) {
    if (re.test(n)) return true;
  }
  return false;
}

/**
 * Prompt-injection / jailbreak shaped asks. Used to block multi-segment packing
 * from queuing product steps (e.g. "print" → reports) while still allowing
 * mixed "create X and muffin recipe" OOD+action packing via topic bags.
 */
const JAILBREAK_PROBE_RE =
  /\bignore (all )?(previous|prior|above|earlier) (instructions|rules|prompts)\b|\b(print|show|reveal|dump|leak|output)\b.{0,40}\b(system |developer |hidden )?(prompt|instructions|rules)\b|\bfollow (any |the |all )?(instructions|prompts|commands)\b.{0,80}\b(in (them|the names?|this page|bowler)|from the)\b|\bread .{0,40}\b(bowler )?names\b.{0,40}\bfollow\b|\byou are now in (developer|god|dan) mode\b|\bjailbreak\b/i;

/**
 * True when jailbreak-shaped words appear only as literal name/title payload
 * after named/called (create/open with adversarial names must not refuse the act).
 */
export function jailbreakOnlyInNamedPayload(utterance: string): boolean {
  const n = normalizeAsk(utterance);
  if (!n || !JAILBREAK_PROBE_RE.test(n)) return false;
  const namedIdx = n.search(/\b(?:named|called|title[d]?)\b/);
  if (namedIdx < 0) return false;
  const jailIdx = n.search(
    /\bignore (all )?(previous|prior|above|earlier) (instructions|rules|prompts)\b|\bjailbreak\b|\byou are now in (developer|god|dan) mode\b/
  );
  return jailIdx > namedIdx;
}

export function looksLikeJailbreakProbe(utterance: string): boolean {
  const n = normalizeAsk(utterance);
  if (!n) return false;
  if (jailbreakOnlyInNamedPayload(utterance)) return false;
  return JAILBREAK_PROBE_RE.test(n);
}

/** Markup / script / empty-after-strip probes — refuse locally, never Laya. */
export function looksLikeMarkupOrEmptyProbe(utterance: string): boolean {
  const raw = utterance.trim();
  if (!raw) return true;
  if (/<script\b|javascript\s*:|on\w+\s*=/i.test(raw)) return true;
  // Markdown javascript links
  if (/\[[^\]]*\]\(\s*javascript\s*:/i.test(raw)) return true;
  const n = normalizeAsk(raw);
  return !n;
}

/**
 * Informational questions (what/how/who/… or trailing ?) should not trigger
 * draft compilers or write paths — only explicit build/finish commands should.
 */
export function looksLikeInformationalQuestion(utterance: string): boolean {
  const t = utterance.trim();
  if (!t) return false;
  if (/\?\s*$/.test(t)) return true;
  return /^(?:what|what's|whats|who|who's|whom|whose|how|why|when|where|which|does|do|did|is|are|was|were|can|could|should|will|would|may)\b/i.test(
    t
  );
}

/** Finish / apply phrases for structured draft compilers. */
export function looksLikeDraftFinish(utterance: string): boolean {
  return /\b(?:done|finish|save\s+(?:the\s+)?format|apply\s+(?:the\s+)?format|that's\s+it|thats\s+it)\b/i.test(
    utterance
  );
}
