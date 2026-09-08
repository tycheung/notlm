import axiosInstance from '../../api/axios';
import type {
  ApplyLaneAssignmentsPayload,
  ApplyLaneAssignmentsResponse,
  AutoBatchLaneAssignmentPayload,
  AutoBatchLaneAssignmentResponse,
  CopyLanesFromRoundPayload,
  CopyLanesFromRoundResponse,
  EventLaneManagementResponse,
  LaneAssignmentBoardResponse,
  LaneEngineConfig,
  LanePair,
  LaneScoreSheetResponse,
  StampLaneGamesPayload,
  StampLaneGamesResponse,
} from './types';

const endpoints = {
  management: (eventId: number) => `/events/${eventId}/lane-management`,
  board: (eventId: number) => `/events/${eventId}/lane-assignment-board`,
  apply: (eventId: number) => `/events/${eventId}/lane-engine/assignment-strategy/apply`,
  autoBatch: (eventId: number) => `/events/${eventId}/lane-engine/auto-batch`,
    stampGames: (eventId: number) => `/events/${eventId}/lane-engine/stamp-games`,
  copyFromRound: (eventId: number) => `/events/${eventId}/lane-engine/copy-from-round`,
  inheritFromMatchups: (eventId: number, roundId: number) =>
    `/events/${eventId}/rounds/${roundId}/lane-engine/inherit-from-matchups`,
  scoreSheet: (eventId: number, roundId: number) =>
    `/events/${eventId}/rounds/${roundId}/lane-score-sheet`,
  squadPairs: (eventId: number, squadId: number) =>
    `/events/${eventId}/squads/${squadId}/lanes-in-play`,
};

export const EventLanesAPI = {
  getManagement: async (eventId: number): Promise<EventLaneManagementResponse> => {
    const { data } = await axiosInstance.get(endpoints.management(eventId));
    return data;
  },

  updateEngine: async (
    eventId: number,
    payload: Partial<LaneEngineConfig> & {
      propagate_to_squads?: boolean;
      only_without_override?: boolean;
      inherit_tournament?: boolean;
      event_override?: Record<string, unknown>;
      reserved_lanes_expression?: string;
    }
  ): Promise<EventLaneManagementResponse> => {
    const { data } = await axiosInstance.put(endpoints.management(eventId), payload);
    return data;
  },

  getBoard: async (
    eventId: number,
    params?: { round_id?: number; squad_id?: number }
  ): Promise<LaneAssignmentBoardResponse> => {
    const { data } = await axiosInstance.get(endpoints.board(eventId), { params });
    return data;
  },

  applyAssignments: async (
    eventId: number,
    payload: ApplyLaneAssignmentsPayload
  ): Promise<ApplyLaneAssignmentsResponse> => {
    const { data } = await axiosInstance.post(endpoints.apply(eventId), payload);
    return data;
  },

  autoBatch: async (
    eventId: number,
    payload: AutoBatchLaneAssignmentPayload = {}
  ): Promise<AutoBatchLaneAssignmentResponse> => {
    const { data } = await axiosInstance.post(endpoints.autoBatch(eventId), payload);
    return data;
  },

  updateSquadPairs: async (
    eventId: number,
    squadId: number,
    pairs_in_play: LanePair[]
  ): Promise<{ event_id: number; squad_id: number; pairs_in_play: LanePair[]; source?: string }> => {
    const { data } = await axiosInstance.put(endpoints.squadPairs(eventId, squadId), {
      pairs_in_play,
    });
    return data;
  },

  inheritSquadPairs: async (
    eventId: number,
    squadId: number
  ): Promise<{ event_id: number; squad_id: number; inherited_event?: boolean; source?: string }> => {
    const { data } = await axiosInstance.put(endpoints.squadPairs(eventId, squadId), {
      inherit_event: true,
    });
    return data;
  },

  stampGames: async (
    eventId: number,
    payload: StampLaneGamesPayload = {}
  ): Promise<StampLaneGamesResponse> => {
    const { data } = await axiosInstance.post(endpoints.stampGames(eventId), payload);
    return data;
  },

  copyFromRound: async (
    eventId: number,
    payload: CopyLanesFromRoundPayload
  ): Promise<CopyLanesFromRoundResponse> => {
    const { data } = await axiosInstance.post(endpoints.copyFromRound(eventId), payload);
    return data;
  },

  inheritFromMatchups: async (
    eventId: number,
    roundId: number,
    payload: { replace_pairs?: boolean } = {}
  ): Promise<{
    event_id: number;
    round_id: number;
    league_team_count: number;
    roster_units: number;
    pairs_in_play_count: number;
    pairs_replaced: boolean;
    movement_mode: string;
    message: string;
  }> => {
    const { data } = await axiosInstance.post(
      endpoints.inheritFromMatchups(eventId, roundId),
      { replace_pairs: payload.replace_pairs ?? true }
    );
    return data;
  },

  getScoreSheet: async (
    eventId: number,
    roundId: number,
    squadId?: number
  ): Promise<LaneScoreSheetResponse> => {
    const { data } = await axiosInstance.get(endpoints.scoreSheet(eventId, roundId), {
      params: squadId != null ? { squad_id: squadId } : undefined,
    });
    return data;
  },
};
