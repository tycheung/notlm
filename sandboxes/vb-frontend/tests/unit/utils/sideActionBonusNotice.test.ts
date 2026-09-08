import { describe, expect, it } from 'vitest';
import { eventHasBonusPinRounds } from '@/utils/sideActionBonusNotice';

describe('eventHasBonusPinRounds', () => {
  it('returns true when any round awards bonus pins', () => {
    expect(
      eventHasBonusPinRounds([
        { competition_method_config: { bonus_pins: { win: 30, tie: 15, loss: 0 } } },
        { competition_method_config: { game_style: 'standard' } },
      ])
    ).toBe(true);
  });

  it('returns false when no rounds award bonus pins', () => {
    expect(
      eventHasBonusPinRounds([
        { competition_method_config: { bonus_pins: { win: 0, tie: 0, loss: 0 } } },
        { competition_method_config: { game_style: 'baker' } },
      ])
    ).toBe(false);
    expect(eventHasBonusPinRounds([])).toBe(false);
  });
});
