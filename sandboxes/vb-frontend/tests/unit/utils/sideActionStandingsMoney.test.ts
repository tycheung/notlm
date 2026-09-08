import { describe, expect, it } from 'vitest';
import { sideActionStandingsShowMoney } from '@/utils/sideActionStandingsMoney';

describe('sideActionStandingsShowMoney', () => {
  it('prefers explicit money_visible true', () => {
    expect(
      sideActionStandingsShowMoney({
        money_visible: true,
        collected: 0,
        prize_fund: 0,
        rowPayouts: [0],
      })
    ).toBe(true);
  });

  it('prefers explicit money_visible false over non-zero heuristics', () => {
    expect(
      sideActionStandingsShowMoney({
        money_visible: false,
        collected: 40,
        prize_fund: 30,
        rowPayouts: [25],
      })
    ).toBe(false);
  });

  it('falls back to heuristic when money_visible omitted', () => {
    expect(
      sideActionStandingsShowMoney({
        collected: 10,
        prize_fund: 0,
        rowPayouts: [0],
      })
    ).toBe(true);
  });
});
