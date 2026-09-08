import axiosInstance from '../api/axios';
import axios from 'axios';
import { 
  RoundRead, 
  RoundCreate, 
  RoundUpdate, 
  RoundWithFormat,
  RoundWithGames,
  RoundWithEvent,
  RoundSummary,
  RoundParticipant,
  RoundFlowStatus,
  RoundEditabilityStatus,
  RoundFormatRead,
} from '../types/round';
import { EventWithRounds } from '../types/event';
import type { CsvScoreImportResponse } from '../types/round_score_csv';
import type { TeamScoringMode } from '../hooks/useScoringTabMode';

// API endpoints
const ROUND_ENDPOINTS = {
  ROUNDS: '/rounds',
  ROUND: (id: number) => `/rounds/${id}`,
  EVENT_ROUNDS: (eventId: number) => `/events/${eventId}/rounds`,
  ROUND_GAMES: (roundId: number) => `/rounds/${roundId}/with-games`,
  ROUND_WITH_EVENT: (roundId: number) => `/rounds/${roundId}/with-event`,
  ROUND_SUMMARY: (roundId: number) => `/rounds/${roundId}/summary`,
  ROUND_PARTICIPANTS: (roundId: number) => `/rounds/${roundId}/participants`,
  COMPLETE_ROUND: (roundId: number) => `/rounds/${roundId}/complete`,
  UNLOCK_ROUND: (roundId: number) => `/rounds/${roundId}/unlock`,
  GAME_COUNT_ADJUST: (roundId: number) => `/rounds/${roundId}/game-count-adjust`,
};

export interface RoundGameCountAdjustResponse {
  round_id: number;
  game_count: number;
  games_created: number;
  games_deleted: number;
  shells_only_for_locked_squads: boolean;
}

