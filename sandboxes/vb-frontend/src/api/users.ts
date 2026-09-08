import axiosInstance from '../api/axios';
import { 
  UserRead,
  UserCreate,
  UserUpdate, 
  UserWithGames, 
  UserWithNotifications, 
  HomeBaseCreate,
  HomeBaseRead,
  HomeBaseUpdate,
  Role,
  UserCreateMinimal,
  UserClaimRequest,
  UserClaimResponse,
  USBCSearchResult
} from '../types/user';
import type { BowlerHomeEvents } from '../pages/dashboard/bowlerHomeEvents';
import type { BowlerBowledEvent } from '../pages/dashboard/bowlerStatsEventGrid';
import type { BowlerFinancialEvent } from '../pages/dashboard/bowlerFinancialEvents';

const USER_ENDPOINTS = {
  USERS: '/users',
  USER: (id: number) => `/users/${id}`,
  USER_GAMES: (id: number) => `/users/${id}/games`,
  USER_NOTIFICATIONS: (id: number) => `/users/${id}/notifications`,
  USER_VERIFY: (id: number) => `/users/${id}/verify`,
  USER_EARNINGS: (id: number) => `/users/${id}/earnings`,
  USER_TOTAL_EARNINGS: (id: number) => `/users/${id}/total-earnings`,
  USER_PERFORMANCE: (id: number) => `/users/${id}/performance`,
  CURRENT_USER_EARNINGS: '/users/me/earnings',
  CURRENT_USER_TOTAL_EARNINGS: '/users/me/total-earnings',
  CURRENT_USER_PERFORMANCE: '/users/me/performance',
  USER_HOME_EVENTS: (id: number) => `/users/${id}/home-events`,
  USER_BOWLED_EVENTS: (id: number) => `/users/${id}/bowled-events`,
  USER_FINANCIAL_EVENTS: (id: number) => `/users/${id}/financial-events`,
  CURRENT_USER: '/users/me',
  MINIMAL_USER: '/users/minimal',
  SEARCH_USBC: (usbc_id: string) => `/users/search-usbc/${usbc_id}`,
  CLAIM_PROFILE: '/users/claim-profile',
  TEMPORARY_USBC: '/users/temporary-usbc',
  ASSIGN_USBC: (id: number) => `/users/${id}/assign-usbc`,
};

const HOME_BASE_ENDPOINTS = {
  HOME_BASES: '/home-bases',
  HOME_BASE: (id: number) => `/home-bases/${id}`,
  SET_DEFAULT: (id: number) => `/home-bases/${id}/set-default`,
};

/**
 * Users API service
 */
