// IMPORTANT: Import the configured axiosInstance
// IMPORTANT: Import the configured axiosInstance
import { devError, devLog } from './devLog';
import axiosInstance from '../api/axios';  // Update the path as needed
import { 
  TournamentRead, 
  TournamentCreate, 
  TournamentUpdate,
  TournamentCopyRequest,
  TournamentCopyResponse,
  TournamentWithCenter,
  TournamentStats,
  TournamentSearch,
} from '../types/tournament';
import { LocationSearch } from '../types/bowling_center';
import { parseNaiveDateTimeToDate, toTimezoneNaiveISO } from '../utils/dateUtils';

const TOURNAMENT_ENDPOINTS = {
  TOURNAMENTS: '/tournaments',
  TOURNAMENT: (id: number) => `/tournaments/${id}`,
  TOURNAMENT_COPY: (id: number) => `/tournaments/${id}/copy`,
  TOURNAMENT_CENTER: (id: number) => `/tournaments/${id}/with-center`,
  TOURNAMENT_STATS: (id: number) => `/tournaments/${id}/stats`,
  TOURNAMENT_LANE_CONFLICTS: (id: number) => `/tournaments/${id}/reports/lane-conflicts`,
  SEARCH: '/tournaments/search',
  RECOMMENDED: '/tournaments/recommended',
  NEAR_HOME_BASE: (homeBaseId: number) => `/tournaments/near-home-base/${homeBaseId}`,
  CURRENT_USER_TOURNAMENTS: '/users/me/tournaments',
};

/**
 * Tournaments API service
 */
