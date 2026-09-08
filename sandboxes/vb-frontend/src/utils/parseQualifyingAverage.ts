export type ParseQualifyingAverageResult =
  | { ok: true; value: number | undefined }
  | { ok: false; error: string };

/** Parse optional qual avg input (empty = omit). Valid range 0–300. */
export function parseQualifyingAverageInput(
  raw: string | undefined
): ParseQualifyingAverageResult {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { ok: true, value: undefined };
  }
  const num = parseFloat(trimmed);
  if (Number.isNaN(num)) {
    return { ok: false, error: 'Qualifying average must be a valid number.' };
  }
  if (num < 0 || num > 300) {
    return { ok: false, error: 'Qualifying average must be between 0 and 300.' };
  }
  return { ok: true, value: Math.round(num * 100) / 100 };
}
