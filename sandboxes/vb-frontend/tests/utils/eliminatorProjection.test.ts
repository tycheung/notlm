import { describe, expect, it } from 'vitest';
import {
  computeDropCount,
  eliminatorProjectionWarning,
  projectCutSchedule,
} from '../../src/utils/eliminatorProjection';

describe('computeDropCount', () => {
  it('uses original entry count for percentage drops', () => {
    // 30 entries × 33% round up → 10, even when only 20 are still alive
    expect(computeDropCount(20, 'percentage', 33, 'up', 30)).toBe(10);
  });

  it('caps flat drops at alive field', () => {
    expect(computeDropCount(5, 'flat', 10)).toBe(5);
  });
});

describe('projectCutSchedule', () => {
  it('matches the 30 entries / 33% up / 3 games handoff example', () => {
    const projection = projectCutSchedule({
      entryCount: 30,
      gameNumbers: [1, 2, 3],
      dropMode: 'percentage',
      dropAmount: 33,
      roundMode: 'up',
    });
    expect(projection.steps.map((s) => s.dropped)).toEqual([10, 10, 0]);
    expect(projection.final_alive).toBe(10);
    expect(projection.has_warning).toBe(false);
  });

  it('warns when cuts empty the field before the payout game', () => {
    const projection = projectCutSchedule({
      entryCount: 10,
      gameNumbers: [1, 2, 3],
      dropMode: 'flat',
      dropAmount: 10,
    });
    expect(projection.emptied_before_final).toBe(true);
    expect(eliminatorProjectionWarning(projection)).toMatch(/before the final/);
  });

  it('preserves non-consecutive selected stage games', () => {
    const projection = projectCutSchedule({
      entryCount: 10,
      gameNumbers: [1, 4, 5],
      dropMode: 'flat',
      dropAmount: 2,
    });
    expect(projection.game_numbers).toEqual([1, 4, 5]);
    expect(projection.steps.map((step) => step.game_number)).toEqual([1, 4, 5]);
    expect(projection.payout_game).toBe(5);
  });

  it('applies varied per-game drop amounts', () => {
    const projection = projectCutSchedule({
      entryCount: 40,
      gameNumbers: [1, 2, 3, 4],
      dropMode: 'flat',
      dropAmount: 5,
      dropSchedule: 'varied',
      dropAmountsByGame: { '1': 10, '2': 5, '3': 2 },
    });
    expect(projection.drop_schedule).toBe('varied');
    expect(projection.steps.map((s) => s.dropped)).toEqual([10, 5, 2, 0]);
    expect(projection.final_alive).toBe(23);
  });
});
