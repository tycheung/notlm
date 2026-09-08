import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GamesAPI } from '@/api/games';
import {
  mockAxiosDelete,
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosPut,
  resetAxiosMocks,
} from '../../helpers/mockAxios';

describe('GamesAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('getGamesBySquad calls squad games endpoint with filters', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 9, squad_id: 3 }] });

    const result = await GamesAPI.getGamesBySquad(3, { game_number: 2, verified_only: true });

    expect(mockAxiosGet).toHaveBeenCalledWith('/games/squad/3', {
      params: { game_number: 2, verified_only: true },
    });
    expect(result).toHaveLength(1);
  });

  it('getAllGamesBySquad pages until a short page is returned', async () => {
    mockAxiosGet
      .mockResolvedValueOnce({ data: Array.from({ length: 250 }, (_, i) => ({ id: i + 1 })) })
      .mockResolvedValueOnce({ data: [{ id: 251 }] });

    const result = await GamesAPI.getAllGamesBySquad(4, 250);

    expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(251);
  });

  it('unifiedBatchGameOperation posts unified batch payload', async () => {
    const payload = {
      temporary_shells: [],
      game_updates: [{ game_id: 10, score: 200 }],
      team_member_scores: [],
    };
    mockAxiosPost.mockResolvedValue({ data: { success: true, created_games: [], updated_games: [] } });

    const result = await GamesAPI.unifiedBatchGameOperation(payload);

    expect(mockAxiosPost).toHaveBeenCalledWith('/games/batch/unified', payload);
    expect(result.success).toBe(true);
  });

  it('batchTeamMemberScores posts team member score batch', async () => {
    const payload = {
      team_member_scores: [{ team_game_id: 8, event_participant_id: 2, score: 210 }],
    };
    mockAxiosPost.mockResolvedValue({ data: { success: true, created_games: [], updated_games: [] } });

    await GamesAPI.batchTeamMemberScores(payload);

    expect(mockAxiosPost).toHaveBeenCalledWith('/games/batch/team-member-scores', payload);
  });

  it('getGame fetches a single game by id', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 12, score: 200 } });

    const result = await GamesAPI.getGame(12);

    expect(mockAxiosGet).toHaveBeenCalledWith('/games/12');
    expect(result.score).toBe(200);
  });

  it('getGames passes list filters to the games endpoint', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 3 }] });

    await GamesAPI.getGames({ round_id: 5, verified_only: true });

    expect(mockAxiosGet).toHaveBeenCalledWith('/games', {
      params: { round_id: 5, verified_only: true },
    });
  });

  it('getGameWithFrames fetches game and frame data', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 7, frames: [{ frame_number: 1 }] } });

    const result = await GamesAPI.getGameWithFrames(7);

    expect(mockAxiosGet).toHaveBeenCalledWith('/games/7/frames');
    expect(result.frames).toHaveLength(1);
  });

  it('deleteGame calls delete on game id', async () => {
    mockAxiosDelete.mockResolvedValue({ data: null });

    await GamesAPI.deleteGame(15);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/games/15');
  });

  it('getGamesByRound fetches games for a round with filters', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 8, round_id: 5 }] });

    const result = await GamesAPI.getGamesByRound(5, { verified_only: true });

    expect(mockAxiosGet).toHaveBeenCalledWith('/games/round/5', {
      params: { verified_only: true },
    });
    expect(result).toHaveLength(1);
  });

  it('verifyGame posts verified_by for the current user', async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 7, verified: true, verified_by: 3 } });

    const result = await GamesAPI.verifyGame(7, 3);

    expect(mockAxiosPost).toHaveBeenCalledWith('/games/7/verify', { verified_by: 3 });
    expect(result.verified).toBe(true);
  });

  it('rejectGame posts rejection_reason and optional synchronous flag', async () => {
    mockAxiosPost.mockResolvedValue({ data: { success: true } });

    await GamesAPI.rejectGame(7, 'Wrong total', { synchronous: true });

    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/games/7/reject',
      { rejection_reason: 'Wrong total' },
      { params: { synchronous: true } }
    );
  });

  it('addFrameData puts frame metadata without score fields', async () => {
    mockAxiosPut.mockResolvedValue({ data: { id: 7, frame_by_frame: 'X-,9/' } });

    await GamesAPI.addFrameData(7, { frame_by_frame: 'X-,9/' });

    expect(mockAxiosPut).toHaveBeenCalledWith('/games/7/add-frame-data', {
      frame_by_frame: 'X-,9/',
    });
  });

  it('getTournamentGames fetches games for a tournament', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 2, round_id: 5 }] });

    const result = await GamesAPI.getTournamentGames(9);

    expect(mockAxiosGet).toHaveBeenCalledWith('/games/tournament/9');
    expect(result).toHaveLength(1);
  });
});
