import { describe, expect, it } from 'vitest';
import {
  computeOpenPotFundSnapshot,
  getHighGameFundImbalance,
} from '../../src/utils/highGameFundBalance';

describe('computeOpenPotFundSnapshot', () => {
  it('computes collected, expenses, and prize fund from live entries', () => {
    const snapshot = computeOpenPotFundSnapshot({
      entryCount: 19,
      entryFee: 20,
      houseCutType: 'amount',
      houseCutAmount: 20,
      prizeDistribution: { '1': 200, '2': 100, '3': 60 },
      payoutMode: 'combined',
      gameNumbers: [1],
    });
    expect(snapshot.collected).toBe(380);
    expect(snapshot.expenses).toBe(20);
    expect(snapshot.prizeFund).toBe(360);
    expect(snapshot.placesCommitted).toBe(360);
  });
});

describe('getHighGameFundImbalance', () => {
  it('flags over-allocated places vs flat fee', () => {
    const issue = getHighGameFundImbalance({
      entryCount: 19,
      entryFee: 20,
      houseCutType: 'amount',
      houseCutAmount: 20,
      prizeDistribution: { '1': 200, '2': 120, '3': 60 },
      payoutMode: 'combined',
      gameNumbers: [1, 2, 3],
    });
    // collected 380 − fees 20 = 360 available; places 380 → $20 over
    expect(issue).not.toBeNull();
    expect(issue!.prizeFund).toBe(360);
    expect(issue!.placesCommitted).toBe(380);
    expect(issue!.difference).toBe(20);
  });

  it('returns null when balanced', () => {
    const issue = getHighGameFundImbalance({
      entryCount: 19,
      entryFee: 20,
      houseCutType: 'amount',
      houseCutAmount: 20,
      prizeDistribution: { '1': 200, '2': 100, '3': 60 },
      payoutMode: 'combined',
      gameNumbers: [1],
    });
    expect(issue).toBeNull();
  });

  it('multiplies places by game count in per_game mode', () => {
    const issue = getHighGameFundImbalance({
      entryCount: 10,
      entryFee: 10,
      houseCutType: 'amount',
      houseCutAmount: 0,
      prizeDistribution: { '1': 50 },
      payoutMode: 'per_game',
      gameNumbers: [1, 2],
    });
    // collected 100, places 50×2=100 → balanced
    expect(issue).toBeNull();
  });
});