export const RoundsAPI = {
  /**
   * Get all rounds
   * @param params Optional filter parameters
   * @returns Promise with array of rounds
   */
  getRounds: async (
    params?: { 
      event_id?: number; 
      status?: string; 
      skip?: number;
      limit?: number;
    }
  ): Promise<RoundRead[]> => {
    const response = await axiosInstance.get<RoundRead[]>(ROUND_ENDPOINTS.ROUNDS, { params });
    return response.data;
  },

  /**
   * Get a specific round by ID
   * @param roundId Round ID
   * @returns Promise with round data
   */
  getRound: async (roundId: number): Promise<RoundRead> => {
    const response = await axiosInstance.get<RoundRead>(ROUND_ENDPOINTS.ROUND(roundId));
    return response.data;
  },

  /** Saved round formats (global list). Use a valid id when creating rounds — do not assume id 1 exists. */
  getRoundFormats: async (): Promise<RoundFormatRead[]> => {
    const response = await axiosInstance.get<RoundFormatRead[]>(`${ROUND_ENDPOINTS.ROUNDS}/formats`);
    return response.data;
  },

  /**
   * Get a round with its format data
   * @param roundId Round ID
   * @returns Promise with round and format data
   */
  getRoundWithFormat: async (roundId: number): Promise<RoundWithFormat> => {
    const response = await axiosInstance.get<RoundWithFormat>(`${ROUND_ENDPOINTS.ROUND(roundId)}/with-format`);
    return response.data;
  },

  /**
   * Get a round with its games
   * @param roundId Round ID
   * @returns Promise with round and games data
   */
  getRoundWithGames: async (roundId: number): Promise<RoundWithGames> => {
    const response = await axiosInstance.get<RoundWithGames>(ROUND_ENDPOINTS.ROUND_GAMES(roundId));
    return response.data;
  },

  /**
   * Get a round with its event
   * @param roundId Round ID
   * @returns Promise with round and event data
   */
  getRoundWithEvent: async (roundId: number): Promise<RoundWithEvent> => {
    const response = await axiosInstance.get<RoundWithEvent>(
      ROUND_ENDPOINTS.ROUND_WITH_EVENT(roundId)
    );
    return response.data;
  },

  /**
   * Get rounds for a specific event
   * @param eventId Event ID
   * @returns Promise with array of rounds
   */
  getEventRounds: async (eventId: number): Promise<RoundRead[]> => {
    const response = await axiosInstance.get<EventWithRounds>(ROUND_ENDPOINTS.EVENT_ROUNDS(eventId));
    return response.data.rounds;
  },

  /**
   * Create a new round
   * @param roundData Round data to create
   * @returns Promise with created round
   */
  createRound: async (roundData: RoundCreate): Promise<RoundRead> => {
    const response = await axiosInstance.post<RoundRead>(ROUND_ENDPOINTS.ROUNDS, roundData);
    return response.data;
  },

  /**
   * Update an existing round
   * @param roundId Round ID
   * @param roundData Updated round data
   * @returns Promise with updated round
   */
  updateRound: async (roundId: number, roundData: RoundUpdate): Promise<RoundRead> => {
    const response = await axiosInstance.patch<RoundRead>(ROUND_ENDPOINTS.ROUND(roundId), roundData);
    return response.data;
  },

  adjustRoundGameCount: async (
    roundId: number,
    body: { delta: 1 | -1; confirm_delete_scored?: boolean }
  ): Promise<RoundGameCountAdjustResponse> => {
    const response = await axiosInstance.post<RoundGameCountAdjustResponse>(
      ROUND_ENDPOINTS.GAME_COUNT_ADJUST(roundId),
      {
        delta: body.delta,
        confirm_delete_scored: body.confirm_delete_scored ?? false,
      }
    );
    return response.data;
  },

  /**
   * Delete a round
   * @param roundId Round ID
   * @returns Promise with deletion status
   */
  deleteRound: async (roundId: number): Promise<void> => {
    await axiosInstance.delete(ROUND_ENDPOINTS.ROUND(roundId));
  },

  /**
   * Get participants in a round with their scores/standings
   * @param roundId Round ID
   * @returns Promise with array of round participants
   */
  getRoundParticipants: async (roundId: number): Promise<RoundParticipant[]> => {
    const response = await axiosInstance.get<RoundParticipant[]>(ROUND_ENDPOINTS.ROUND_PARTICIPANTS(roundId));
    return response.data;
  },

  /** Carry totals from incoming relationships' source rounds (for visual carry columns). */
  getCarryOverTotalsForRound: async (
    roundId: number
  ): Promise<{
    relationships: Record<
      string,
      {
        source_round_id: number;
        by_event_participant_id: Record<string, { total_pinfall: number; total_score: number }>;
        by_team_id: Record<string, { total_pinfall: number; total_score: number }>;
      }
    >;
  }> => {
    const response = await axiosInstance.get(`${ROUND_ENDPOINTS.ROUND(roundId)}/carry-over-totals`);
    return response.data;
  },

  /**
   * Get a summary of a single round (high game/series, averages).
   */
  getRoundSummary: async (roundId: number): Promise<RoundSummary> => {
    const response = await axiosInstance.get<RoundSummary>(
      ROUND_ENDPOINTS.ROUND_SUMMARY(roundId)
    );
    return response.data;
  },

  /**
   * Complete a round and trigger automatic advancement
   * @param roundId Round ID
   * @returns Promise with completion and advancement results
   */
  completeRound: async (roundId: number): Promise<{
    success: boolean;
    message: string;
    round_id: number;
    round_status: string;
    advancement: unknown;
  }> => {
    const response = await axiosInstance.post(ROUND_ENDPOINTS.COMPLETE_ROUND(roundId));
    return response.data;
  },

  /**
   * Unlock a round
   * @param roundId Round ID
   * @returns Promise with unlock results
   */
  unlockRound: async (roundId: number): Promise<{
    message: string;
    round_id: number;
    round_number: number;
    friendly_name: string;
    games_deleted: number;
    squads_processed: number;
  }> => {
    const response = await axiosInstance.post(ROUND_ENDPOINTS.UNLOCK_ROUND(roundId));
    return response.data;
  },

  // Get round flow status
  getRoundFlowStatus: async (roundId: number): Promise<RoundFlowStatus> => {
    const response = await axiosInstance.get(`/rounds/${roundId}/flow-status`);
    return response.data;
  },

  // Check if a round can be edited
  getRoundEditabilityStatus: async (roundId: number): Promise<RoundEditabilityStatus> => {
    const response = await axiosInstance.get(`/rounds/${roundId}/editability-status`);
    return response.data;
  },

  // Get real-time round status (backend uses actual Game row counts, not participant×game_count)
  getRoundRealTimeStatus: async (roundId: number): Promise<RoundRealTimeStatus> => {
    const response = await axiosInstance.get(`/rounds/${roundId}/real-time-status`);
    return response.data;
  },

  downloadRoundScoresCsvTemplate: async (
    roundId: number,
    scoringMode: TeamScoringMode
  ): Promise<Blob> => {
    try {
      const response = await axiosInstance.get(
        `/rounds/${roundId}/scores/csv-template`,
        {
          params: { scoring_mode: scoringMode },
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (err: unknown) {
      // Axios error bodies are Blobs when responseType is blob — unwrap JSON envelope.
      if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text) as { error?: string; message?: string; detail?: string };
          const msg =
            (typeof parsed.error === 'string' && parsed.error) ||
            (typeof parsed.message === 'string' && parsed.message) ||
            (typeof parsed.detail === 'string' && parsed.detail) ||
            null;
          if (msg) {
            throw new Error(msg);
          }
        } catch (inner) {
          if (inner instanceof Error && inner.message && inner.message !== 'Unexpected end of JSON input') {
            throw inner;
          }
        }
      }
      throw err;
    }
  },

  uploadRoundScoresCsv: async (
    roundId: number,
    scoringMode: TeamScoringMode,
    file: File
  ): Promise<CsvScoreImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    // Large team/baker sheets (hundreds–thousands of cells) exceed the default 15s axios timeout.
    const response = await axiosInstance.post<CsvScoreImportResponse>(
      `/rounds/${roundId}/scores/csv`,
      formData,
      {
        params: { scoring_mode: scoringMode },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      }
    );
    return response.data;
  },
};

/** GET /rounds/{id}/real-time-status */
export interface RoundRealTimeStatus {
  round_id: number;
  status: string;
  /** Shell rows in DB for this round */
  total_games: number;
  scored_games: number;
  pending_games: number;
  all_scored: boolean;
  roster_gates_pass?: boolean;
  scoring_complete?: boolean;
  is_match_play?: boolean;
  total_series?: number;
  completed_series?: number;
  pending_series?: number;
  /** Aliases for older clients; same as total_games / scored_games */
  total_expected_games: number;
  completed_games: number;
  in_progress_games: number;
}