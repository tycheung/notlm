import { devError } from './devLog';
import axios from 'axios';
import axiosInstance from './axios';
import {
  EventRead,
  EventCreate,
  EventUpdate,
  EventComplete,
  EventWithRounds,
  PublicEventRegistration,
  EventRegistrationSettingsUpdate,
  EventParticipantWithUser,
  EventStats,
  ChampionshipResultsByNodeResponse,
  EventPrizeDistributionResponse,
  EventRoundLiveScoresSnapshot,
  FinalNodeRead,
  FinalNodeStandingsConfigItem,
  FinalPayoutsResponse,
  PendingSignupEventRead,
} from '../types/event';
import {
  EventParticipantRead,
  EventParticipantUpdate,
  HistoricalQualifyingAverage,
  BatchUnassignAllRequest,
  BatchUnassignAllResponse,
  CheckInAllResponse,
} from '../types/event_participant';
import {
  BatchTeamCreate,
  BatchTeamCreateResponse
} from '../types/event_team';
import { CsvRegistrationResponse } from '../types/participant_csv';

// API endpoints
const EVENT_ENDPOINTS = {
  // Trailing slash matches FastAPI route and avoids a 307 redirect on POST /events
  EVENTS: '/events/',
  EVENT: (id: number) => `/events/${id}`,
  EVENT_WITH_ROUNDS: (id: number) => `/events/${id}/rounds`,
  EVENT_COMPLETE: (id: number) => `/events/${id}/complete`,
  REGISTER_PUBLIC: '/events/register-public',
  PENDING_SIGNUPS: '/events/pending-signups',
  EVENT_PARTICIPANTS: (eventId: number) => `/events/${eventId}/participants`,
  EVENT_PARTICIPANT_UPDATE: (eventId: number, participantId: number) => `/events/${eventId}/participants/${participantId}`,
  EVENT_PARTICIPANT_DEMOGRAPHICS: (eventId: number, participantId: number) =>
    `/events/${eventId}/participants/${participantId}/demographics`,
  EVENT_STATS: (eventId: number) => `/events/${eventId}/stats`,
  EVENT_PRIZE_DISTRIBUTION: (eventId: number) => `/events/${eventId}/prize-distribution`,
  EVENT_REGISTRATION_SETTINGS: (eventId: number) => `/events/${eventId}/registration-settings`,
  EVENT_CHAMPIONSHIP_RESULTS: (eventId: number) => `/events/${eventId}/championship-results`,
  EVENT_CHAMPIONSHIP_RECOMPUTE: (eventId: number) => `/events/${eventId}/championship-results/recompute`,
  EVENT_FINAL_NODES: (eventId: number) => `/events/${eventId}/final-nodes`,
  EVENT_FINAL_NODE: (eventId: number, finalNodeId: number) =>
    `/events/${eventId}/final-nodes/${finalNodeId}`,
  EVENT_FINAL_NODES_STANDINGS_CONFIG: (eventId: number) =>
    `/events/${eventId}/final-nodes/standings-config`,
  EVENT_FINAL_PAYOUTS: (eventId: number) => `/events/${eventId}/final-payouts`,
  EVENT_ROUND_LIVE_SCORES: (eventId: number, roundId: number) =>
    `/events/${eventId}/rounds/${roundId}/live-scores`,
  EVENT_FORMAT_EXPORT: (eventId: number) => `/events/${eventId}/format-export`,

  USER_HISTORICAL_AVERAGES: (userId: number) => `/users/${userId}/historical-qualifying-averages`,
  BATCH_CREATE_TEAMS: (eventId: number) => `/events/${eventId}/teams/batch`,
  BATCH_UNASSIGN_ALL: (eventId: number) => `/events/${eventId}/participants/batch-unassign-all`,
  CHECK_IN_ALL: (eventId: number) => `/events/${eventId}/participants/check-in-all`,
};

