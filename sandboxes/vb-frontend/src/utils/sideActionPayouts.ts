/** Physical seats per generated bracket pot (G1/G2/Final). */
export const BRACKET_POT_SEATS = 8;

/** Max payout positions by configured pot size label (max participants field). */
export function getMaxBracketPayoutSpots(maxParticipants: number): number {
  if (maxParticipants <= 8) return 2;
  if (maxParticipants <= 32) return 4;
  return 6;
}

/** Classic 8-person bracket pot: $5 entry × 8 = $40, $5 fees, $25 / $10 payouts. */
export const BRACKET_PAYOUT_PRESETS: Record<string, { label: string; amounts: number[] }> = {
  bracket_8_standard: {
    label: '8-bracket standard ($25 / $10)',
    amounts: [25, 10],
  },
  bracket_8_alt: {
    label: '8-bracket alt ($20 / $15)',
    amounts: [20, 15],
  },
  bracket_16_standard: {
    label: '16-bracket standard ($40 / $20 / $12 / $8)',
    amounts: [40, 20, 12, 8],
  },
};

export function getDefaultBracketPrizeAmounts(spotCount: number): number[] {
  if (spotCount <= 2) {
    return [...BRACKET_PAYOUT_PRESETS.bracket_8_standard.amounts];
  }
  if (spotCount <= 4) {
    return [...BRACKET_PAYOUT_PRESETS.bracket_16_standard.amounts].slice(0, spotCount);
  }
  const base = [40, 25, 15, 10, 6, 4];
  return base.slice(0, spotCount);
}

export const PRIZE_FEE_KEY = 'fee';

export function distributionFromAmounts(amounts: number[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  amounts.forEach((amount, index) => {
    distribution[String(index + 1)] = amount;
  });
  return distribution;
}

/** Place prizes only — ignores non-numeric keys like ``fee``. */
export function amountsFromDistribution(
  distribution: Record<string, number>,
  spotCount: number
): number[] {
  const amounts: number[] = [];
  for (let i = 1; i <= spotCount; i++) {
    amounts.push(distribution[String(i)] ?? 0);
  }
  return amounts;
}

export function feeFromDistribution(
  distribution: Record<string, number> | undefined,
  fallback = 0
): number {
  if (!distribution) return fallback;
  const raw = distribution[PRIZE_FEE_KEY];
  if (raw === undefined || raw === null) return fallback;
  return Math.max(0, Number(raw) || 0);
}

/** Count place keys only (``1``, ``2``, …) — ignores ``fee`` and other metadata. */
export function placeSpotCountFromDistribution(
  distribution: Record<string, number> | undefined
): number {
  if (!distribution) return 0;
  return Object.keys(distribution).filter((key) => /^\d+$/.test(key)).length;
}

export function withFeeInDistribution(
  placeDistribution: Record<string, number>,
  fee: number
): Record<string, number> {
  return {
    ...placeDistribution,
    [PRIZE_FEE_KEY]: Math.max(0, fee),
  };
}

export function ordinalPlace(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export interface PotFinancialsInput {
  entryFee: number;
  slotsPerPot: number;
  houseCutType: 'percentage' | 'dollars_per_entry' | 'amount';
  /** Used when houseCutType is percentage or dollars_per_entry */
  houseCutRate: number;
  /** Used when houseCutType is amount — flat house fee per bracket pot */
  houseCutFlatAmount: number;
}

/** Per bracket-pot financial summary for TD setup UI. */
export function calcPotFinancials(input: PotFinancialsInput): {
  grossCollected: number;
  houseFees: number;
  prizePool: number;
} {
  const grossCollected = input.entryFee * input.slotsPerPot;
  let houseFees = 0;

  if (input.houseCutType === 'amount') {
    houseFees = input.houseCutFlatAmount;
  } else if (input.houseCutType === 'dollars_per_entry') {
    // Per-entry rate × entries in this pot
    houseFees = input.houseCutRate * input.slotsPerPot;
  } else {
    houseFees = grossCollected * (input.houseCutRate / 100);
  }

  return {
    grossCollected,
    houseFees,
    prizePool: Math.max(0, grossCollected - houseFees),
  };
}
