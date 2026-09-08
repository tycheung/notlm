import type { RoundFormatRead } from '../types/round';

/**
 * Canonical name for the default round format template.
 * Keep in sync with:
 * - `backend/scripts/seed_test_data.sql` (insert into `round_formats`)
 * - `backend/services/event_structure_service.py` (`DEFAULT_ROUND_FORMAT_NAME`)
 * - `src/constants/defaultEventStructurePayload.ts` (`round_format_name` on default rounds)
 */
export const DEFAULT_ROUND_FORMAT_NAME = '3-game qualifying';

/**
 * Resolves the database id for the default format. Never assumes `id === 1`.
 */
export function resolveDefaultRoundFormatId(formats: RoundFormatRead[]): number | null {
  if (!formats.length) return null;
  const named = formats.find((f) => f.name === DEFAULT_ROUND_FORMAT_NAME);
  if (named) return named.id;
  return [...formats].sort((a, b) => a.id - b.id)[0]?.id ?? null;
}
