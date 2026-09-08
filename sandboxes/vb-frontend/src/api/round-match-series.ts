import axiosInstance from './axios';

export interface MatchSeriesParticipant {
  side: number;
  event_participant_id: number | null;
  team_id: number | null;
  seed_order?: number | null;
}

export interface MatchSeriesRead {
  id: number;
  round_id: number;
  event_id: number;
  race_to_wins: number;
  max_games: number;
  status: string;
  wins_side_0: number;
  wins_side_1: number;
  winner_side: number | null;
  display_order: number;
  bracket_template: string | null;
  match_label: string | null;
  bracket_round?: number | null;
  bracket_slot?: number | null;
  feeder_a_series_id?: number | null;
  feeder_b_series_id?: number | null;
  bracket_segment?: string | null;
  feeder_loser_a_series_id?: number | null;
  feeder_loser_b_series_id?: number | null;
  participants: MatchSeriesParticipant[];
}

export interface MatchSeriesListResponse {
  round_id: number;
  match_series: MatchSeriesRead[];
}

const ROUND_MATCH_SERIES_ENDPOINTS = {
  LIST: (roundId: number) => `/rounds/${roundId}/match-series`,
  SWAP: (roundId: number) => `/rounds/${roundId}/match-series/swap`,
  SYNC_STRUCTURE: (roundId: number) => `/rounds/${roundId}/match-structure/sync`,
  STRUCTURE_READINESS: (roundId: number) =>
    `/rounds/${roundId}/match-structure/readiness`,
  GENERATE_STEPLADDER: (roundId: number) =>
    `/rounds/${roundId}/match-series/generate-stepladder`,
  POSITION_ROUND: (roundId: number) => `/rounds/${roundId}/match-series/position-round`,
  RESOLVE_WINNER: (roundId: number, matchSeriesId: number) =>
    `/rounds/${roundId}/match-series/${matchSeriesId}/resolve-winner`,
};

export interface MatchStructureReadiness {
  ready: boolean;
  code: string;
  message: string;
  is_initial_round: boolean;
  roster_units: number;
  roster_capacity: number | null;
  incomplete_source_rounds: Array<{
    round_id: number;
    round_number: number | null;
    friendly_name: string | null;
    status: string;
  }>;
  pool_count?: number;
  expected_from_relationships?: number;
  warnings?: string[];
}

export const RoundMatchSeriesAPI = {
  list: async (roundId: number): Promise<MatchSeriesListResponse> => {
    const response = await axiosInstance.get<MatchSeriesListResponse>(
      ROUND_MATCH_SERIES_ENDPOINTS.LIST(roundId)
    );
    return response.data;
  },

  getStructureReadiness: async (roundId: number): Promise<MatchStructureReadiness> => {
    const response = await axiosInstance.get<MatchStructureReadiness>(
      ROUND_MATCH_SERIES_ENDPOINTS.STRUCTURE_READINESS(roundId)
    );
    return response.data;
  },

  swapSlots: async (
    roundId: number,
    data: {
      from_series_id: number;
      from_side: 0 | 1;
      to_series_id: number;
      to_side: 0 | 1;
      purge_game_scores?: boolean;
    }
  ): Promise<{ round_id: number; swapped: boolean; updated_series: MatchSeriesRead[] }> => {
    const response = await axiosInstance.post<{
      round_id: number;
      swapped: boolean;
      updated_series: MatchSeriesRead[];
    }>(ROUND_MATCH_SERIES_ENDPOINTS.SWAP(roundId), data);
    return response.data;
  },

  generateStepladder: async (
    roundId: number,
    data: {
      ordered_seeds: number[];
      race_to_wins: number;
      max_games: number;
      is_teams?: boolean;
    }
  ): Promise<{ created: number; ids: number[] }> => {
    const response = await axiosInstance.post<{ created: number; ids: number[] }>(
      ROUND_MATCH_SERIES_ENDPOINTS.GENERATE_STEPLADDER(roundId),
      data
    );
    return response.data;
  },

  syncMatchStructure: async (
    roundId: number,
    opts?: { forceRebuild?: boolean }
  ): Promise<{ round_id: number; synced?: boolean; force_rebuild?: boolean; match_series?: MatchSeriesRead[] }> => {
    const force = opts?.forceRebuild === true;
    const response = await axiosInstance.post(
      ROUND_MATCH_SERIES_ENDPOINTS.SYNC_STRUCTURE(roundId),
      null,
      { params: force ? { force_rebuild: true } : undefined }
    );
    return response.data;
  },

  applyPositionRound: async (
    roundId: number,
    data: { game?: number | null; fill_from_standings?: boolean } = {}
  ): Promise<{
    round_id: number;
    position_round_game: number;
    series_updated: number;
    sides_filled: number;
    standings_rows: number;
    fill_from_standings: boolean;
    match_series: MatchSeriesRead[];
  }> => {
    const response = await axiosInstance.post(
      ROUND_MATCH_SERIES_ENDPOINTS.POSITION_ROUND(roundId),
      {
        game: data.game ?? undefined,
        fill_from_standings: data.fill_from_standings ?? true,
      }
    );
    return response.data;
  },

  resolveWinner: async (
    roundId: number,
    matchSeriesId: number,
    winnerSide: 0 | 1
  ): Promise<{
    round_id: number;
    match_series_id: number;
    winner_side: number;
    status: string;
    match_series: MatchSeriesRead[];
  }> => {
    const response = await axiosInstance.post(
      ROUND_MATCH_SERIES_ENDPOINTS.RESOLVE_WINNER(roundId, matchSeriesId),
      { winner_side: winnerSide }
    );
    return response.data;
  },
};

