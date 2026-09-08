export const NO_RESULTS = 'No Results';

export function formatStatNumber(
  value: number | null | undefined,
  digits: number = 0
): string {
  if (value == null || Number.isNaN(Number(value))) {
    return NO_RESULTS;
  }
  return Number(value).toFixed(digits);
}

export function formatStatDate(value: string | null | undefined, format: (iso: string) => string): string {
  if (!value) {
    return NO_RESULTS;
  }
  return format(value);
}
