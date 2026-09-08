import axiosInstance from './axios';
import {
  EventDirectorAccess,
  EventDirectorDelegationRead,
  EventDirectorDelegationUpsert,
  MyTournamentDirectorAccess,
  TDSearchUser,
  TournamentDirectorPermissionRead,
  TournamentDirectorPermissionUpsert,
} from '../types/director_delegation';
import type { TournamentRead } from '../types/tournament';
import type { EventRead, PendingSignupEventRead } from '../types/event';
import type { TdBowlerAverageRow, TdHouseAverageCenter } from '../types/tdBowlerAverage';

export type DirectorHomeSummary = {
  owned_tournaments: TournamentRead[];
  delegated_tournaments: TournamentRead[];
  events: EventRead[];
  pending_signups: PendingSignupEventRead[];
};

const D = {
  TD_SEARCH: '/directors/td-search',
  BOWLER_SEARCH: '/directors/bowlers/search',
  EVENT_ACCESS: (eventId: number) => `/directors/events/${eventId}/director-access`,
  EVENT_DELEGATIONS: (eventId: number) => `/directors/events/${eventId}/delegations`,
  EVENT_DELEGATION: (eventId: number, delegateUserId: number) =>
    `/directors/events/${eventId}/delegations/${delegateUserId}`,
  TOURNAMENT_PERMS: (tournamentId: number) =>
    `/directors/tournaments/${tournamentId}/director-permissions`,
  TOURNAMENT_PERM: (tournamentId: number, delegateUserId: number) =>
    `/directors/tournaments/${tournamentId}/director-permissions/${delegateUserId}`,
  TOURNAMENT_MY_ACCESS: (tournamentId: number) =>
    `/directors/tournaments/${tournamentId}/my-access`,
  MY_TOURNAMENTS: '/directors/my-tournaments/',
  MY_DELEGATED_TOURNAMENTS: '/directors/my-delegated-tournaments/',
  HOME_SUMMARY: '/directors/me/home-summary',
  BOWLER_AVERAGES: '/directors/bowler-averages',
  BOWLER_AVERAGE_CENTERS: '/directors/bowler-averages/centers',
  AVERAGE_PICKS: (eventId: number, userId: number) =>
    `/directors/events/${eventId}/bowlers/${userId}/average-picks`,
};

export const DirectorsAPI = {
  searchTDs: async (q: string): Promise<TDSearchUser[]> => {
    const res = await axiosInstance.get<TDSearchUser[]>(D.TD_SEARCH, { params: { q } });
    return res.data;
  },

  searchBowlers: async (q: string): Promise<TDSearchUser[]> => {
    const res = await axiosInstance.get<TDSearchUser[]>(D.BOWLER_SEARCH, { params: { q } });
    return res.data;
  },

  getEventDirectorAccess: async (eventId: number): Promise<EventDirectorAccess> => {
    const res = await axiosInstance.get<EventDirectorAccess>(D.EVENT_ACCESS(eventId), {
      skip403Redirect: true,
    });
    return res.data;
  },

  getMyTournamentAccess: async (
    tournamentId: number
  ): Promise<MyTournamentDirectorAccess> => {
    const res = await axiosInstance.get<MyTournamentDirectorAccess>(
      D.TOURNAMENT_MY_ACCESS(tournamentId),
      { skip403Redirect: true }
    );
    return res.data;
  },

  getMyTournaments: async (): Promise<TournamentRead[]> => {
    const res = await axiosInstance.get<TournamentRead[]>(D.MY_TOURNAMENTS);
    return res.data;
  },

  getMyDelegatedTournaments: async (): Promise<TournamentRead[]> => {
    const res = await axiosInstance.get<TournamentRead[]>(D.MY_DELEGATED_TOURNAMENTS);
    return res.data;
  },

  getHomeSummary: async (): Promise<DirectorHomeSummary> => {
    const res = await axiosInstance.get<DirectorHomeSummary>(D.HOME_SUMMARY);
    const data = res.data || {};
    return {
      owned_tournaments: Array.isArray(data.owned_tournaments) ? data.owned_tournaments : [],
      delegated_tournaments: Array.isArray(data.delegated_tournaments)
        ? data.delegated_tournaments
        : [],
      events: Array.isArray(data.events) ? data.events : [],
      pending_signups: Array.isArray(data.pending_signups) ? data.pending_signups : [],
    };
  },

  listEventDelegations: async (eventId: number): Promise<EventDirectorDelegationRead[]> => {
    const res = await axiosInstance.get<EventDirectorDelegationRead[]>(
      D.EVENT_DELEGATIONS(eventId)
    );
    return res.data;
  },

  upsertEventDelegation: async (
    eventId: number,
    body: EventDirectorDelegationUpsert
  ): Promise<EventDirectorDelegationRead> => {
    const res = await axiosInstance.put<EventDirectorDelegationRead>(
      D.EVENT_DELEGATIONS(eventId),
      body
    );
    return res.data;
  },

  deleteEventDelegation: async (
    eventId: number,
    delegateUserId: number
  ): Promise<void> => {
    await axiosInstance.delete(D.EVENT_DELEGATION(eventId, delegateUserId));
  },

  listTournamentPermissions: async (
    tournamentId: number
  ): Promise<TournamentDirectorPermissionRead[]> => {
    const res = await axiosInstance.get<TournamentDirectorPermissionRead[]>(
      D.TOURNAMENT_PERMS(tournamentId)
    );
    return res.data;
  },

  upsertTournamentPermission: async (
    tournamentId: number,
    body: TournamentDirectorPermissionUpsert
  ): Promise<TournamentDirectorPermissionRead> => {
    const res = await axiosInstance.put<TournamentDirectorPermissionRead>(
      D.TOURNAMENT_PERMS(tournamentId),
      body
    );
    return res.data;
  },

  deleteTournamentPermission: async (
    tournamentId: number,
    delegateUserId: number
  ): Promise<void> => {
    await axiosInstance.delete(D.TOURNAMENT_PERM(tournamentId, delegateUserId));
  },

  listBowlerAverages: async (
    q?: string,
    bowlingCenterId?: number
  ): Promise<TdBowlerAverageRow[]> => {
    const params: Record<string, string | number> = {};
    if (q && q.trim()) params.q = q.trim();
    if (bowlingCenterId) params.bowling_center_id = bowlingCenterId;
    const res = await axiosInstance.get<TdBowlerAverageRow[]>(D.BOWLER_AVERAGES, {
      params: Object.keys(params).length ? params : undefined,
    });
    return res.data;
  },

  listBowlerAverageCenters: async (): Promise<TdHouseAverageCenter[]> => {
    const res = await axiosInstance.get<TdHouseAverageCenter[]>(D.BOWLER_AVERAGE_CENTERS);
    return res.data;
  },

  getBowlerAveragePicks: async (
    eventId: number,
    userId: number
  ): Promise<TdBowlerAverageRow> => {
    const res = await axiosInstance.get<TdBowlerAverageRow>(
      D.AVERAGE_PICKS(eventId, userId)
    );
    return res.data;
  },
};
