/** Map Mystery Game API outcome codes to print labels. */
export function mysteryGameOutcomeLabel(
  outcome: string | null | undefined,
  options?: { needsRespin?: boolean; spun?: boolean }
): string {
  if (options?.needsRespin) return 'Re-spin required';
  if (outcome === 'exact_match') return 'Exact match';
  if (outcome === 'closest') return 'Closest score';
  if (outcome === 'needs_respin') return 'Re-spin required';
  if (options?.spun) return 'Generated';
  return outcome ? String(outcome) : '—';
}
