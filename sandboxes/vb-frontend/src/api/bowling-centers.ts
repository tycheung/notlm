import axiosInstance from '../api/axios';
import { 
  BowlingCenterRead, 
  BowlingCenterCreate, 
  BowlingCenterUpdate,
  BowlingCenterWithTournaments,
  BowlingCenterStats,
  BowlingCenterSearch,
  LocationSearch
} from '../types/bowling_center';

const BOWLING_CENTER_ENDPOINTS = {
  CENTERS: '/bowling-centers',
  CENTER: (id: number) => `/bowling-centers/${id}`,
  CENTER_TOURNAMENTS: (id: number) => `/bowling-centers/${id}/tournaments`,
  CENTER_STATS: (id: number) => `/bowling-centers/${id}/stats`,
  SEARCH: '/bowling-centers/search',
  NEAR_ME: '/bowling-centers/near-me',
};

/**
 * Bowling Centers API service
 */
export const BowlingCentersAPI = {
  /**
   * Get a list of bowling centers with optional filtering
   * @param params Optional filter parameters
   * @returns Promise with array of bowling centers
   */
  getBowlingCenters: async (params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
    state?: string;
    city?: string;
    search?: string;
  }): Promise<BowlingCenterRead[]> => {
    const response = await axiosInstance.get<BowlingCenterRead[]>(BOWLING_CENTER_ENDPOINTS.CENTERS, { params });
    return response.data;
  },

  /**
   * Create a new bowling center
   * @param data Bowling center data
   * @returns Promise with created bowling center
   */
  createBowlingCenter: async (data: BowlingCenterCreate): Promise<BowlingCenterRead> => {
    // Get the current user from localStorage
    const user = localStorage.getItem('user');
    const userId = user ? JSON.parse(user).id : null;
    
    const response = await axiosInstance.post<BowlingCenterRead>(
      BOWLING_CENTER_ENDPOINTS.CENTERS, 
      { ...data, created_by: userId }
    );
    return response.data;
  },

  /**
   * Get a specific bowling center by ID
   * @param id Bowling center ID
   * @returns Promise with the bowling center data
   */
  getBowlingCenter: async (id: number): Promise<BowlingCenterRead> => {
    const response = await axiosInstance.get<BowlingCenterRead>(
      BOWLING_CENTER_ENDPOINTS.CENTER(id)
    );
    return response.data;
  },

  /**
   * Update a bowling center
   * @param id Bowling center ID
   * @param data Updated bowling center data
   * @returns Promise with the updated bowling center data
   */
  updateBowlingCenter: async (id: number, data: BowlingCenterUpdate): Promise<BowlingCenterRead> => {
    // Get the current user from localStorage
    const user = localStorage.getItem('user');
    const userId = user ? JSON.parse(user).id : null;
    
    const response = await axiosInstance.put<BowlingCenterRead>(
      BOWLING_CENTER_ENDPOINTS.CENTER(id), 
      { ...data, updated_by: userId }
    );
    return response.data;
  },

  /**
   * Delete a bowling center (set as inactive)
   * @param id Bowling center ID
   * @returns Promise with void result
   */
  deleteBowlingCenter: async (id: number): Promise<void> => {
    // Get the current user from localStorage
    const user = localStorage.getItem('user');
    const userId = user ? JSON.parse(user).id : null;
    
    // Send the DELETE request with user ID in the query parameter
    await axiosInstance.delete(BOWLING_CENTER_ENDPOINTS.CENTER(id), {
      params: { updated_by: userId }
    });
  },

  /**
   * Get a bowling center with its tournaments
   * @param id Bowling center ID
   * @param include_inactive Optional parameter to include inactive tournaments
   * @returns Promise with bowling center and tournaments data
   */
  getCenterWithTournaments: async (
    id: number, 
    include_inactive?: boolean
  ): Promise<BowlingCenterWithTournaments> => {
    const response = await axiosInstance.get<BowlingCenterWithTournaments>(
      BOWLING_CENTER_ENDPOINTS.CENTER_TOURNAMENTS(id),
      { params: { include_inactive } }
    );
    return response.data;
  },

  /**
   * Get statistics for a bowling center
   * @param id Bowling center ID
   * @returns Promise with bowling center statistics
   */
  getBowlingCenterStats: async (id: number): Promise<BowlingCenterStats> => {
    const response = await axiosInstance.get<BowlingCenterStats>(BOWLING_CENTER_ENDPOINTS.CENTER_STATS(id));
    return response.data;
  },

  /**
   * Search bowling centers by name, city, state
   * @param params Search parameters
   * @returns Promise with array of search results
   */
  searchBowlingCenters: async (params: {
    query?: string;
    state?: string;
    limit?: number;
  }): Promise<BowlingCenterSearch[]> => {
    const response = await axiosInstance.get<BowlingCenterSearch[]>(BOWLING_CENTER_ENDPOINTS.SEARCH, { params });
    return response.data;
  },

  /**
   * Search bowling centers near provided coordinates
   * @param location Location search parameters (latitude, longitude, radius)
   * @returns Promise with array of search results with distance
   */
  searchCentersByCoordinates: async (location: LocationSearch): Promise<BowlingCenterSearch[]> => {
    const response = await axiosInstance.post<BowlingCenterSearch[]>(
      BOWLING_CENTER_ENDPOINTS.NEAR_ME,
      location
    );
    return response.data;
  },
};