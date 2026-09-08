import { devLog } from './devLog';
import axiosInstance from './axios';
import {
  SquadRead,
  SquadCreate,
  SquadUpdate,
  SquadWithParticipantsAndUsers,
  SquadWithGames,
  SquadAssignment,
  SquadParticipantRead,
  BatchAssignmentRequest,
  BatchAssignmentResponse,
  BatchReentryRequest,
  BatchReentryResponse,
  BatchRemovalRequest,
  BatchRemovalResponse,
  BatchTeamSquadRequest,
  BatchTeamSquadResponse,
  RoundParticipantsResponse,
  RoundScoringRosterResponse,
  RoundTeamsResponse
} from '../types/squad';

// Squad API endpoints
const SQUAD_ENDPOINTS = {
  SQUADS: '/squads',
  SQUAD_BY_ID: (id: number) => `/squads/${id}`,
  SQUAD_PARTICIPANTS: (id: number) => `/squads/${id}/participants`,
  SQUAD_GAMES: (id: number) => `/squads/${id}/games`,
  SQUAD_ASSIGN: '/squads/assign',
  SQUAD_REMOVE_PARTICIPANT: (squadId: number, participantId: number) => `/squads/${squadId}/participants/${participantId}`,
  EVENT_SQUADS: (eventId: number) => `/squads/event/${eventId}`,
  ROUND_SQUADS: (roundId: number) => `/squads/round/${roundId}`,
  // New batch endpoints
  BATCH_ASSIGN: '/squads/batch-assign',
  BATCH_REENTRY: '/squads/batch-reentry',
  BATCH_REMOVE: '/squads/batch-remove',
  BATCH_TEAM_OPERATIONS: '/squads/batch-team-operations',
  ROUND_PARTICIPANTS: (roundId: number) => `/squads/round/${roundId}/participants`,
  ROUND_TEAMS: (roundId: number) => `/squads/round/${roundId}/teams`,
  ROUND_SCORING_ROSTER: (roundId: number) => `/squads/round/${roundId}/scoring-roster`,
} as const;

