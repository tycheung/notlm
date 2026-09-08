import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildCombinedUnifiedRequests,
  buildPendingGameScorePayloads,
  chunkArray,
  evaluateBatchSaveOutcome,
  mergeBatchResponses,
  persistPendingGameScores,
  prepareTeamMemberScoresForUnifiedBatch,
  remapTeamMemberScoresAfterUnified,
  resolveTeamGameIdForMember,
} from '../../../src/utils/pendingGameScoreSave';
import { GamesAPI } from '../../../src/api/games';
import type { GameRead } from '../../../src/types/game';

vi.mock('../../../src/api/games', () => ({
  GamesAPI: {
    unifiedBatchGameOperation: vi.fn(),
    batchTeamMemberScores: vi.fn(),
  },
}));

const baseGame = (overrides: Partial<GameRead>): GameRead =>
  ({
    id: 1,
    game_number: 1,
    user_id: 10,
    event_participant_id: 100,
    round_id: 5,
    squad_id: 2,
    score: null,
    is_team_game: false,
    ...overrides,
  }) as GameRead;

describe('buildPendingGameScorePayloads', () => {
  it('routes individual event updates into unified game_updates only', () => {
    const squadGames = [
      baseGame({ id: 10, event_participant_id: 100, game_number: 1 }),
      baseGame({ id: 11, event_participant_id: 100, game_number: 2 }),
      baseGame({ id: 12, event_participant_id: 101, game_number: 1 }),
    ];

    const result = buildPendingGameScorePayloads({
      squadGames,
      pendingGameChanges: {
        10: { score: 200 },
        11: { score: 210 },
        12: { score: 180 },
      },
      temporaryShells: {},
      isTeamEvent: false,
    });

    expect(result.gameUpdates).toHaveLength(3);
    expect(result.teamMemberScores).toHaveLength(0);
    expect(result.temporaryShellsData).toHaveLength(0);
  });

  it('skips pending changes with undefined score values', () => {
    const squadGames = [baseGame({ id: 10, event_participant_id: 100, game_number: 1 })];

    const result = buildPendingGameScorePayloads({
      squadGames,
      pendingGameChanges: {
        10: { score: undefined },
      },
      temporaryShells: {},
      isTeamEvent: false,
    });

    expect(result.gameUpdates).toHaveLength(0);
    expect(result.teamMemberScores).toHaveLength(0);
  });

  it('routes team mode aggregate scores into game_updates only', () => {
    const squadGames = [
      baseGame({
        id: 50,
        team_id: 7,
        is_team_game: true,
        event_participant_id: 200,
        game_number: 1,
      }),
      baseGame({
        id: 51,
        team_id: 7,
        is_team_game: true,
        event_participant_id: 200,
        game_number: 2,
      }),
    ];

    const result = buildPendingGameScorePayloads({
      squadGames,
      pendingGameChanges: {
        50: { score: 900 },
        51: { score: 850 },
      },
      temporaryShells: {},
      isTeamEvent: true,
      teamScoringMode: 'team',
    });

    expect(result.gameUpdates.map((u) => u.game_id).sort()).toEqual([50, 51]);
    expect(result.teamMemberScores).toHaveLength(0);
  });

  it('routes team individual mode member scores to team-member batch', () => {
    const squadGames = [
      baseGame({
        id: 60,
        team_id: 7,
        is_team_game: true,
        game_number: 1,
      }),
      baseGame({
        id: 61,
        parent_game_id: 60,
        team_id: 7,
        event_participant_id: 301,
        game_number: 1,
      }),
    ];

    const result = buildPendingGameScorePayloads({
      squadGames,
      pendingGameChanges: {
        61: { score: 220 },
      },
      temporaryShells: {
        'temp-member-302-1': {
          metadata: {
            event_participant_id: 302,
            user_id: 12,
            team_id: 7,
            team_game_id: 60,
            game_number: 1,
            round_id: 5,
            is_team_game: false,
          },
          pendingChanges: { score: 200 },
        },
        'temp-member-303-1': {
          metadata: {
            event_participant_id: 303,
            user_id: 13,
            team_id: 7,
            game_number: 1,
            round_id: 5,
            is_team_game: false,
          },
          pendingChanges: { score: 190 },
        },
      },
      isTeamEvent: true,
      teamScoringMode: 'individual',
    });

    expect(result.gameUpdates).toHaveLength(0);
    expect(result.teamMemberScores).toHaveLength(3);
    expect(result.temporaryShellsData).toHaveLength(0);
  });

  it('mixed mode drops member updates when team score is pending for same game', () => {
    const squadGames = [
      baseGame({
        id: 70,
        team_id: 9,
        is_team_game: true,
        game_number: 1,
      }),
      baseGame({
        id: 71,
        parent_game_id: 70,
        team_id: 9,
        event_participant_id: 401,
        game_number: 1,
      }),
    ];

    const result = buildPendingGameScorePayloads({
      squadGames,
      pendingGameChanges: {
        70: { score: 600 },
      },
      temporaryShells: {},
      isTeamEvent: true,
      teamScoringMode: 'mixed',
    });

    expect(result.gameUpdates).toEqual([{ game_id: 70, score: 600 }]);
    expect(result.teamMemberScores).toHaveLength(0);
  });

  it('mixed mode skips member score when team score is also pending for same game', () => {
    const squadGames = [
      baseGame({
        id: 70,
        team_id: 9,
        is_team_game: true,
        game_number: 1,
      }),
      baseGame({
        id: 71,
        parent_game_id: 70,
        team_id: 9,
        event_participant_id: 401,
        game_number: 1,
      }),
    ];

    const result = buildPendingGameScorePayloads({
      squadGames,
      pendingGameChanges: {
        70: { score: 600 },
        71: { score: 220 },
      },
      temporaryShells: {},
      isTeamEvent: true,
      teamScoringMode: 'mixed',
    });

    expect(result.gameUpdates).toHaveLength(0);
    expect(result.teamMemberScores).toHaveLength(0);
  });

  it('mixed mode drops team update when member scores are pending for same game', () => {
    const squadGames = [
      baseGame({
        id: 80,
        team_id: 10,
        is_team_game: true,
        game_number: 2,
      }),
      baseGame({
        id: 81,
        parent_game_id: 80,
        team_id: 10,
        event_participant_id: 501,
        game_number: 2,
      }),
    ];

    const result = buildPendingGameScorePayloads({
      squadGames,
      pendingGameChanges: {
        81: { score: 250 },
      },
      temporaryShells: {},
      isTeamEvent: true,
      teamScoringMode: 'mixed',
    });

    expect(result.gameUpdates).toHaveLength(0);
    expect(result.teamMemberScores).toHaveLength(1);
    expect(result.teamMemberScores[0].team_game_id).toBe(80);
  });

  it('mixed mode drops conflicting team and member pending changes for the same game', () => {
    const squadGames = [
      baseGame({
        id: 90,
        team_id: 11,
        is_team_game: true,
        game_number: 1,
      }),
    ];

    const result = buildPendingGameScorePayloads({
      squadGames,
      pendingGameChanges: {
        90: { score: 700 },
      },
      temporaryShells: {
        'temp-member-601-1': {
          metadata: {
            event_participant_id: 601,
            user_id: 20,
            team_id: 11,
            team_game_id: 90,
            game_number: 1,
            round_id: 5,
            is_team_game: false,
          },
          pendingChanges: { score: 230 },
        },
      },
      isTeamEvent: true,
      teamScoringMode: 'mixed',
    });

    expect(result.gameUpdates).toHaveLength(0);
    expect(result.teamMemberScores).toHaveLength(0);
  });

  it('mixed mode blocks member temp shell when temp team shell has pending score', () => {
    const squadGames = [
      baseGame({
        id: 95,
        team_id: 12,
        is_team_game: true,
        game_number: 1,
      }),
    ];

    const result = buildPendingGameScorePayloads({
      squadGames,
      pendingGameChanges: {},
      temporaryShells: {
        'temp-team-12-1': {
          metadata: {
            is_team_game: true,
            team_id: 12,
            game_number: 1,
            round_id: 5,
            event_participant_id: 701,
            user_id: 21,
          },
          pendingChanges: { score: 640 },
        },
        'temp-member-702-1': {
          metadata: {
            event_participant_id: 702,
            user_id: 22,
            team_id: 12,
            team_game_id: 95,
            game_number: 1,
            round_id: 5,
            is_team_game: false,
          },
          pendingChanges: { score: 215 },
        },
      },
      isTeamEvent: true,
      teamScoringMode: 'mixed',
    });

    expect(result.teamMemberScores).toHaveLength(0);
    expect(result.temporaryShellsData).toHaveLength(1);
    expect(result.temporaryShellsData[0].temp_id).toBe('temp-team-12-1');
  });
});

