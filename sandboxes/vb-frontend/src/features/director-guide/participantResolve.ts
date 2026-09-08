import { editDistance } from './fuzzyText';

export type NamedParticipant = {
  id: number;
  userId: number;
  displayName: string;
};

export type ParticipantMatch = NamedParticipant & { score: number };

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameScore(query: string, candidate: string): number {
  const q = normalizeName(query);
  const c = normalizeName(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1000;
  if (c.includes(q) || q.includes(c)) return 700 + Math.min(q.length, c.length);
  const qw = q.split(' ');
  const cw = c.split(' ');
  let matched = 0;
  for (const w of qw) {
    if (w.length < 2) continue;
    if (cw.some((x) => x === w || (w.length >= 4 && editDistance(x, w) <= 1))) matched += 1;
  }
  if (matched === 0) {
    const dist = editDistance(q, c);
    if (dist <= 2 && q.length >= 5) return 400 - dist * 20;
    return 0;
  }
  return 300 + matched * 80 - Math.abs(qw.length - cw.length) * 10;
}

/**
 * Rank participants for a spoken/typed name. Returns best-first.
 */
export function rankParticipantsByName(
  query: string,
  participants: NamedParticipant[]
): ParticipantMatch[] {
  return participants
    .map((p) => ({ ...p, score: nameScore(query, p.displayName) }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Clear top match if score is strong and gap to #2 is large enough.
 * Otherwise return top 2–5 for user confirmation.
 */
export function resolveParticipantOrAmbiguous(
  query: string,
  participants: NamedParticipant[]
): { clear: ParticipantMatch | null; ambiguous: ParticipantMatch[] } {
  const ranked = rankParticipantsByName(query, participants).slice(0, 5);
  if (ranked.length === 0) return { clear: null, ambiguous: [] };
  const top = ranked[0];
  const second = ranked[1];
  const clearWinner =
    top.score >= 500 && (!second || top.score - second.score >= 120 || second.score < 350);
  if (clearWinner) return { clear: top, ambiguous: [] };
  // Close band: include those within 150 of top
  const band = ranked.filter((r) => top.score - r.score <= 150);
  return { clear: null, ambiguous: band.length >= 2 ? band : ranked.slice(0, Math.min(5, ranked.length)) };
}

/** Pull a person-ish name from lookup phrases. */
export function extractPersonNameHint(text: string): string | null {
  const patterns = [
    /\bwhere\s+is\s+(.+?)(?:\s*\?|$|,|\.|did\b)/i,
    /\b(?:for|about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
    /\b(?:did)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+make\s+it\b/i,
    /\b(?:show|find)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i,
    /\bhow\s+about\s+(?:for\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      let name = m[1].trim().replace(/\s+/g, ' ');
      name = name.replace(/\b(at|in|the|event|tournament|there|now)\b/gi, ' ').replace(/\s+/g, ' ').trim();
      if (name.length >= 2 && !/^(scores?|average|avg)$/i.test(name)) return name;
    }
  }
  return null;
}

export function extractEventNameHint(text: string): string | null {
  const m = text.match(
    /\b(?:event|for)\s+["']?([A-Za-z0-9][^"'?,.]{1,40})["']?(?:\s*[,?]|\s+is\b|\s*$)/i
  );
  if (!m?.[1]) return null;
  const name = m[1].trim();
  if (/^(bob|he|she|them|their)$/i.test(name)) return null;
  return name;
}