export const EventsAPI = {
  /**
   * Get all events
   * @param params Optional filter parameters
   * @returns Promise with array of events
   */
  getEvents: async (
    params?: { 
      tournament_id?: number; 
      upcoming_only?: boolean; 
      active_only?: boolean;
      search?: string;
      skip?: number;
      limit?: number;
    }
  ): Promise<EventRead[]> => {
    const response = await axiosInstance.get<EventRead[]>(EVENT_ENDPOINTS.EVENTS, { params });
    return response.data;
  },

  getPendingSignupEvents: async (): Promise<PendingSignupEventRead[]> => {
    const response = await axiosInstance.get<PendingSignupEventRead[]>(
      EVENT_ENDPOINTS.PENDING_SIGNUPS
    );
    return response.data;
  },

  /**
   * Get a specific event by ID
   * @param eventId Event ID
   * @returns Promise with event data
   */
  getEvent: async (eventId: number): Promise<EventRead> => {
    const response = await axiosInstance.get<EventRead>(EVENT_ENDPOINTS.EVENT(eventId));
    return response.data;
  },

  /**
   * Get an event with its rounds
   * @param eventId Event ID
   * @returns Promise with event and rounds data
   */
  getEventWithRounds: async (eventId: number): Promise<EventWithRounds> => {
    const response = await axiosInstance.get<EventWithRounds>(EVENT_ENDPOINTS.EVENT_WITH_ROUNDS(eventId));
    return response.data;
  },

  /**
   * Get complete event data including tournament and rounds
   * @param eventId Event ID
   * @returns Promise with complete event data
   */
  getCompleteEvent: async (eventId: number): Promise<EventComplete> => {
    const response = await axiosInstance.get<EventComplete>(EVENT_ENDPOINTS.EVENT_COMPLETE(eventId));
    return response.data;
  },

  /**
   * Get events for a specific tournament
   * @param tournamentId Tournament ID
   * @returns Promise with array of events
   */
  getTournamentEvents: async (tournamentId: number): Promise<EventRead[]> => {
    const response = await axiosInstance.get<EventRead[]>(EVENT_ENDPOINTS.EVENTS, { 
      params: { tournament_id_filter: tournamentId } 
    });
    return response.data;
  },

  /**
   * Create a new event
   * @param eventData Event data to create
   * @returns Promise with created event
   */
  createEvent: async (eventData: EventCreate): Promise<EventRead> => {
    const response = await axiosInstance.post<EventRead>(EVENT_ENDPOINTS.EVENTS, eventData);
    return response.data;
  },

  /**
   * Update an existing event
   * @param eventId Event ID
   * @param eventData Updated event data
   * @returns Promise with updated event
   */
  updateEvent: async (eventId: number, eventData: EventUpdate): Promise<EventRead> => {
    const response = await axiosInstance.patch<EventRead>(EVENT_ENDPOINTS.EVENT(eventId), eventData);
    return response.data;
  },

  patchEventRegistrationSettings: async (
    eventId: number,
    body: EventRegistrationSettingsUpdate
  ): Promise<EventRead> => {
    const response = await axiosInstance.patch<EventRead>(
      EVENT_ENDPOINTS.EVENT_REGISTRATION_SETTINGS(eventId),
      body
    );
    return response.data;
  },

  /**
   * Delete an event
   * @param eventId Event ID
   * @returns Promise with deletion status
   */
  deleteEvent: async (eventId: number): Promise<void> => {
    await axiosInstance.delete(EVENT_ENDPOINTS.EVENT(eventId));
  },

  /**
   * Public singles sign-up (sends Bearer token when logged in).
   */
  registerForEventPublic: async (data: PublicEventRegistration): Promise<unknown> => {
    const response = await axiosInstance.post(EVENT_ENDPOINTS.REGISTER_PUBLIC, data);
    return response.data;
  },

  /**
   * Get participants for an event
   * @param eventId Event ID
   * @param status Optional status filter
   * @returns Promise with array of participants
   */
  getEventParticipants: async (eventId: number, status?: string): Promise<EventParticipantWithUser[]> => {
    const params = status ? { status } : undefined;
    
    
    try {
      const response = await axiosInstance.get<EventParticipantWithUser[]>(
        EVENT_ENDPOINTS.EVENT_PARTICIPANTS(eventId),
        { params }
      );
      
      return response.data;
    } catch (error) {
      devError(`Error from ${EVENT_ENDPOINTS.EVENT_PARTICIPANTS(eventId)}:`, error);
      throw error;
    }
  },

  /**
   * Get statistics for an event
   * @param eventId Event ID
   * @returns Promise with event statistics
   */
  getEventStats: async (eventId: number): Promise<EventStats> => {
    const response = await axiosInstance.get<EventStats>(EVENT_ENDPOINTS.EVENT_STATS(eventId));
    return response.data;
  },

  getEventPrizeDistribution: async (eventId: number): Promise<EventPrizeDistributionResponse> => {
    const response = await axiosInstance.get<EventPrizeDistributionResponse>(
      EVENT_ENDPOINTS.EVENT_PRIZE_DISTRIBUTION(eventId)
    );
    return response.data;
  },

  getEventChampionshipResults: async (eventId: number): Promise<ChampionshipResultsByNodeResponse> => {
    const response = await axiosInstance.get<ChampionshipResultsByNodeResponse>(
      EVENT_ENDPOINTS.EVENT_CHAMPIONSHIP_RESULTS(eventId)
    );
    return response.data;
  },

  recomputeEventChampionshipResults: async (
    eventId: number
  ): Promise<ChampionshipResultsByNodeResponse> => {
    const response = await axiosInstance.post<ChampionshipResultsByNodeResponse>(
      EVENT_ENDPOINTS.EVENT_CHAMPIONSHIP_RECOMPUTE(eventId)
    );
    return response.data;
  },
  getFinalNodes: async (eventId: number): Promise<FinalNodeRead[]> => {
    const response = await axiosInstance.get<FinalNodeRead[]>(
      EVENT_ENDPOINTS.EVENT_FINAL_NODES(eventId)
    );
    return response.data;
  },
  createFinalNode: async (
    eventId: number,
    payload: {
      event_id: number;
      name: string;
      description?: string | null;
      is_active?: boolean;
      placement_count?: number;
      node_pool_type?: 'percentage' | 'dollars_per_entry' | 'amount';
      node_pool_value?: number;
      prize_allocation_steps?: Array<Record<string, unknown>>;
    }
  ): Promise<FinalNodeRead> => {
    const response = await axiosInstance.post<FinalNodeRead>(
      EVENT_ENDPOINTS.EVENT_FINAL_NODES(eventId),
      payload
    );
    return response.data;
  },
  updateFinalNode: async (
    eventId: number,
    finalNodeId: number,
    payload: Partial<
      Omit<FinalNodeRead, 'id' | 'event_id' | 'created_at' | 'updated_at'>
    >
  ): Promise<FinalNodeRead> => {
    const response = await axiosInstance.patch<FinalNodeRead>(
      EVENT_ENDPOINTS.EVENT_FINAL_NODE(eventId, finalNodeId),
      payload
    );
    return response.data;
  },
  updateFinalNodesStandingsConfig: async (
    eventId: number,
    nodes: FinalNodeStandingsConfigItem[]
  ): Promise<FinalNodeRead[]> => {
    const response = await axiosInstance.put<FinalNodeRead[]>(
      EVENT_ENDPOINTS.EVENT_FINAL_NODES_STANDINGS_CONFIG(eventId),
      { nodes }
    );
    return response.data;
  },
  deleteFinalNode: async (eventId: number, finalNodeId: number): Promise<void> => {
    await axiosInstance.delete(EVENT_ENDPOINTS.EVENT_FINAL_NODE(eventId, finalNodeId));
  },
  getFinalPayouts: async (eventId: number): Promise<FinalPayoutsResponse> => {
    const response = await axiosInstance.get<FinalPayoutsResponse>(
      EVENT_ENDPOINTS.EVENT_FINAL_PAYOUTS(eventId)
    );
    return response.data;
  },

  getRoundLiveScores: async (
    eventId: number,
    roundId: number
  ): Promise<EventRoundLiveScoresSnapshot> => {
    const response = await axiosInstance.get<EventRoundLiveScoresSnapshot>(
      EVENT_ENDPOINTS.EVENT_ROUND_LIVE_SCORES(eventId, roundId)
    );
    return response.data;
  },

  /**
   * Update an event participant (inline editing)
   * @param eventId Event ID
   * @param participantId Participant ID
   * @param updateData Data to update
   * @returns Promise with updated participant data
   */
  updateEventParticipant: async (
    eventId: number, 
    participantId: number, 
    updateData: EventParticipantUpdate
  ): Promise<EventParticipantWithUser> => {
    const response = await axiosInstance.patch<EventParticipantWithUser>(
      EVENT_ENDPOINTS.EVENT_PARTICIPANT_UPDATE(eventId, participantId),
      updateData
    );
    return response.data;
  },

  /** TD/admin: update bowler gender / DOB from the event roster. */
  updateParticipantDemographics: async (
    eventId: number,
    participantId: number,
    data: { gender?: 'male' | 'female' | 'other' | null; birth_date?: string | null }
  ): Promise<{
    participant_id: number;
    user_id: number;
    gender: 'male' | 'female' | 'other' | null;
    birth_date: string | null;
    is_senior?: boolean;
    is_youth?: boolean;
  }> => {
    const response = await axiosInstance.patch(
      EVENT_ENDPOINTS.EVENT_PARTICIPANT_DEMOGRAPHICS(eventId, participantId),
      data
    );
    return response.data;
  },

  /**
   * Get historical qualifying averages for a user
   * @param userId User ID
   * @param limit Optional number of recent averages to return; omitted returns all
   * @returns Promise with historical averages
   */
  getUserHistoricalQualifyingAverages: async (
    userId: number, 
    limit?: number
  ): Promise<HistoricalQualifyingAverage[]> => {
    const response = await axiosInstance.get<HistoricalQualifyingAverage[]>(
      EVENT_ENDPOINTS.USER_HISTORICAL_AVERAGES(userId),
      { params: limit != null ? { limit } : undefined }
    );
    return response.data;
  },

  /**
   * Add a participant to an event (tournament director only)
   * @param eventId Event ID
   * @param participantData Participant data including user_id and notes
   * @returns Promise with created event participant
   */
  addParticipantToEvent: async (
    eventId: number,
    participantData: { user_id: number; notes?: string }
  ): Promise<EventParticipantRead> => {
    const response = await axiosInstance.post(EVENT_ENDPOINTS.EVENT_PARTICIPANTS(eventId), participantData);
    return response.data;
  },

  /**
   * Add multiple participants to an event in a single batch operation (tournament director only)
   * @param eventId Event ID
   * @param participantsData Array of participant data including user_id and notes
   * @returns Promise with array of created event participants
   */
  batchAddParticipantsToEvent: async (
    eventId: number,
    participantsData: { user_id: number; notes?: string; qualifying_average?: number }[]
  ): Promise<EventParticipantRead[]> => {
    const response = await axiosInstance.post(`/events/${eventId}/participants/batch`, participantsData);
    return response.data;
  },

  /**
   * Delete an event participant (tournament director only)
   * @param eventId Event ID
   * @param participantId Participant ID
   * @returns Promise with deletion status
   */
  deleteEventParticipant: async (eventId: number, participantId: number): Promise<void> => {
    await axiosInstance.delete(EVENT_ENDPOINTS.EVENT_PARTICIPANT_UPDATE(eventId, participantId));
  },
  /** Initial-round bulk: unassign many participants from all squads in one request. */
  batchUnassignEventParticipantsFromAll: async (
    eventId: number,
    body: BatchUnassignAllRequest
  ): Promise<BatchUnassignAllResponse> => {
    const response = await axiosInstance.post<BatchUnassignAllResponse>(
      EVENT_ENDPOINTS.BATCH_UNASSIGN_ALL(eventId),
      body
    );
    return response.data;
  },

  /** Check in every approved roster participant not already checked in. */
  checkInAllEventParticipants: async (eventId: number): Promise<CheckInAllResponse> => {
    const response = await axiosInstance.post<CheckInAllResponse>(
      EVENT_ENDPOINTS.CHECK_IN_ALL(eventId)
    );
    return response.data;
  },

  /**
   * Batch create multiple teams with members
   * @param eventId Event ID
   * @param batchData Team batch creation data
   * @returns Promise with batch creation response
   */
  batchCreateTeams: async (eventId: number, batchData: BatchTeamCreate): Promise<BatchTeamCreateResponse> => {
    const response = await axiosInstance.post<BatchTeamCreateResponse>(
      EVENT_ENDPOINTS.BATCH_CREATE_TEAMS(eventId),
      batchData
    );
    return response.data;
  },

  /**
   * Download CSV template for bulk participant / team registration (tournament director).
   */
  downloadParticipantsCsvTemplate: async (eventId: number): Promise<Blob> => {
    try {
      const response = await axiosInstance.get(
        `/events/${eventId}/participants/csv-template`,
        { responseType: 'blob' }
      );
      const blob = response.data as Blob;
      const type = (blob?.type || '').toLowerCase();
      if (
        type.includes('application/json') ||
        type.includes('text/html') ||
        type.includes('application/problem')
      ) {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text) as {
            error?: string;
            message?: string;
            detail?: string;
          };
          throw new Error(
            parsed.error || parsed.message || parsed.detail || 'Could not download template.'
          );
        } catch (inner) {
          if (inner instanceof Error && inner.message !== 'Unexpected end of JSON input') {
            throw inner;
          }
          throw new Error('Could not download template.');
        }
      }
      return blob;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text) as {
            error?: string;
            message?: string;
            detail?: string;
          };
          const msg =
            (typeof parsed.error === 'string' && parsed.error) ||
            (typeof parsed.message === 'string' && parsed.message) ||
            (typeof parsed.detail === 'string' && parsed.detail) ||
            null;
          if (msg) throw new Error(msg);
        } catch (inner) {
          if (inner instanceof Error && inner.message && !inner.message.includes('JSON')) {
            throw inner;
          }
        }
      }
      throw err;
    }
  },

  /**
   * Upload filled CSV; creates users by USBC as needed and registers participants or teams.
   */
  uploadParticipantsCsv: async (
    eventId: number,
    file: File
  ): Promise<CsvRegistrationResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post<CsvRegistrationResponse>(
      `/events/${eventId}/participants/csv`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  /**
   * Export round/squad/relationship structure as JSON (TD/admin).
   */
  getFormatExport: async (eventId: number): Promise<Record<string, unknown>> => {
    const response = await axiosInstance.get<Record<string, unknown>>(
      EVENT_ENDPOINTS.EVENT_FORMAT_EXPORT(eventId)
    );
    return response.data;
  },


}; 