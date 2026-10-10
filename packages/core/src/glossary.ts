import type { FaqEntry, GlossaryEntry } from './types.js';
import {
  bestAliasContentCoverage,
  contentTokens,
  normalizeAsk,
} from './askNormalize.js';
import { hasTokenBoundaryMatch } from './fuzzyText.js';
import {
  anyReTest,
  DEFAULT_HEURISTICS,
  type CompiledHeuristics,
} from './heuristics.js';

function resolveH(h?: CompiledHeuristics | null): CompiledHeuristics {
  return h ?? DEFAULT_HEURISTICS;
}

function stripExplainLead(utterance: string): string {
  return utterance
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/^(explain|what(?:'s| is)|help with)\s+/i, '')
    .replace(/\s+(mean|field|mean\?)\s*$/i, '')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type AliasCatalog = { id: string; aliases: string[] };

const ALIAS_COVERAGE_MIN = 0.84;

/** Longer FAQ aliases must not prefix-steal shorter meta/help utterances. */
function looseMultiWordAliasMatch(needle: string, label: string): boolean {
  if (!label.includes(' ')) return false;
  if (needle.includes(label)) return true;
  if (!label.includes(needle)) return false;
  const needleTokens = contentTokens(needle).length;
  const labelTokens = contentTokens(label).length;
  if (needleTokens < 2 || labelTokens < 2) return false;
  return needleTokens >= labelTokens - 1 || needle.length >= label.length * 0.85;
}

function matchAliasCatalog<T extends AliasCatalog>(
  catalog: T[],
  needle: string
): T | null {
  if (!catalog.length || !needle) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const entry of catalog) {
    // Normalize aliases the same way as utterances ($30 → 30) or dollar FAQ
    // aliases never exact-match “how do I set up a $30 pot?”.
    const labels = [entry.id, ...entry.aliases]
      .map((a) => normalizeAsk(a))
      .filter(Boolean);
    for (const label of labels) {
      if (!label) continue;
      if (needle === label) return entry;
      const labelTokens = contentTokens(label);
      // Single-token aliases (hi/hey/hello) must be exact — never prefix-steal.
      if (!label.includes(' ') && labelTokens.length <= 1) continue;
      const boundaryForward = hasTokenBoundaryMatch(needle, label);
      const boundaryReverse = hasTokenBoundaryMatch(label, needle);
      const boundary =
        boundaryForward ||
        (boundaryReverse &&
          (needle === label ||
            needle.length >= label.length * 0.85 ||
            contentTokens(needle).length >= contentTokens(label).length - 1));
      const looseMulti = looseMultiWordAliasMatch(needle, label);
      const coverage = label.includes(' ')
        ? bestAliasContentCoverage(needle, label)
        : 0;
      const covered =
        coverage >= ALIAS_COVERAGE_MIN &&
        labelTokens.length >= 2 &&
        Math.round(coverage * labelTokens.length) >= 2;
      if (boundary || looseMulti || covered) {
        const score =
          label.length +
          (boundary ? 50 : 0) +
          (covered ? Math.round(coverage * 40) : 0);
        if (score > bestScore) {
          best = entry;
          bestScore = score;
        }
      }
    }
  }
  return best;
}

/** Best glossary hit by alias containment / exact id match. */
export function matchGlossaryEntry(
  glossary: GlossaryEntry[],
  utterance: string
): GlossaryEntry | null {
  return matchAliasCatalog(glossary, stripExplainLead(utterance));
}

/** Product FAQ match against full utterance (blurb-led Q&A). */
export function matchFaqEntry(faq: FaqEntry[], utterance: string): FaqEntry | null {
  return matchAliasCatalog(faq, normalizeAsk(utterance));
}

/**
 * FAQ hit only when the utterance is an exact / near-exact alias match.
 * Use this for early short-circuits so weak fuzzy FAQ never steals Laya/LLM.
 */
export function matchStrongFaqEntry(
  faq: FaqEntry[],
  utterance: string
): FaqEntry | null {
  const hit = matchFaqEntry(faq, utterance);
  if (!hit) return null;
  return isStrongFaqAliasMatch(utterance, hit) ? hit : null;
}

/** True when the utterance fully matches a FAQ alias (not a short prefix steal). */
export function isStrongFaqAliasMatch(utterance: string, entry: FaqEntry): boolean {
  const needle = normalizeAsk(utterance);
  if (!needle) return false;
  const labels = [entry.id, ...entry.aliases]
    .map((a) => normalizeAsk(a))
    .filter(Boolean);
  for (const label of labels) {
    if (!label) continue;
    if (needle === label) return true;
    if (!label.includes(' ')) continue;
    // Training-noise aliases must never strong-match product questions.
    if (/case\d+x\d+n\d+/i.test(label)) continue;
    const coverage = bestAliasContentCoverage(needle, label);
    const labelTokens = contentTokens(label).length;
    const needleTokens = contentTokens(needle).length;
    if (coverage < ALIAS_COVERAGE_MIN || labelTokens < 2) continue;
    // Short 2-token aliases must not steal longer asks that merely share those tokens
    // (e.g. "prize money" / "can i prize money thx" vs tax advice).
    if (labelTokens <= 2 && needleTokens > labelTokens + 1) continue;
    if (
      needleTokens >= labelTokens - 1 &&
      needle.length >= label.length * 0.85
    ) {
      return true;
    }
  }
  return false;
}

/**
 * True when the utterance reads like a product question (not a direct “do X” command).
 * Used so FAQ answers can win over step aliases that appear as substrings
 * (e.g. “how do I create a tournament” vs alias “create tournament”).
 */
/** True when the utterance is a direct navigation/create command (not FAQ). */
export function looksLikeNavCommand(
  utterance: string,
  heuristics?: CompiledHeuristics | null
): boolean {
  const h = resolveH(heuristics);
  const n = normalizeAsk(utterance, heuristics);
  if (!n) return false;
  return Boolean(h.navCommand?.test(n));
}

export function looksLikeFaqQuestion(
  utterance: string,
  heuristics?: CompiledHeuristics | null
): boolean {
  const h = resolveH(heuristics);
  const n = normalizeAsk(utterance, heuristics);
  if (!n) return false;
  if (looksLikeNavCommand(n, heuristics)) return false;
  if (anyReTest(h.faqQuestion, n)) return true;
  return anyReTest(h.compare, n);
}

/**
 * Merge base + product FAQ. Overlay wins on the same `id`; other base entries are kept.
 */
export function mergeFaqEntries(
  base: FaqEntry[] | undefined,
  overlay: FaqEntry[] | undefined
): FaqEntry[] | undefined {
  if (!base?.length && !overlay?.length) return undefined;
  if (!base?.length) return overlay?.length ? [...overlay] : undefined;
  if (!overlay?.length) return [...base];
  const byId = new Map<string, FaqEntry>();
  for (const entry of base) byId.set(entry.id, entry);
  for (const entry of overlay) byId.set(entry.id, entry);
  return [...byId.values()];
}
