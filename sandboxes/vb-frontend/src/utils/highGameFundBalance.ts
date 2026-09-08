/**
 * High Game cash identity: collected = place prizes committed + expenses.
 * Equivalent: places committed should equal (collected − expenses).
 */

export type HighGameFundBalanceInput = {
  entryCount: number;
  entryFee: number;
  /** dollars_per_entry | amount (flat); percentage treated as flat 0 for this check */
  houseCutType?: string | null;
  houseCutAmount?: number | null;
  houseCutPercentage?: number | null;
  prizeDistribution?: Record<string, number> | null;
  payoutMode?: string | null;
  gameNumbers?: number[] | null;
};

export type HighGameFundImbalance = {
  collected: number;
  expenses: number;
  prizeFund: number;
  placesCommitted: number;
  /** placesCommitted − prizeFund (positive = over-allocated) */
  difference: number;
  message: string;
};

export type OpenPotFundSnapshot = {
  entryCount: number;
  collected: number;
  expenses: number;
  prizeFund: number;
  placesCommitted: number;
};

function money(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatMoney(n: number): string {
  return `$${money(n).toFixed(2)}`;
}

function placeAmountsSum(dist: Record<string, number> | null | undefined): number {
  if (!dist) return 0;
  let sum = 0;
  for (const [key, raw] of Object.entries(dist)) {
    if (!/^\d+$/.test(key)) continue;
    sum += Number(raw) || 0;
  }
  return money(sum);
}

function expenseAmount(input: HighGameFundBalanceInput): { type: 'per_entry' | 'flat'; amount: number } {
  const cutType = String(input.houseCutType || 'amount').toLowerCase();
  if (cutType === 'dollars_per_entry') {
    const pct = Number(input.houseCutPercentage) || 0;
    const amt = input.houseCutAmount != null ? Number(input.houseCutAmount) || 0 : 0;
    return { type: 'per_entry', amount: pct > 0 ? pct : amt };
  }
  return { type: 'flat', amount: Number(input.houseCutAmount) || 0 };
}

/** Live prize-pool math for open-pot side action setup (matches server standings fund). */
export function computeOpenPotFundSnapshot(
  input: HighGameFundBalanceInput
): OpenPotFundSnapshot {
  const entryCount = Math.max(0, Math.floor(Number(input.entryCount) || 0));
  const entryFee = Number(input.entryFee) || 0;
  const collected = money(entryCount * entryFee);
  const { type, amount } = expenseAmount(input);
  const expenses =
    type === 'per_entry' ? money(entryCount * amount) : money(amount);
  const prizeFund = money(collected - expenses);

  const placesSum = placeAmountsSum(input.prizeDistribution);
  const games =
    (input.gameNumbers || []).filter((n) => Number(n) >= 1).length || 1;
  const placesCommitted =
    input.payoutMode === 'combined' ? placesSum : money(placesSum * games);

  return {
    entryCount,
    collected,
    expenses,
    prizeFund,
    placesCommitted,
  };
}

/** Returns imbalance details when collected ≠ places + fees; otherwise null. */
export function getHighGameFundImbalance(
  input: HighGameFundBalanceInput
): HighGameFundImbalance | null {
  const snapshot = computeOpenPotFundSnapshot(input);
  const { collected, expenses, prizeFund, placesCommitted } = snapshot;

  const difference = money(placesCommitted - prizeFund);
  if (Math.abs(difference) < 0.005) return null;

  const direction =
    difference > 0
      ? `${formatMoney(difference)} over available`
      : `${formatMoney(Math.abs(difference))} under available`;

  return {
    collected,
    expenses,
    prizeFund,
    placesCommitted,
    difference,
    message: `Fund mismatch: ${formatMoney(collected)} collected − ${formatMoney(expenses)} fees = ${formatMoney(prizeFund)} available, but place prizes total ${formatMoney(placesCommitted)} (${direction}).`,
  };
}