export const UsersAPI = {
  /**
   * Get a list of users with optional filtering
   * @param params Optional filter parameters
   * @returns Promise with array of users
   */
  getUsers: async (params?: {
    skip?: number;
    limit?: number;
    role?: Role;
    active_only?: boolean;
    registered_only?: boolean;
    order?: 'id' | 'name' | 'created_at';
  }): Promise<UserRead[]> => {
    const response = await axiosInstance.get<UserRead[]>(USER_ENDPOINTS.USERS, { params });
    return response.data;
  },

  /**
   * Admin User Management: signed-up accounts only (claimed USBC, password set).
   * Pages past the API cap so TDs like td@example.com are not dropped.
   */
  listDirectoryUsers: async (): Promise<UserRead[]> => {
    const allUsers: UserRead[] = [];
    let skip = 0;
    const pageSize = 500;

    while (true) {
      const page = await UsersAPI.getUsers({
        skip,
        limit: pageSize,
        active_only: true,
        registered_only: true,
        order: 'name',
      });
      allUsers.push(...page);
      if (page.length < pageSize) {
        break;
      }
      skip += pageSize;
    }

    return allUsers;
  },

  /** TD/Admin: users with temporary V-prefixed placeholder USBC IDs */
  getTemporaryUsbcUsers: async (params?: { skip?: number; limit?: number }): Promise<UserRead[]> => {
    const response = await axiosInstance.get<UserRead[]>(USER_ENDPOINTS.TEMPORARY_USBC, {
      params: { skip: params?.skip ?? 0, limit: params?.limit ?? 100 },
    });
    return response.data;
  },

  /** TD/Admin: assign real USBC to a placeholder account */
  assignUsbc: async (
    userId: number,
    usbc_id: string,
    options?: { merge_into_existing?: boolean }
  ): Promise<UserRead> => {
    const response = await axiosInstance.patch<UserRead>(USER_ENDPOINTS.ASSIGN_USBC(userId), {
      usbc_id,
      merge_into_existing: options?.merge_into_existing ?? false,
    });
    return response.data;
  },

  /**
   * Get a specific user by ID
   * @param id User ID
   * @returns Promise with the user data
   */
  getUser: async (id: number): Promise<UserRead> => {
    const response = await axiosInstance.get<UserRead>(USER_ENDPOINTS.USER(id));
    return response.data;
  },

  getUserHomeEvents: async (id: number): Promise<BowlerHomeEvents> => {
    const response = await axiosInstance.get<BowlerHomeEvents>(USER_ENDPOINTS.USER_HOME_EVENTS(id));
    const data = response.data || {};
    return {
      in_progress: Array.isArray(data.in_progress) ? data.in_progress : [],
      upcoming: Array.isArray(data.upcoming) ? data.upcoming : [],
      completed: Array.isArray(data.completed) ? data.completed : [],
    };
  },

  getUserBowledEvents: async (id: number): Promise<BowlerBowledEvent[]> => {
    const response = await axiosInstance.get<BowlerBowledEvent[]>(
      USER_ENDPOINTS.USER_BOWLED_EVENTS(id)
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  getUserFinancialEvents: async (id: number): Promise<BowlerFinancialEvent[]> => {
    const response = await axiosInstance.get<BowlerFinancialEvent[]>(
      USER_ENDPOINTS.USER_FINANCIAL_EVENTS(id)
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Update a user
   * @param id User ID
   * @param userData Updated user data
   * @returns Promise with the updated user data
   */
  updateUser: async (id: number, userData: UserUpdate): Promise<UserRead> => {
    const response = await axiosInstance.put<UserRead>(USER_ENDPOINTS.USER(id), userData);
    return response.data;
  },

  updateCurrentUser: async (userData: UserUpdate): Promise<UserRead> => {
    const response = await axiosInstance.put<UserRead>(USER_ENDPOINTS.CURRENT_USER, userData);
    return response.data;
  },

  /**
   * Delete a user (set as inactive)
   * @param id User ID
   * @returns Promise with void result
   */
  deleteUser: async (id: number): Promise<void> => {
    await axiosInstance.delete(USER_ENDPOINTS.USER(id));
  },

  /**
   * Get a user with their game history
   * @param id User ID
   * @returns Promise with user and games data
   */
  getUserWithGames: async (id: number): Promise<UserWithGames> => {
    const response = await axiosInstance.get<UserWithGames>(USER_ENDPOINTS.USER_GAMES(id));
    return response.data;
  },

  /**
   * Get a user with their notifications
   * @param id User ID
   * @param unread_only Optional filter for unread notifications only
   * @returns Promise with user and notifications data
   */
  getUserWithNotifications: async (
    id: number,
    unread_only?: boolean
  ): Promise<UserWithNotifications> => {
    const response = await axiosInstance.get<UserWithNotifications>(
      USER_ENDPOINTS.USER_NOTIFICATIONS(id),
      { params: { unread_only } }
    );
    return response.data;
  },

  /**
   * Verify a user
   * @param id User ID
   * @returns Promise with the verified user data
   */
  verifyUser: async (id: number): Promise<UserRead> => {
    const response = await axiosInstance.post<UserRead>(USER_ENDPOINTS.USER_VERIFY(id));
    return response.data;
  },

  /**
   * Search users by a query string
   * @param query Search query to filter users (client-side filtering)
   * @param limit Maximum number of results to return (default: 50)
   * @returns Promise with filtered user data
   */
  searchUsers: async (query: string, limit: number = 50): Promise<UserRead[]> => {
    // Get users with the given limit
    const response = await axiosInstance.get<UserRead[]>(USER_ENDPOINTS.USERS, { 
      params: { 
        limit,
        active_only: true 
      } 
    });
    
    // If there's a query, filter results client-side
    if (query && query.trim() !== '') {
      const lowerQuery = query.toLowerCase();
      return response.data.filter((user: UserRead) => {
        const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
        return (
          fullName.includes(lowerQuery) ||
          (user.email && user.email.toLowerCase().includes(lowerQuery)) ||
          (user.phone && user.phone?.includes(lowerQuery)) ||
          (user.usbc_id && user.usbc_id.toLowerCase().includes(lowerQuery))
        );
      });
    }
    
    return response.data;
  },

  /**
   * Search users without a fixed result cap by paging through active users.
   * @param query Search query to filter users
   * @param pageSize Number of users fetched per page
   * @returns Promise with all matching users
   */
  searchUsersUnbounded: async (query: string, pageSize: number = 500): Promise<UserRead[]> => {
    const normalizedQuery = query.trim().toLowerCase();
    const allUsers: UserRead[] = [];
    let skip = 0;

    while (true) {
      const page = await UsersAPI.getUsers({
        skip,
        limit: pageSize,
        active_only: true,
      });
      allUsers.push(...page);

      if (page.length < pageSize) {
        break;
      }
      skip += pageSize;
    }

    if (!normalizedQuery) {
      return allUsers;
    }

    return allUsers.filter((user: UserRead) => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      return (
        fullName.includes(normalizedQuery) ||
        (user.email && user.email.toLowerCase().includes(normalizedQuery)) ||
        (user.phone && user.phone?.includes(normalizedQuery)) ||
        (user.usbc_id && user.usbc_id.toLowerCase().includes(normalizedQuery))
      );
    });
  },

  /**
   * Get all home bases for the current user
   * @returns Promise with array of home bases
   */
  getHomeBases: async (): Promise<HomeBaseRead[]> => {
    const response = await axiosInstance.get<HomeBaseRead[]>(HOME_BASE_ENDPOINTS.HOME_BASES);
    return response.data;
  },

  /**
   * Create a new home base
   * @param homeBaseData Home base data
   * @returns Promise with the created home base
   */
  createHomeBase: async (homeBaseData: HomeBaseCreate): Promise<HomeBaseRead> => {
    const response = await axiosInstance.post<HomeBaseRead>(HOME_BASE_ENDPOINTS.HOME_BASES, homeBaseData);
    return response.data;
  },

  /**
   * Get a specific home base by ID
   * @param id Home base ID
   * @returns Promise with the home base data
   */
  getHomeBase: async (id: number): Promise<HomeBaseRead> => {
    const response = await axiosInstance.get<HomeBaseRead>(HOME_BASE_ENDPOINTS.HOME_BASE(id));
    return response.data;
  },

  /**
   * Update a home base
   * @param id Home base ID
   * @param homeBaseData Updated home base data
   * @returns Promise with the updated home base data
   */
  updateHomeBase: async (id: number, homeBaseData: HomeBaseUpdate): Promise<HomeBaseRead> => {
    const response = await axiosInstance.put<HomeBaseRead>(HOME_BASE_ENDPOINTS.HOME_BASE(id), homeBaseData);
    return response.data;
  },

  /**
   * Delete a home base
   * @param id Home base ID
   * @returns Promise with void result
   */
  deleteHomeBase: async (id: number): Promise<void> => {
    await axiosInstance.delete(HOME_BASE_ENDPOINTS.HOME_BASE(id));
  },

  /**
   * Set a home base as the default
   * @param id Home base ID
   * @returns Promise with the updated home base data
   */
  setDefaultHomeBase: async (id: number): Promise<HomeBaseRead> => {
    const response = await axiosInstance.post<HomeBaseRead>(HOME_BASE_ENDPOINTS.SET_DEFAULT(id));
    return response.data;
  },

  /**
   * Get comprehensive earnings summary for a user
   * @param id User ID
   * @param timeframe Optional timeframe filter (all, 365days, 90days, 30days)
   * @returns Promise with earnings summary data
   */
  getUserEarnings: async (id: number, timeframe?: string): Promise<unknown> => {
    const response = await axiosInstance.get(USER_ENDPOINTS.USER_EARNINGS(id), {
      params: { timeframe }
    });
    return response.data;
  },

  /**
   * Get total earnings for a user
   * @param id User ID
   * @returns Promise with total earnings data
   */
  getUserTotalEarnings: async (id: number): Promise<{total_earnings: number}> => {
    const response = await axiosInstance.get(USER_ENDPOINTS.USER_TOTAL_EARNINGS(id));
    return response.data;
  },

  /**
   * Get earnings summary for the current user
   * @param timeframe Optional timeframe filter (all, 365days, 90days, 30days)
   * @returns Promise with earnings summary data
   */
  getCurrentUserEarnings: async (timeframe?: string): Promise<unknown> => {
    const response = await axiosInstance.get(USER_ENDPOINTS.CURRENT_USER_EARNINGS, {
      params: { timeframe }
    });
    return response.data;
  },

  /**
   * Get total earnings for the current user
   * @returns Promise with total earnings data
   */
  getCurrentUserTotalEarnings: async (): Promise<{total_earnings: number}> => {
    const response = await axiosInstance.get(USER_ENDPOINTS.CURRENT_USER_TOTAL_EARNINGS);
    return response.data;
  },

  /**
   * Get comprehensive performance metrics for a user
   * @param id User ID
   * @param timeframe Optional timeframe filter (all, 365days, 90days, 30days)
   * @returns Promise with performance metrics data
   */
  getUserPerformanceMetrics: async (id: number, timeframe?: string): Promise<unknown> => {
    const response = await axiosInstance.get(USER_ENDPOINTS.USER_PERFORMANCE(id), {
      params: { timeframe }
    });
    return response.data;
  },

  /**
   * Get performance metrics for the current user
   * @param timeframe Optional timeframe filter (all, 365days, 90days, 30days)
   * @returns Promise with performance metrics data
   */
  getCurrentUserPerformanceMetrics: async (timeframe?: string): Promise<unknown> => {
    const response = await axiosInstance.get(USER_ENDPOINTS.CURRENT_USER_PERFORMANCE, {
      params: { timeframe }
    });
    return response.data;
  },

  /**
   * Create a bowler as tournament director.
   * With email: random password + optional welcome email.
   * Without email: temporary bowler record (V-USBC if needed).
   */
  createUserByTD: async (userData: Omit<UserCreate, 'password'> & { send_welcome_email?: boolean }): Promise<UserRead> => {
    const response = await axiosInstance.post<UserRead>('/users/create-by-td', userData);
    return response.data;
  },

  /**
   * Admin User Management: create a full account with any role.
   */
  createUserByAdmin: async (userData: UserCreate & { is_active?: boolean }): Promise<UserRead> => {
    const response = await axiosInstance.post<UserRead>('/users/create-by-admin', userData);
    return response.data;
  },

  /**
   * Create a minimal user with just USBC ID, first name, and last name
   * @param userData Minimal user data
   * @returns Promise with the created user data
   */
  createMinimalUser: async (userData: UserCreateMinimal): Promise<UserRead> => {
    const response = await axiosInstance.post<UserRead>(USER_ENDPOINTS.MINIMAL_USER, userData);
    return response.data;
  },

  /**
   * Search for a USBC ID to see if it exists and can be claimed
   * @param usbc_id The USBC ID to search for
   * @returns Promise with search result
   */
  searchUSBC: async (usbc_id: string): Promise<USBCSearchResult> => {
    const response = await axiosInstance.get<USBCSearchResult>(USER_ENDPOINTS.SEARCH_USBC(usbc_id));
    return response.data;
  },

  /**
   * Batch search for multiple USBC IDs to see if they exist
   * @param usbc_ids Array of USBC IDs to search for
   * @returns Promise with array of search results
   */
  batchSearchUSBC: async (usbc_ids: string[]): Promise<USBCSearchResult[]> => {
    const response = await axiosInstance.post<USBCSearchResult[]>('/users/search-usbc-batch', usbc_ids);
    return response.data;
  },

  /**
   * Claim an existing user profile by providing email/password and matching USBC ID
   * @param claimData Claim request data
   * @returns Promise with claim response
   */
  claimProfile: async (claimData: UserClaimRequest): Promise<UserClaimResponse> => {
    const response = await axiosInstance.post<UserClaimResponse>(USER_ENDPOINTS.CLAIM_PROFILE, claimData);
    return response.data;
  },

  /**
   * Create multiple minimal users in a single batch operation
   * @param usersData Array of minimal user data
   * @returns Promise with array of created users
   */
  batchCreateMinimalUsers: async (usersData: UserCreateMinimal[]): Promise<UserRead[]> => {
    const response = await axiosInstance.post<UserRead[]>('/users/batch-create-minimal', usersData);
    return response.data;
  }
};