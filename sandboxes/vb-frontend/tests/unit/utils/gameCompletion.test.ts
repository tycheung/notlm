import { describe, expect, it } from 'vitest';
import {
  aggregateRoundCompletionCounts,
  filterGamesForAggregateRoundCompletion,
  gameCountsAsScoredForRoundCompletion,
} from '../../../src/utils/gameCompletion';

describe('gameCompletion', () => {
  it('counts zero scratch as scored', () => {
    expect(
      gameCountsAsScoredForRoundCompletion({ score: 0, status: 'completed' })
    ).toBe(true);
  });

  it('uses team shells when full set exists and member shells are pending', () => {
    const games = [
      {
        squad_id: 1,
        team_id: 10,
        game_number: 1,
        is_team_game: false,
        score: null,
      },
      {
        squad_id: 1,
        team_id: 10,
        game_number: 2,
        is_team_game: false,
        score: null,
      },
      {
        squad_id: 1,
        team_id: 10,
        game_number: 1,
        is_team_game: true,
        score: 200,
        status: 'completed',
      },
      {
        squad_id: 1,
        team_id: 10,
        game_number: 2,
        is_team_game: true,
        score: 180,
        status: 'completed',
      },
    ];
    const filtered = filterGamesForAggregateRoundCompletion(games, {
      isTeamEvent: true,
      expectedGameCount: 2,
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((g) => g.is_team_game === true)).toBe(true);

    const counts = aggregateRoundCompletionCounts(games, {
      isTeamEvent: true,
      expectedGameCount: 2,
    });
    expect(counts).toEqual({ total: 2, scored: 2, allScored: true });
  });

  it('prefers member rows when full team set exists but only members are scored', () => {
    const games = [
      { squad_id: 1, team_id: 10, game_number: 1, is_team_game: true, score: null },
      { squad_id: 1, team_id: 10, game_number: 2, is_team_game: true, score: null },
      { squad_id: 1, team_id: 10, game_number: 1, is_team_game: false, score: 190, status: 'completed' },
      { squad_id: 1, team_id: 10, game_number: 2, is_team_game: false, score: 200, status: 'completed' },
    ];
    const counts = aggregateRoundCompletionCounts(games, {
      isTeamEvent: true,
      expectedGameCount: 2,
    });
    expect(counts).toEqual({ total: 2, scored: 2, allScored: true });
  });

  it('prefers scored team rows over pending member shells', () => {
    const games = [
      { squad_id: 1, team_id: 10, game_number: 1, is_team_game: true, score: 200, status: 'completed' },
      { squad_id: 1, team_id: 10, game_number: 2, is_team_game: true, score: 180, status: 'completed' },
      { squad_id: 1, team_id: 10, game_number: 1, is_team_game: false, score: null },
      { squad_id: 1, team_id: 10, game_number: 2, is_team_game: false, score: null },
    ];
    const counts = aggregateRoundCompletionCounts(games, {
      isTeamEvent: true,
      expectedGameCount: 4,
    });
    expect(counts).toEqual({ total: 2, scored: 2, allScored: true });
  });

  it('uses team rows when member shells are absent', () => {
    const games = [
      { squad_id: 1, team_id: 10, game_number: 1, is_team_game: true, score: 200, status: 'completed' },
      { squad_id: 1, team_id: 10, game_number: 2, is_team_game: true, score: 180, status: 'completed' },
    ];
    const counts = aggregateRoundCompletionCounts(games, {
      isTeamEvent: true,
      expectedGameCount: 3,
    });
    expect(counts).toEqual({ total: 2, scored: 2, allScored: true });
  });

  it('does not filter singles events', () => {
    const games = [
      { squad_id: 1, game_number: 1, is_team_game: false, score: 210 },
      { squad_id: 1, game_number: 2, is_team_game: false, score: null },
    ];
    const filtered = filterGamesForAggregateRoundCompletion(games, {
      isTeamEvent: false,
      expectedGameCount: 2,
    });
    expect(filtered).toHaveLength(2);
  });
});
