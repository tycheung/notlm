import { describe, expect, it } from 'vitest';
import type { MatchSeriesRead } from '@/api/round-match-series';
import type { RoundRead } from '@/types/round';
import {
  groupSeriesByGame,
  scheduleConfigFromRound,
  scheduleConfigToPatch,
} from '@/components/event/formatEditor/roundRobinMatchupsUtils';

function series(
  patch: Partial<MatchSeriesRead> & { id: number }
): MatchSeriesRead {
  return {
    round_id: 1,
    event_id: 1,
    race_to_wins: 1,
    max_games: 1,
    status: 'pending',
    wins_side_0: 0,
    wins_side_1: 0,
    winner_side: null,
    display_order: patch.display_order ?? patch.id,
    bracket_template: null,
    match_label: null,
    participants: [],
    ...patch,
  };
}

describe('roundRobinMatchupsUtils', () => {
  it('groups by bracket_round when present', () => {
    const sections = groupSeriesByGame([
      series({ id: 2, bracket_round: 1, bracket_slot: 1, display_order: 2 }),
      series({ id: 1, bracket_round: 0, bracket_slot: 0, display_order: 1 }),
      series({
        id: 3,
        bracket_round: 1,
        bracket_slot: 0,
        display_order: 3,
        bracket_segment: 'position',
      }),
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0].gameNumber).toBe(1);
    expect(sections[1].gameNumber).toBe(2);
    expect(sections[1].isPosition).toBe(true);
    expect(sections[1].series.map((s) => s.id)).toEqual([3, 2]);
  });

  it('falls back to a single section without bracket_round', () => {
    const sections = groupSeriesByGame([
      series({ id: 2, display_order: 2 }),
      series({ id: 1, display_order: 1 }),
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0].gameNumber).toBe(1);
    expect(sections[0].series.map((s) => s.id)).toEqual([1, 2]);
  });

  it('scheduleConfigFromRound / ToPatch keep scheduled_games aliases aligned', () => {
    const round = {
      id: 9,
      competition_method_config: {
        schedule_mode: 'league',
        total_matches_or_games: 6,
        position_round_game: 3,
      },
    } as RoundRead;
    const draft = scheduleConfigFromRound(round);
    expect(draft.scheduled_games).toBe(6);
    expect(draft.total_matches_or_games).toBe(6);
    expect(scheduleConfigToPatch({ ...draft, scheduled_games: 4 }, { keep: true })).toEqual({
      keep: true,
      schedule_mode: 'league',
      scheduled_games: 4,
      total_matches_or_games: 4,
      position_round_game: 3,
      position_round_lane_placement: 'start_low',
      seed_source_mode: 'feeder',
      seed_source_round_id: null,
    });
  });
});
