import { describe, expect, it } from 'vitest';
import { buildSingleElimDiagram } from '../../../src/components/match-play-diagram/adapters/bracketSingleElim';
import type { MatchSeriesRead } from '../../../src/api/round-match-series';

function series(
  id: number,
  round: number,
  slot: number,
  p0: number | null,
  p1: number | null,
  opts: Partial<MatchSeriesRead> = {}
): MatchSeriesRead {
  return {
    id,
    round_id: 1,
    event_id: 1,
    race_to_wins: 1,
    max_games: 1,
    status: 'pending',
    wins_side_0: 0,
    wins_side_1: 0,
    winner_side: null,
    display_order: id,
    bracket_template: 'single_elim',
    match_label: null,
    bracket_round: round,
    bracket_slot: slot,
    participants: [
      {
        side: 0,
        event_participant_id: p0,
        team_id: null,
      },
      {
        side: 1,
        event_participant_id: p1,
        team_id: null,
      },
    ],
    ...opts,
  };
}

describe('buildSingleElimDiagram', () => {
  it('builds 8-player single elim with 3 columns', () => {
    const matchSeries: MatchSeriesRead[] = [];
    let id = 1;
    for (let round = 0; round < 3; round += 1) {
      const count = 4 / 2 ** round;
      for (let slot = 0; slot < count; slot += 1) {
        const p0 = round === 0 ? 100 + slot * 2 : null;
        const p1 = round === 0 ? 101 + slot * 2 : null;
        matchSeries.push(series(id, round, slot, p0, p1));
        id += 1;
      }
    }

    const model = buildSingleElimDiagram({
      matchSeries,
      roundParticipants: Array.from({ length: 8 }, (_, i) => ({
        event_participant_id: 100 + i,
        user_name: `P${100 + i}`,
        pool_position: i + 1,
      })),
      allGames: [],
      isTeamEvent: false,
      maxGameCount: 1,
    });

    expect(model.columns).toHaveLength(3);
    expect(model.columns[0].matches).toHaveLength(4);
    expect(model.columns[2].matches).toHaveLength(1);
    expect(model.columns[0].matches[0].participants[0].name).toBe('P100');
  });

  it('marks TBD slots when participant missing', () => {
    const model = buildSingleElimDiagram({
      matchSeries: [series(1, 1, 0, null, null)],
      roundParticipants: [],
      allGames: [],
      isTeamEvent: false,
      maxGameCount: 1,
    });
    expect(model.columns[0].matches[0].participants[0].isTbd).toBe(true);
  });

  it('disables score cells when no game shell exists', () => {
    const model = buildSingleElimDiagram({
      matchSeries: [series(1, 0, 0, 10, 11)],
      roundParticipants: [
        { event_participant_id: 10, user_name: 'A' },
        { event_participant_id: 11, user_name: 'B' },
      ],
      allGames: [],
      isTeamEvent: false,
      maxGameCount: 1,
    });
    expect(model.columns[0].matches[0].participants[0].scores[0].disabled).toBe(true);
  });

  it('hydrates scores from allGames', () => {
    const model = buildSingleElimDiagram({
      matchSeries: [series(5, 0, 0, 10, 11)],
      roundParticipants: [
        { event_participant_id: 10, user_name: 'A' },
        { event_participant_id: 11, user_name: 'B' },
      ],
      allGames: [
        {
          id: 99,
          match_series_id: 5,
          match_game_index: 1,
          event_participant_id: 10,
          is_team_game: false,
          score: 220,
        },
      ],
      isTeamEvent: false,
      maxGameCount: 1,
    });
    expect(model.columns[0].matches[0].participants[0].scores[0].score).toBe(220);
    expect(model.columns[0].matches[0].participants[0].scores[0].disabled).toBe(false);
  });
});