describe('buildCombinedUnifiedRequests', () => {
  it('combines shells and updates in a single request when under chunk limits', () => {
    const requests = buildCombinedUnifiedRequests(
      [
        {
          temp_id: 'temp-1',
          event_participant_id: 1,
          user_id: 2,
          game_number: 1,
          round_id: 5,
          is_team_game: false,
        },
      ],
      [{ game_id: 10, score: 200 }]
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].temporary_shells).toHaveLength(1);
    expect(requests[0].game_updates).toHaveLength(1);
  });

  it('returns empty array when there is nothing to persist', () => {
    expect(buildCombinedUnifiedRequests([], [], [])).toEqual([]);
  });

  it('builds a member-scores-only unified request when no shells or updates exist', () => {
    const memberScores = [
      { team_game_id: 12, event_participant_id: 301, score: 210 },
    ];
    const requests = buildCombinedUnifiedRequests([], [], memberScores);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual({
      temporary_shells: [],
      game_updates: [],
      team_member_scores: memberScores,
    });
  });

  it('splits large game update batches across multiple unified requests', () => {
    const updates = Array.from({ length: 401 }, (_, index) => ({
      game_id: index + 1,
      score: 200,
    }));

    const requests = buildCombinedUnifiedRequests([], updates);

    expect(requests).toHaveLength(2);
    expect(requests[0].game_updates).toHaveLength(400);
    expect(requests[1].game_updates).toHaveLength(1);
    expect(requests[1].team_member_scores).toEqual([]);
  });
});

