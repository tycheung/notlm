import { describe, expect, it } from 'vitest';
import type { GameRead } from '../../../src/types/game';
import {
  buildBakerLeagueLaneRows,
  previewLanesByTeamIdFromPreview,
  sortBakerLeagueLaneRows,
} from '../../../src/utils/bakerLeagueLaneAssignments';

function game(partial: Partial<GameRead> & Pick<GameRead, 'id' | 'game_number'>): GameRead {
  return {
    user_id: 1,
    event_participant_id: 1,
    score: null,
    verified: false,
    is_complete: false,
    is_shell: true,
    created_at: '2026-01-01T00:00:00Z',
    is_team_game: true,
    ...partial,
  };
}

describe('bakerLeagueLaneAssignments', () => {
  it('prefers stamped shells, then movement preview, then position-round place lanes', () => {
    const preview = new Map<number, Array<number | null>>([
      [10, [5, null]],
      [11, [3, null]],
    ]);
    const rows = buildBakerLeagueLaneRows({
      teams: [
        { id: 10, team_number: 2, team_name: 'Alley Cats' },
        { id: 11, team_number: 1, team_name: 'Pin Crushers' },
      ],
      allGames: [game({ id: 1, team_id: 10, game_number: 1, assigned_lane: 9 })],
      gameCount: 2,
      scheduledGames: 2,
      previewLanesByTeamId: preview,
      positionRoundGame: 2,
      positionRoundLanePlacement: 'start_low',
      pairsInPlay: [
        [1, 2],
        [3, 4],
      ],
      roundParticipants: [
        { team_id: 10, position: 1 } as never,
        { team_id: 11, position: 2 } as never,
      ],
    });

    const alley = rows.find((r) => r.teamId === 10)!;
    const pins = rows.find((r) => r.teamId === 11)!;
    // Stamped shell wins over preview for game 1.
    expect(alley.lanesByGame[0]).toBe(9);
    expect(pins.lanesByGame[0]).toBe(3);
    // Position round uses standings place → lane (1→lane1, 2→lane2 with start_low).
    expect(alley.lanesByGame[1]).toBe(1);
    expect(pins.lanesByGame[1]).toBe(2);
  });

  it('sorts by team number, lane for a selected game, or standings', () => {
    const base = buildBakerLeagueLaneRows({
      teams: [
        { id: 10, team_number: 2, team_name: 'B' },
        { id: 11, team_number: 1, team_name: 'A' },
        { id: 12, team_number: 3, team_name: 'C' },
      ],
      allGames: [
        game({ id: 1, team_id: 10, game_number: 1, assigned_lane: 9 }),
        game({ id: 2, team_id: 11, game_number: 1, assigned_lane: 2 }),
        game({ id: 3, team_id: 12, game_number: 1, assigned_lane: 4 }),
        game({ id: 4, team_id: 10, game_number: 2, assigned_lane: 1 }),
        game({ id: 5, team_id: 11, game_number: 2, assigned_lane: 8 }),
        game({ id: 6, team_id: 12, game_number: 2, assigned_lane: 3 }),
      ],
      gameCount: 2,
      roundParticipants: [
        { team_id: 10, position: 2 } as never,
        { team_id: 11, position: 3 } as never,
        { team_id: 12, position: 1 } as never,
      ],
    });

    expect(sortBakerLeagueLaneRows(base, 'team').map((r) => r.teamId)).toEqual([
      11, 10, 12,
    ]);
    expect(sortBakerLeagueLaneRows(base, 'lane', 1).map((r) => r.teamId)).toEqual([
      11, 12, 10,
    ]);
    expect(sortBakerLeagueLaneRows(base, 'lane', 2).map((r) => r.teamId)).toEqual([
      10, 12, 11,
    ]);
    expect(sortBakerLeagueLaneRows(base, 'standings').map((r) => r.teamId)).toEqual([
      12, 10, 11,
    ]);
  });

  it('maps preview team keys into lane arrays', () => {
    const map = previewLanesByTeamIdFromPreview({
      byTeam: [
        { key: 'team:10', lanesByGame: [1, 3] },
        { key: 'sp:99', lanesByGame: [2, 4] },
      ],
    });
    expect(map.get(10)).toEqual([1, 3]);
    expect(map.has(99)).toBe(false);
  });
});
