/** Shared pods advance defaults (Format Editor + scoring surfaces). */

export function defaultAdvanceForSize(size: number): number {
  if (size <= 1) return 0;
  return Math.min(Math.max(1, Math.ceil(size / 2)), size - 1);
}
