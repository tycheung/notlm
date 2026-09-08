import { describe, expect, it } from 'vitest';

import {
  getDefaultBracketPrizeAmounts,
  getMaxBracketPayoutSpots,
  distributionFromAmounts,
  calcPotFinancials,
  feeFromDistribution,
  placeSpotCountFromDistribution,
  withFeeInDistribution,
} from '@/utils/sideActionPayouts';

describe('sideActionPayouts', () => {
  it('limits 8-person brackets to 2 payout spots', () => {
    expect(getMaxBracketPayoutSpots(8)).toBe(2);
    expect(getDefaultBracketPrizeAmounts(2)).toEqual([25, 10]);
  });

  it('allows up to 4 payout spots for 16–32 person pots', () => {
    expect(getMaxBracketPayoutSpots(16)).toBe(4);
    expect(getMaxBracketPayoutSpots(32)).toBe(4);
    expect(getDefaultBracketPrizeAmounts(4)).toHaveLength(4);
  });

  it('round-trips dollar distribution map', () => {
    const amounts = [25, 10];
    const dist = distributionFromAmounts(amounts);
    expect(dist).toEqual({ '1': 25, '2': 10 });
  });

  it('stores fee alongside place prizes', () => {
    const dist = withFeeInDistribution({ '1': 25, '2': 10 }, 5);
    expect(dist).toEqual({ '1': 25, '2': 10, fee: 5 });
    expect(feeFromDistribution(dist, 0)).toBe(5);
    expect(feeFromDistribution({ '1': 25, '2': 10 }, 7)).toBe(7);
  });

  it('counts place spots without treating fee as a payout place', () => {
    expect(placeSpotCountFromDistribution({ '1': 125, '2': 50, fee: 25 })).toBe(2);
    expect(placeSpotCountFromDistribution({ '1': 40, '2': 20, '3': 12, '4': 8 })).toBe(4);
    expect(placeSpotCountFromDistribution({})).toBe(0);
  });

  it('calculates standard 8-bracket pot finances', () => {
    const result = calcPotFinancials({
      entryFee: 5,
      slotsPerPot: 8,
      houseCutType: 'amount',
      houseCutRate: 0,
      houseCutFlatAmount: 5,
    });
    expect(result.grossCollected).toBe(40);
    expect(result.houseFees).toBe(5);
    expect(result.prizePool).toBe(35);
  });
});
