import type { FaqEntry, GlossaryEntry } from './types.js';

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

function normalizeAsk(utterance: string): string {
  return utterance
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type AliasCatalog = { id: string; aliases: string[] };

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
      if (needle.includes(label) || label.includes(needle)) {
        const score = label.length;
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
