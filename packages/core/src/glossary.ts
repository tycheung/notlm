import type { GlossaryEntry } from './types.js';

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

/** Best glossary hit by alias containment / exact id match. */
export function matchGlossaryEntry(
  glossary: GlossaryEntry[],
  utterance: string
): GlossaryEntry | null {
  if (!glossary.length) return null;
  const needle = stripExplainLead(utterance);
  if (!needle) return null;

  let best: GlossaryEntry | null = null;
  let bestScore = 0;
  for (const entry of glossary) {
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
