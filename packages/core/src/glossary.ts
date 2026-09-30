import type { FaqEntry, GlossaryEntry } from './types.js';
import { aliasContentCoverage, normalizeAsk } from './askNormalize.js';
import { hasTokenBoundaryMatch } from './fuzzyText.js';

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

function matchAliasCatalog<T extends AliasCatalog>(
  catalog: T[],
  needle: string
): T | null {
  if (!catalog.length || !needle) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const entry of catalog) {
    const labels = [entry.id, ...entry.aliases].map((a) => a.toLowerCase().trim());
    for (const label of labels) {
      if (!label) continue;
      if (needle === label) return entry;
      const boundary =
        hasTokenBoundaryMatch(needle, label) || hasTokenBoundaryMatch(label, needle);
      const looseMulti =
        label.includes(' ') && (needle.includes(label) || label.includes(needle));
      const coverage = label.includes(' ')
        ? aliasContentCoverage(needle, label)
        : 0;
      const covered =
        coverage >= ALIAS_COVERAGE_MIN && label.split(/\s+/).length >= 2;
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
 * True when the utterance reads like a product question (not a direct “do X” command).
 * Used so FAQ answers can win over step aliases that appear as substrings
 * (e.g. “how do I create a tournament” vs alias “create tournament”).
 */
/** True when the utterance is a direct navigation/create command (not FAQ). */
export function looksLikeNavCommand(utterance: string): boolean {
  const n = normalizeAsk(utterance);
  if (!n) return false;
  return /^(please\s+)?(take me|go to|open|start|create|make|add|assign|lock|enter|run|show me|do it|navigate(\s+to)?|find|search|locate)\b/.test(
    n
  );
}

export function looksLikeFaqQuestion(utterance: string): boolean {
  const n = normalizeAsk(utterance);
  if (!n) return false;
  if (looksLikeNavCommand(n)) return false;
  if (
    /^(how|what|why|when|where|who|which|is|are|am|can|could|should|do|does|did|will|would|explain|tell me|help me understand|compare|difference)\b/.test(
      n
    )
  ) {
    return true;
  }
  // Compare / product-fact asks ("tournament vs event", "SA vs full").
  return (
    /\b(vs|versus)\b/.test(n) ||
    /\bdifference between\b/.test(n) ||
    /\bcompared to\b/.test(n) ||
    /\bcompare\b/.test(n) ||
    /\bwhat is better\b/.test(n) ||
    /\bshould i (run|use|create)\b/.test(n) ||
    /\b(how are|how do)\b.+\b(relate|different|differ)\b/.test(n)
  );
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
