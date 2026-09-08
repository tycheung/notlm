const NON_ELIMINATOR_METHODS = new Set([
  'bracket',
  'stepladder',
  'round_robin',
  'pods',
]);

const MISMATCH_MESSAGE =
  "Round structure mismatch: match-play competition methods require score type 'match_play'.";

function normalizeToken(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

export function validateTemplateRoundStructure(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const rounds = (payload as { rounds?: unknown }).rounds;
  if (!Array.isArray(rounds)) return null;

  const invalidRoundNames: string[] = [];
  for (const round of rounds) {
    if (!round || typeof round !== 'object') continue;
    const roundObj = round as Record<string, unknown>;
    const method = normalizeToken(roundObj.competition_method);
    const scoreType = normalizeToken(roundObj.score_type);
    if (NON_ELIMINATOR_METHODS.has(method) && scoreType !== 'match_play') {
      const label = String(
        roundObj.friendly_name || roundObj.ref || `round #${invalidRoundNames.length + 1}`
      );
      invalidRoundNames.push(label);
    }
  }

  if (!invalidRoundNames.length) return null;
  return `${MISMATCH_MESSAGE} Invalid round(s): ${invalidRoundNames.join(', ')}.`;
}
