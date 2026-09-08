import { describe, expect, it } from 'vitest';
import {
  buildBakerLeagueReconcileRows,
  sortBakerLeagueReconcileRows,
} from '@/utils/bakerLeagueReconcile';

const makeGame = (
  id: number,
  teamId: number,
  gameNumber: number,
  score: number
) =>
  ({
    id,
    team_id: teamId,
    game_number: gameNumber,
    score,
    is_team_game: true,
  }) as never;

describe('buildBakerLeagueReconcileRows', () => {
  it('builds one result per team per game from league schedule', () => {
    const rows = buildBakerLeagueReconcileRows({
      teams: [
        { id: 101, team_number: 1, team_name: 'Team 1' },
        { id: 102, team_number: 2, team_name: 'Team 2' },
        { id: 103, team_number: 3, team_name: 'Team 3' },
        { id: 104, team_number: 4, team_name: 'Team 4' },
      ],
      allGames: [
        makeGame(1, 101, 1, 257),
        makeGame(2, 102, 1, 220),
        makeGame(3, 103, 1, 199),
        makeGame(4, 104, 1, 201),
        makeGame(5, 101, 2, 212),
        makeGame(6, 103, 2, 222),
        makeGame(7, 102, 2, 180),
        makeGame(8, 104, 2, 180),
      ],
      gameCount: 2,
      scheduledGames: 2,
      bonusPinsByTeamId: new Map([
        [101, 30],
        [102, 0],
        [103, 30],
        [104, 60],
      ]),
    });

    expect(rows).toHaveLength(4);
    expect(rows[0].teamLabel).toBe('Team 1');
    expect(rows[0].cells[0].score).toBe(257);
    expect(rows[0].cells[0].result).toBe('W');
    expect(rows[0].cells[1].score).toBe(212);
    expect(rows[0].cells[1].result).toBe('L');
    expect(rows[0].wins + rows[0].losses + rows[0].ties).toBe(2);
    expect(rows[0].bonusPins).toBe(30);
    expect(rows[0].totalPinfall).toBe(469);
    expect(rows[0].totalWithBonus).toBe(499);

    const team4 = rows.find((row) => row.teamId === 104);
    expect(team4?.wins).toBe(1);
    expect(team4?.ties).toBe(1);
    expect(team4?.bonusPins).toBe(60);
    expect(team4?.totalPinfall).toBe(381);
    expect(team4?.totalWithBonus).toBe(441);
  });

  it('uses standings order for the position round game', () => {
    const rows = buildBakerLeagueReconcileRows({
      teams: [
        { id: 101, team_number: 1, team_name: 'Alpha' },
        { id: 102, team_number: 2, team_name: 'Bravo' },
        { id: 103, team_number: 3, team_name: 'Charlie' },
        { id: 104, team_number: 4, team_name: 'Delta' },
      ],
      allGames: [
        makeGame(11, 101, 3, 220),
        makeGame(12, 103, 3, 219),
        makeGame(13, 102, 3, 210),
        makeGame(14, 104, 3, 190),
      ],
      gameCount: 3,
      scheduledGames: 3,
      positionRoundGame: 3,
      roundParticipants: [
        { team_id: 101, position: 2, round_id: 1, user_id: 1, user_name: 'a', event_participant_id: 1, total_score: 0, total_pinfall: 0, highest_single_game: 0, highest_scratch_game: 0, highest_handicap_game: 0, lowest_single_game: 0 } as never,
        { team_id: 103, position: 1, round_id: 1, user_id: 2, user_name: 'b', event_participant_id: 2, total_score: 0, total_pinfall: 0, highest_single_game: 0, highest_scratch_game: 0, highest_handicap_game: 0, lowest_single_game: 0 } as never,
        { team_id: 102, position: 3, round_id: 1, user_id: 3, user_name: 'c', event_participant_id: 3, total_score: 0, total_pinfall: 0, highest_single_game: 0, highest_scratch_game: 0, highest_handicap_game: 0, lowest_single_game: 0 } as never,
        { team_id: 104, position: 4, round_id: 1, user_id: 4, user_name: 'd', event_participant_id: 4, total_score: 0, total_pinfall: 0, highest_single_game: 0, highest_scratch_game: 0, highest_handicap_game: 0, lowest_single_game: 0 } as never,
      ],
    });

    const alpha = rows.find((row) => row.teamId === 101);
    const charlie = rows.find((row) => row.teamId === 103);
    expect(alpha?.cells[2].opponentTeamId).toBe(103);
    expect(alpha?.cells[2].result).toBe('W');
    expect(charlie?.cells[2].result).toBe('L');
  });

  it('sorts by place or team number', () => {
    const rows = buildBakerLeagueReconcileRows({
      teams: [
        { id: 101, team_number: 3, team_name: 'Team 3' },
        { id: 102, team_number: 1, team_name: 'Team 1' },
        { id: 103, team_number: 4, team_name: 'Team 4' },
        { id: 104, team_number: 2, team_name: 'Team 2' },
      ],
      allGames: [
        makeGame(21, 101, 1, 240),
        makeGame(22, 102, 1, 200),
        makeGame(23, 103, 1, 230),
        makeGame(24, 104, 1, 210),
      ],
      gameCount: 1,
      scheduledGames: 1,
      bonusPinsByTeamId: new Map([
        [101, 30],
        [102, 0],
        [103, 60],
        [104, 15],
      ]),
    });

    expect(sortBakerLeagueReconcileRows(rows, 'team_number').map((row) => row.teamId)).toEqual([
      102, 104, 101, 103,
    ]);
    expect(sortBakerLeagueReconcileRows(rows, 'place').map((row) => row.teamId)).toEqual([
      103, 101, 104, 102,
    ]);
  });
});
