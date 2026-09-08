import { describe, expect, it } from 'vitest';
import { gameStyleDisplayLabel, pickRoundGameScoring } from '../../src/utils/roundGameScoring';
import { matchSeriesSideLabel } from '../../src/utils/matchSeriesSideLabel';
import type { MatchSeriesParticipant, MatchSeriesRead } from '../../src/api/round-match-series';

function part(
  side: number,
  patch: Partial<MatchSeriesParticipant> = {}
): MatchSeriesParticipant {
  return {
    id: side + 1,
    match_series_id: 1,
    side,
    event_participant_id: null,
    team_id: null,
    seed_order: null,
    ...patch,
  };
}

function seriesStub(parts: MatchSeriesParticipant[]): MatchSeriesRead {
  return {
    id: 1,
    round_id: 1,
    event_id: 1,
    race_to_wins: 1,
    max_games: 1,
    status: 'pending',
    wins_side_0: 0,
    wins_side_1: 0,
    winner_side: null,
    display_order: 0,
    bracket_template: null,
    match_label: null,
    participants: parts,
  };
}

describe('roundGameScoring', () => {
  it('pickRoundGameScoring defaults to standard without DYLG', () => {
    expect(pickRoundGameScoring({})).toEqual({
      game_style: 'standard',
      dylg_enabled: false,
      dylg_scope: null,
      dylg_drop_count: null,
    });
  });

  it('baker DYLG forces team scope and default drop 1', () => {
    expect(
      pickRoundGameScoring({
        game_style: 'baker',
        dylg_enabled: true,
        dylg_scope: 'individual',
        game_count: 4,
      })
    ).toEqual({
      game_style: 'baker',
      dylg_enabled: true,
      dylg_scope: 'team',
      dylg_drop_count: 1,
    });
  });

  it('gameStyleDisplayLabel ignores DYLG flags', () => {
    expect(
      gameStyleDisplayLabel({ game_style: 'baker', dylg_enabled: true, dylg_scope: 'team' })
    ).toBe('Baker');
    expect(gameStyleDisplayLabel({ game_style: 'standard', dylg_enabled: true })).toBe(
      'Standard'
    );
  });
});

describe('matchSeriesSideLabel', () => {
  it('uses team and participant maps when provided', () => {
    const s = seriesStub([part(0, { team_id: 10 }), part(1, { event_participant_id: 20 })]);
    expect(
      matchSeriesSideLabel(s, 0, {
        isTeamEvent: true,
        teamNames: new Map([[10, 'Alley Cats']]),
      })
    ).toBe('Alley Cats');
    expect(
      matchSeriesSideLabel(s, 1, {
        isTeamEvent: false,
        participantNames: new Map([[20, 'Alex']]),
      })
    ).toBe('Alex');
  });

  it('falls back to seed/place labels', () => {
    const s = seriesStub([part(0, { seed_order: 3 }), part(1, { seed_order: 4 })]);
    expect(matchSeriesSideLabel(s, 0)).toBe('Seed 3');
    expect(matchSeriesSideLabel(s, 1, { isPosition: true })).toBe('Place 4');
  });
});
