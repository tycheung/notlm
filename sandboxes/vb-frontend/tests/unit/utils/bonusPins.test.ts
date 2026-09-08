import { describe, expect, it } from 'vitest';
import {
  awardBonusForSide,
  bonusPinsConfigured,
  computeMatchPlayBonusByTeamId,
  parseBonusPinsConfig,
} from '../../../src/utils/bonusPins';
import type { MatchSeriesRead } from '../../../src/api/round-match-series';

describe('bonusPins utils', () => {
  it('parses config and detects when enabled', () => {
    expect(parseBonusPinsConfig(null)).toEqual({ win: 0, tie: 0, loss: 0 });
    expect(bonusPinsConfigured({ bonus_pins: { win: 30, tie: 15, loss: 0 } })).toBe(true);
    expect(bonusPinsConfigured({ bonus_pins: { win: 0, tie: 0, loss: 0 } })).toBe(false);
  });

  it('awards win/tie/loss pins', () => {
    const bonus = { win: 30, tie: 15, loss: 0 };
    expect(awardBonusForSide(bonus, 0, 1, 0, 0)).toBe(30);
    expect(awardBonusForSide(bonus, 1, 1, 0, 0)).toBe(0);
    expect(awardBonusForSide(bonus, 0, 1, 1, null)).toBe(15);
  });

  it('aggregates completed series bonus by team_id', () => {
    const series: MatchSeriesRead[] = [
      {
        id: 1,
        round_id: 10,
        event_id: 5,
        race_to_wins: 1,
        max_games: 1,
        status: 'complete',
        wins_side_0: 1,
        wins_side_1: 0,
        winner_side: 0,
        display_order: 1,
        bracket_template: null,
        match_label: null,
        participants: [
          { side: 0, event_participant_id: null, team_id: 101 },
          { side: 1, event_participant_id: null, team_id: 102 },
        ],
      },
    ];
    const map = computeMatchPlayBonusByTeamId(series, { win: 30, tie: 15, loss: 0 });
    expect(map.get(101)).toBe(30);
    expect(map.get(102)).toBe(0);
  });

  it('maps missing team_id via event participant lookup', () => {
    const series: MatchSeriesRead[] = [
      {
        id: 2,
        round_id: 10,
        event_id: 5,
        race_to_wins: 1,
        max_games: 1,
        status: 'complete',
        wins_side_0: 0,
        wins_side_1: 1,
        winner_side: 1,
        display_order: 2,
        bracket_template: null,
        match_label: null,
        participants: [
          { side: 0, event_participant_id: 11, team_id: null },
          { side: 1, event_participant_id: 22, team_id: null },
        ],
      },
    ];
    const epMap = new Map([
      [11, 201],
      [22, 202],
    ]);
    const map = computeMatchPlayBonusByTeamId(
      series,
      { win: 30, tie: 15, loss: 0 },
      epMap
    );
    expect(map.get(201)).toBe(0);
    expect(map.get(202)).toBe(30);
  });
});
