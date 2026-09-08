/**
 * Whether SA standings should show dollar amounts.
 * Prefer explicit API `money_visible`; fall back to non-zero heuristics for older payloads.
 */
export function sideActionStandingsShowMoney(input: {
  money_visible?: boolean | null;
  collected?: number | null;
  prize_fund?: number | null;
  rowPayouts?: Array<number | null | undefined>;
}): boolean {
  if (typeof input.money_visible === 'boolean') {
    return input.money_visible;
  }
  if ((input.collected ?? 0) > 0 || (input.prize_fund ?? 0) > 0) {
    return true;
  }
  return (input.rowPayouts ?? []).some((p) => (p ?? 0) > 0);
}