describe('chunkArray', () => {
  it('returns empty array for empty input', () => {
    expect(chunkArray([], 10)).toEqual([]);
  });

  it('chunks items into fixed-size groups', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('mergeBatchResponses', () => {
  it('merges successes, mappings, and errors across responses', () => {
    const merged = mergeBatchResponses([
      {
        success: true,
        message: 'first',
        created_games: [{ id: 1 } as GameRead],
        updated_games: [],
        temp_id_mapping: { a: 1 },
        errors: [],
      },
      {
        success: false,
        message: 'second',
        created_games: [],
        updated_games: [{ id: 2 } as GameRead],
        temp_id_mapping: { b: 2 },
        errors: ['warn'],
      },
    ]);

    expect(merged.success).toBe(false);
    expect(merged.created_games).toHaveLength(1);
    expect(merged.updated_games).toHaveLength(1);
    expect(merged.temp_id_mapping).toEqual({ a: 1, b: 2 });
    expect(merged.errors).toEqual(['warn']);
    expect(merged.message).toContain('first');
  });
});

describe('evaluateBatchSaveOutcome', () => {
  it('treats explicit success as saved', () => {
    expect(evaluateBatchSaveOutcome({ success: true }, true)).toEqual({
      saveSucceeded: true,
      hasResults: false,
    });
  });

  it('treats result payloads without errors as saved', () => {
    expect(
      evaluateBatchSaveOutcome(
        { success: undefined, updated_games: [{ id: 3 } as GameRead], errors: [] },
        true
      )
    ).toEqual({ saveSucceeded: true, hasResults: true });
  });

  it('treats empty payload with no errors as saved when hadPayload is true', () => {
    expect(evaluateBatchSaveOutcome({ success: undefined, errors: [] }, true)).toEqual({
      saveSucceeded: true,
      hasResults: false,
    });
  });

  it('treats temp_id_mapping as a successful result', () => {
    expect(
      evaluateBatchSaveOutcome(
        { success: undefined, temp_id_mapping: { 'temp-1': 44 }, errors: [] },
        true
      )
    ).toEqual({ saveSucceeded: true, hasResults: true });
  });

  it('does not treat errors-only response as saved without explicit success', () => {
    expect(
      evaluateBatchSaveOutcome({ success: undefined, errors: ['failed'] }, false)
    ).toEqual({ saveSucceeded: false, hasResults: false });
  });

  it('treats created games as a successful batch result', () => {
    expect(
      evaluateBatchSaveOutcome(
        { success: true, created_games: [{ id: 1 } as GameRead], updated_games: [] },
        false
      )
    ).toEqual({ saveSucceeded: true, hasResults: true });
  });

  it('treats temp_id_mapping as a batch result signal', () => {
    expect(
      evaluateBatchSaveOutcome(
        { success: false, created_games: [], updated_games: [], temp_id_mapping: { a: 1 } },
        true
      )
    ).toEqual({ saveSucceeded: true, hasResults: true });
  });
});

describe('prepareTeamMemberScoresForUnifiedBatch', () => {
  it('fills team metadata from temporary shell entries', () => {
    const prepared = prepareTeamMemberScoresForUnifiedBatch(
      [
        {
          team_game_id: 0,
          event_participant_id: 302,
          score: 200,
          temp_id: 'temp-member-302-1',
        },
      ],
      {
        'temp-member-302-1': {
          metadata: {
            event_participant_id: 302,
            user_id: 12,
            team_id: 7,
            game_number: 2,
            round_id: 5,
            is_team_game: false,
          },
          pendingChanges: { score: 200 },
        },
      }
    );

    expect(prepared[0].team_id).toBe(7);
    expect(prepared[0].game_number).toBe(2);
  });

  it('returns member scores unchanged when temp shell is missing', () => {
    const entry = {
      team_game_id: 0,
      event_participant_id: 302,
      score: 200,
      temp_id: 'missing-shell',
    };
    expect(prepareTeamMemberScoresForUnifiedBatch([entry], {})).toEqual([entry]);
  });
});

describe('resolveTeamGameIdForMember', () => {
  it('prefers persisted team_game_id when present', () => {
    expect(
      resolveTeamGameIdForMember(
        {
          event_participant_id: 1,
          user_id: 2,
          team_id: 7,
          team_game_id: 55,
          game_number: 1,
          round_id: 5,
          is_team_game: false,
        },
        {}
      )
    ).toBe(55);
  });

  it('resolves temp team shell mapping when team_game_id is missing', () => {
    expect(
      resolveTeamGameIdForMember(
        {
          event_participant_id: 1,
          user_id: 2,
          team_id: 7,
          game_number: 1,
          round_id: 5,
          is_team_game: false,
        },
        { 'temp-team-7-1': 99 }
      )
    ).toBe(99);
  });

  it('returns null when team_game_id cannot be resolved', () => {
    expect(
      resolveTeamGameIdForMember(
        {
          event_participant_id: 1,
          user_id: 2,
          team_id: 7,
          game_number: 1,
          round_id: 5,
          is_team_game: false,
        },
        {}
      )
    ).toBeNull();
  });
});

describe('remapTeamMemberScoresAfterUnified', () => {
  it('resolves team_game_id from temp team shell mapping', () => {
    const remapped = remapTeamMemberScoresAfterUnified(
      [
        {
          team_game_id: 0,
          event_participant_id: 302,
          score: 200,
          temp_id: 'temp-member-302-1',
        },
      ],
      {
        'temp-member-302-1': {
          metadata: {
            event_participant_id: 302,
            user_id: 12,
            team_id: 7,
            game_number: 1,
            round_id: 5,
            is_team_game: false,
          },
          pendingChanges: { score: 200 },
        },
      },
      { 'temp-team-7-1': 99 }
    );

    expect(remapped[0].team_game_id).toBe(99);
  });

  it('returns entries unchanged when shell or mapping cannot resolve team_game_id', () => {
    const entry = {
      team_game_id: 0,
      event_participant_id: 302,
      score: 200,
      temp_id: 'temp-member-302-1',
    };
    expect(remapTeamMemberScoresAfterUnified([entry], {}, {})).toEqual([entry]);
    expect(
      remapTeamMemberScoresAfterUnified(
        [entry],
        {
          'temp-member-302-1': {
            metadata: {
              event_participant_id: 302,
              user_id: 12,
              team_id: 7,
              game_number: 1,
              round_id: 5,
              is_team_game: false,
            },
            pendingChanges: { score: 200 },
          },
        },
        {}
      )
    ).toEqual([entry]);
  });
});

describe('persistPendingGameScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(GamesAPI.unifiedBatchGameOperation).mockResolvedValue({
      success: true,
      message: 'ok',
      created_games: [],
      updated_games: [{ id: 10 } as GameRead],
      temp_id_mapping: { 'temp-team-7-1': 99 },
      errors: [],
    });
    vi.mocked(GamesAPI.batchTeamMemberScores).mockResolvedValue({
      success: true,
      message: 'ok',
      created_games: [],
      updated_games: [],
      temp_id_mapping: {},
      errors: [],
    });
  });

  it('sends team member scores in a single unified batch request', async () => {
    vi.mocked(GamesAPI.unifiedBatchGameOperation).mockResolvedValue({
      success: true,
      message: 'ok',
      created_games: [],
      updated_games: [],
      temp_id_mapping: { 'temp-team-7-1': 99 },
      errors: [],
    });

    await persistPendingGameScores(
      {
        teamMemberScores: [
          {
            team_game_id: 0,
            event_participant_id: 302,
            score: 200,
            temp_id: 'temp-member-302-1',
          },
        ],
        temporaryShellsData: [
          {
            temp_id: 'temp-team-7-1',
            event_participant_id: 200,
            user_id: 11,
            team_id: 7,
            game_number: 1,
            round_id: 5,
            is_team_game: true,
          },
        ],
        gameUpdates: [{ game_id: 50, score: 900 }],
      },
      {
        'temp-member-302-1': {
          metadata: {
            event_participant_id: 302,
            user_id: 12,
            team_id: 7,
            game_number: 1,
            round_id: 5,
            is_team_game: false,
          },
          pendingChanges: { score: 200 },
        },
      }
    );

    expect(GamesAPI.unifiedBatchGameOperation).toHaveBeenCalledTimes(1);
    expect(GamesAPI.batchTeamMemberScores).not.toHaveBeenCalled();
    expect(GamesAPI.unifiedBatchGameOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        temporary_shells: expect.any(Array),
        game_updates: expect.any(Array),
        team_member_scores: expect.arrayContaining([
          expect.objectContaining({
            event_participant_id: 302,
            score: 200,
            team_id: 7,
            game_number: 1,
          }),
        ]),
      })
    );
  });

  it('splits oversized unified payloads before batching member scores separately', async () => {
    const manyUpdates = Array.from({ length: 401 }, (_, index) => ({
      game_id: index + 1,
      score: 200,
    }));

    await persistPendingGameScores(
      {
        teamMemberScores: [
          {
            team_game_id: 80,
            event_participant_id: 501,
            score: 250,
          },
        ],
        temporaryShellsData: [],
        gameUpdates: manyUpdates,
      },
      {}
    );

    expect(GamesAPI.unifiedBatchGameOperation).toHaveBeenCalledTimes(2);
    expect(GamesAPI.batchTeamMemberScores).toHaveBeenCalledTimes(1);
  });
});