export const TournamentsAPI = {
  /**
   * Get a list of tournaments with optional filtering
   * @param params Optional filter parameters
   * @returns Promise with array of tournaments
   */
  getTournaments: async (params?: {
    skip?: number;
    limit?: number;
    upcoming_only?: boolean;
    active_only?: boolean;
    bowling_center_id?: number;
    search?: string;
    start_date_after?: string;
    start_date_before?: string;
    include_details?: boolean;
    published_only?: boolean;
  }): Promise<TournamentRead[]> => {
    // Format date parameters to ensure they're in ISO format
    const formattedParams = { ...params };
    
    if (formattedParams.start_date_before) {
      // Ensure start_date_before is in naive datetime format
      const date = parseNaiveDateTimeToDate(formattedParams.start_date_before);
      if (date) {
        formattedParams.start_date_before = toTimezoneNaiveISO(date);
      }
    }
    
    if (formattedParams.start_date_after) {
      // Ensure start_date_after is in naive datetime format
      const date = parseNaiveDateTimeToDate(formattedParams.start_date_after);
      if (date) {
        formattedParams.start_date_after = toTimezoneNaiveISO(date);
      }
    }
    
    const response = await axiosInstance.get<TournamentRead[]>(TOURNAMENT_ENDPOINTS.TOURNAMENTS, { params: formattedParams });
    return response.data;
  },

  /**
   * Create a new tournament
   * @param data Tournament data
   * @returns Promise with created tournament
   */
  createTournament: async (data: TournamentCreate): Promise<TournamentRead> => {
    devLog('API createTournament called with data:', JSON.stringify(data, null, 2));
    // Make sure location is a string and not empty
    if (!data.location || data.location.trim() === '') {
      devError('Location is empty or missing in tournament data!');
      data.location = 'Missing location - auto-filled';
    }
    const response = await axiosInstance.post<TournamentRead>(TOURNAMENT_ENDPOINTS.TOURNAMENTS, data);
    return response.data;
  },

  /**
   * Get a specific tournament by ID
   * @param id Tournament ID
   * @returns Promise with the tournament data
   */
  getTournament: async (id: number): Promise<TournamentRead> => {
    const response = await axiosInstance.get<TournamentRead>(TOURNAMENT_ENDPOINTS.TOURNAMENT(id));
    return response.data;
  },

  /**
   * Update a tournament
   * @param id Tournament ID
   * @param data Updated tournament data
   * @returns Promise with the updated tournament data
   */
  updateTournament: async (id: number, data: TournamentUpdate): Promise<TournamentRead> => {
    const response = await axiosInstance.put<TournamentRead>(TOURNAMENT_ENDPOINTS.TOURNAMENT(id), data);
    return response.data;
  },

  copyTournament: async (
    id: number,
    data: TournamentCopyRequest
  ): Promise<TournamentCopyResponse> => {
    const response = await axiosInstance.post<TournamentCopyResponse>(
      TOURNAMENT_ENDPOINTS.TOURNAMENT_COPY(id),
      data
    );
    return response.data;
  },

  /**
   * Delete a tournament (set as inactive)
   * @param id Tournament ID
   * @returns Promise with void result
   */
  deleteTournament: async (id: number): Promise<void> => {
    await axiosInstance.delete(TOURNAMENT_ENDPOINTS.TOURNAMENT(id));
  },

  /**
   * Get a tournament with its bowling center details
   * @param id Tournament ID
   * @returns Promise with tournament and bowling center data
   */
  getTournamentWithCenter: async (id: number): Promise<TournamentWithCenter> => {
    const response = await axiosInstance.get<TournamentWithCenter>(TOURNAMENT_ENDPOINTS.TOURNAMENT_CENTER(id));
    return response.data;
  },

  /**
   * Get statistics for a tournament
   * @param id Tournament ID
   * @returns Promise with tournament statistics
   */
  getTournamentStats: async (id: number): Promise<TournamentStats> => {
    const response = await axiosInstance.get<TournamentStats>(TOURNAMENT_ENDPOINTS.TOURNAMENT_STATS(id));
    return response.data;
  },

  /**
   * Search tournaments by various criteria
   * @param params Search parameters
   * @returns Promise with array of search results
   */
  searchTournaments: async (params: {
    query?: string;
    city?: string;
    state?: string;
    upcoming_only?: boolean;
    limit?: number;
  }): Promise<TournamentSearch[]> => {
    const response = await axiosInstance.get<TournamentSearch[]>(TOURNAMENT_ENDPOINTS.SEARCH, { params });
    return response.data;
  },

  /**
   * Get recommended tournaments based on location coordinates
   * @param location Location data with latitude, longitude, and radius
   * @param limit Maximum number of results (default: 10)
   * @param upcoming_only Whether to only include upcoming tournaments (default: true)
   * @returns Promise with array of tournament search results with distances
   */
  getRecommendedTournaments: async (
    location: LocationSearch,
    limit: number = 10,
    upcoming_only: boolean = true
  ): Promise<TournamentSearch[]> => {
    const response = await axiosInstance.post<TournamentSearch[]>(
      TOURNAMENT_ENDPOINTS.RECOMMENDED,
      location,
      { params: { limit, upcoming_only } }
    );
    return response.data;
  },

  /**
   * Get tournaments for a specific user (both as organizer and participant)
   * @param userId User ID
   * @param status Optional status filter ('upcoming', 'active', 'completed')
   * @returns Promise with array of tournament data with registration details
   */
  getUserTournaments: async (userId: number, status?: string): Promise<TournamentRead[]> => {
    const response = await axiosInstance.get<TournamentRead[]>(
      `/users/${userId}/tournaments`,
      { params: { status } }
    );
    return response.data;
  },

  /**
   * Get tournaments for the current user (both as organizer and participant)
   * @returns Promise with array of tournament data with registration details
   */
  getCurrentUserTournaments: async (status?: string): Promise<TournamentRead[]> => {
    try {
      const response = await axiosInstance.get<TournamentRead[]>(
        TOURNAMENT_ENDPOINTS.CURRENT_USER_TOURNAMENTS,
        { params: status ? { status } : undefined }
      );
      return response.data;
    } catch (error) {
      devError('Error fetching user tournaments:', error);
      return [];
    }
  },

  /**
   * Get tournaments near a specific home base
   * @param homeBaseId Home base ID
   * @param radius Search radius in miles (default: 50)
   * @param limit Maximum number of results (default: 10)
   * @param upcoming_only Whether to only include upcoming tournaments (default: true)
   * @returns Promise with array of tournament search results with distances
   */
  getTournamentsNearHomeBase: async (
    homeBaseId: number,
    radius: number = 50,
    limit: number = 10,
    upcoming_only: boolean = true
  ): Promise<TournamentSearch[]> => {
    const response = await axiosInstance.get<TournamentSearch[]>(
      TOURNAMENT_ENDPOINTS.NEAR_HOME_BASE(homeBaseId),
      { params: { radius, limit, upcoming_only } }
    );
    return response.data;
  },

  getLaneConflicts: async (
    tournamentId: number,
    params?: {
      cross_event_only?: boolean;
      overlap_time_only?: boolean;
      include_reentry?: boolean;
      min_occurrences?: number;
    }
  ): Promise<import('../types/tournament').TournamentLaneConflictReport> => {
    const response = await axiosInstance.get(
      TOURNAMENT_ENDPOINTS.TOURNAMENT_LANE_CONFLICTS(tournamentId),
      { params }
    );
    return response.data;
  },
};