export const SquadsAPI = {
  // Get a specific squad by ID
  getSquad: async (id: number): Promise<SquadRead> => {
    const response = await axiosInstance.get(SQUAD_ENDPOINTS.SQUAD_BY_ID(id));
    return response.data;
  },

  // Create a new squad
  createSquad: async (squadData: SquadCreate): Promise<SquadRead> => {
    const response = await axiosInstance.post(SQUAD_ENDPOINTS.SQUADS, squadData);
    return response.data;
  },

  // Update an existing squad
  updateSquad: async (id: number, squadData: SquadUpdate): Promise<SquadRead> => {
    const response = await axiosInstance.patch(SQUAD_ENDPOINTS.SQUAD_BY_ID(id), squadData);
    return response.data;
  },

  // Delete a squad
  deleteSquad: async (id: number): Promise<void> => {
    await axiosInstance.delete(SQUAD_ENDPOINTS.SQUAD_BY_ID(id));
  },

  // Get squad with participants (works for both assignment and scoring modes)
  getSquadWithParticipants: async (id: number): Promise<SquadWithParticipantsAndUsers> => {
    const response = await axiosInstance.get(SQUAD_ENDPOINTS.SQUAD_PARTICIPANTS(id));
    return response.data;
  },

  // Get squad with games
  getSquadWithGames: async (id: number): Promise<SquadWithGames> => {
    const response = await axiosInstance.get(SQUAD_ENDPOINTS.SQUAD_GAMES(id));
    return response.data;
  },

  // Assign a participant to a squad
  assignParticipantToSquad: async (assignment: SquadAssignment): Promise<SquadParticipantRead> => {
    const response = await axiosInstance.post(SQUAD_ENDPOINTS.SQUAD_ASSIGN, assignment);
    return response.data;
  },

  // Remove a participant from a squad
  removeParticipantFromSquad: async (squadId: number, participantId: number): Promise<void> => {
    await axiosInstance.delete(SQUAD_ENDPOINTS.SQUAD_REMOVE_PARTICIPANT(squadId, participantId));
  },

  // Get squads for a specific event
  getEventSquads: async (
    eventId: number,
    params?: { skip?: number; limit?: number }
  ): Promise<SquadRead[]> => {
    const response = await axiosInstance.get(SQUAD_ENDPOINTS.EVENT_SQUADS(eventId), { params });
    return response.data;
  },

  // Get all squads for a specific event, paging until exhausted.
  getAllEventSquads: async (eventId: number, pageSize = 500): Promise<SquadRead[]> => {
    const allSquads: SquadRead[] = [];
    let skip = 0;

    while (true) {
      const page = await SquadsAPI.getEventSquads(eventId, { skip, limit: pageSize });
      allSquads.push(...page);

      if (page.length < pageSize) {
        break;
      }

      skip += pageSize;
    }

    return allSquads;
  },

  // Get squads for a specific round
  getRoundSquads: async (roundId: number): Promise<SquadRead[]> => {
    const response = await axiosInstance.get(SQUAD_ENDPOINTS.ROUND_SQUADS(roundId));
    return response.data;
  },

  // Get squad with event details (for breadcrumbs)
  getSquadWithEvent: async (id: number): Promise<unknown> => {
    const response = await axiosInstance.get(SQUAD_ENDPOINTS.SQUAD_BY_ID(id));
    return response.data;
  },

  // Create a squad for a specific round
  createSquadForRound: async (roundId: number, squadData: SquadCreate): Promise<SquadRead> => {
    devLog('API call - createSquadForRound:', { roundId, squadData });
    const response = await axiosInstance.post(`/squads/round/${roundId}`, squadData);
    devLog('API response:', response.data);
    return response.data;
  },

  // Batch assign multiple participants to squads
  batchAssignParticipants: async (request: BatchAssignmentRequest): Promise<BatchAssignmentResponse> => {
    const response = await axiosInstance.post(SQUAD_ENDPOINTS.BATCH_ASSIGN, request);
    return response.data;
  },

  // Batch register multiple re-entries
  batchRegisterReentries: async (request: BatchReentryRequest): Promise<BatchReentryResponse> => {
    const response = await axiosInstance.post(SQUAD_ENDPOINTS.BATCH_REENTRY, request);
    return response.data;
  },

  // Batch remove multiple participants from squads
  batchRemoveParticipants: async (request: BatchRemovalRequest): Promise<BatchRemovalResponse> => {
    devLog('Sending batch removal request:', request);
    const response = await axiosInstance.post(SQUAD_ENDPOINTS.BATCH_REMOVE, request);
    devLog('Batch removal response:', response.data);
    return response.data;
  },

  // Get all participants for all squads under a specific round
  getRoundParticipants: async (roundId: number): Promise<RoundParticipantsResponse> => {
    const response = await axiosInstance.get(SQUAD_ENDPOINTS.ROUND_PARTICIPANTS(roundId));
    return response.data;
  },

  /** All teams for every squad in a round (single request; team events). */
  getRoundTeams: async (roundId: number): Promise<RoundTeamsResponse> => {
    const response = await axiosInstance.get(SQUAD_ENDPOINTS.ROUND_TEAMS(roundId));
    return response.data;
  },

  getRoundScoringRoster: async (roundId: number): Promise<RoundScoringRosterResponse> => {
    const response = await axiosInstance.get(SQUAD_ENDPOINTS.ROUND_SCORING_ROSTER(roundId));
    return response.data;
  },

  /** Team events: apply many assign/remove ops in one request (single round-trip). */
  batchTeamSquadOperations: async (body: BatchTeamSquadRequest): Promise<BatchTeamSquadResponse> => {
    const response = await axiosInstance.post(SQUAD_ENDPOINTS.BATCH_TEAM_OPERATIONS, body);
    return response.data;
  },

  lockInSquad: async (squadId: number): Promise<Record<string, unknown>> => {
    const response = await axiosInstance.post(`${SQUAD_ENDPOINTS.SQUAD_BY_ID(squadId)}/lock-in`);
    return response.data;
  },

  unlockSquad: async (squadId: number): Promise<Record<string, unknown>> => {
    const response = await axiosInstance.post(`${SQUAD_ENDPOINTS.SQUAD_BY_ID(squadId)}/unlock`);
    return response.data;
  },
};

export default SquadsAPI; 