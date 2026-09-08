import axiosInstance from '../api/axios';
import {
  FrameDataUpdate,
  GameRead,
  GameWithFrames,
  UnifiedBatchGameRequest,
  UnifiedBatchGameResponse,
  TeamMemberScoreBatchRequest,
} from '../types/game';

const GAME_ENDPOINTS = {
  GAMES: '/games',
  GAME: (id: number) => `/games/${id}`,
  GAME_FRAMES: (id: number) => `/games/${id}/frames`,
  GAME_VERIFY: (id: number) => `/games/${id}/verify`,
  GAME_REJECT: (id: number) => `/games/${id}/reject`,
  GAME_ADD_FRAME_DATA: (id: number) => `/games/${id}/add-frame-data`,
  ROUND_GAMES: (roundId: number) => `/games/round/${roundId}`,
  SQUAD_GAMES: (squadId: number) => `/games/squad/${squadId}`,
  TOURNAMENT_GAMES: (tournamentId: number) => `/games/tournament/${tournamentId}`,
};

/**
 * Games API service.
 * Score writes use POST /games/batch/unified and POST /games/batch/team-member-scores
 * (see unifiedBatchGameOperation, batchTeamMemberScores). CSV uploads go through RoundsAPI.
 */
export const GamesAPI = {
  getGames: async (params?: {
    skip?: number;
    limit?: number;
    round_id?: number;
    user_id?: number;
    min_score?: number;
    max_score?: number;
    verified_only?: boolean;
  }): Promise<GameRead[]> => {
    const response = await axiosInstance.get<GameRead[]>(GAME_ENDPOINTS.GAMES, { params });
    return response.data;
  },

  getGame: async (id: number): Promise<GameRead> => {
    const response = await axiosInstance.get<GameRead>(GAME_ENDPOINTS.GAME(id));
    return response.data;
  },

  deleteGame: async (id: number): Promise<void> => {
    await axiosInstance.delete(GAME_ENDPOINTS.GAME(id));
  },

  getGameWithFrames: async (id: number): Promise<GameWithFrames> => {
    const response = await axiosInstance.get<GameWithFrames>(GAME_ENDPOINTS.GAME_FRAMES(id));
    return response.data;
  },

  /** Mark a scored game verified (TD/admin + GAME_SCORING). verified_by must be the caller. */
  verifyGame: async (id: number, verifiedBy: number): Promise<GameRead> => {
    const response = await axiosInstance.post<GameRead>(GAME_ENDPOINTS.GAME_VERIFY(id), {
      verified_by: verifiedBy,
    });
    return response.data;
  },

  /** Reject a game score (TD/admin + GAME_SCORING). Runs async processing by default. */
  rejectGame: async (
    id: number,
    rejectionReason: string,
    options?: { synchronous?: boolean }
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await axiosInstance.post<{ success: boolean; message?: string }>(
      GAME_ENDPOINTS.GAME_REJECT(id),
      { rejection_reason: rejectionReason },
      { params: options?.synchronous ? { synchronous: true } : undefined }
    );
    return response.data;
  },

  /** Store optional frame notation metadata (does not recalculate score). */
  addFrameData: async (id: number, payload: FrameDataUpdate): Promise<GameRead> => {
    const response = await axiosInstance.put<GameRead>(
      GAME_ENDPOINTS.GAME_ADD_FRAME_DATA(id),
      payload
    );
    return response.data;
  },

  getGamesByRound: async (
    roundId: number,
    params?: {
      skip?: number;
      limit?: number;
      game_number?: number;
      user_id?: number;
      verified_only?: boolean;
      /** When true, only team aggregate shells (Baker / team score sheet). */
      is_team_game?: boolean;
    }
  ): Promise<GameRead[]> => {
    const response = await axiosInstance.get<GameRead[]>(GAME_ENDPOINTS.ROUND_GAMES(roundId), { params });
    return response.data;
  },

  getGamesBySquad: async (
    squadId: number,
    params?: {
      skip?: number;
      limit?: number;
      game_number?: number;
      user_id?: number;
      verified_only?: boolean;
    }
  ): Promise<GameRead[]> => {
    const response = await axiosInstance.get<GameRead[]>(GAME_ENDPOINTS.SQUAD_GAMES(squadId), { params });
    return response.data;
  },

  getAllGamesBySquad: async (squadId: number, pageSize = 250): Promise<GameRead[]> => {
    const allGames: GameRead[] = [];
    let skip = 0;

    while (true) {
      const page = await GamesAPI.getGamesBySquad(squadId, { skip, limit: pageSize });
      allGames.push(...page);

      if (page.length < pageSize) {
        break;
      }

      skip += pageSize;
    }

    return allGames;
  },

  getTournamentGames: async (tournamentId: number): Promise<GameRead[]> => {
    const response = await axiosInstance.get<GameRead[]>(GAME_ENDPOINTS.TOURNAMENT_GAMES(tournamentId));
    return response.data;
  },

  batchTeamMemberScores: async (request: TeamMemberScoreBatchRequest): Promise<UnifiedBatchGameResponse> => {
    const response = await axiosInstance.post<UnifiedBatchGameResponse>('/games/batch/team-member-scores', request);
    return response.data;
  },

  unifiedBatchGameOperation: async (request: UnifiedBatchGameRequest): Promise<UnifiedBatchGameResponse> => {
    const response = await axiosInstance.post<UnifiedBatchGameResponse>('/games/batch/unified', request);
    return response.data;
  },
};
