import { isAxiosError } from 'axios';
import axiosInstance from '../api/axios';
import { devError, devLog } from './devLog';
import { getErrorMessage } from '../api/apiErrors';
import { LoginCredentials, AuthResponse, ResetPasswordRequest, NewPasswordRequest, TokenRefreshResponse } from '../types/auth';
import { UserCreate, UserRead } from '../types/user';

const AUTH_ENDPOINTS = {
  LOGIN: '/users/login',
  REGISTER: '/users',
  ME: '/users/me',
  REQUEST_PASSWORD_RESET: '/account/request-password-reset',
  RESET_PASSWORD: '/account/reset-password',
  REQUEST_EMAIL_VERIFICATION: '/account/request-email-verification',
  VERIFY_EMAIL: '/account/verify-email',
  REFRESH_TOKEN: '/auth/refresh',
  LOGOUT: '/auth/logout',
};

/**
 * Authentication API service
 */
export const AuthAPI = {
  /**
   * Log in a user
   * @param credentials User login credentials
   * @returns Promise with the authentication response
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await axiosInstance.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, credentials);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const errorMessage = getErrorMessage(error, 'Login failed. Please check your credentials.');
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  /**
   * Refresh access token using refresh token from HttpOnly cookie
   * Refresh token is automatically sent via cookie (withCredentials: true)
   * @returns Promise with the new access token
   */
  refreshToken: async (): Promise<TokenRefreshResponse> => {
    try {
      // Refresh token is sent automatically via HttpOnly cookie
      // No need to pass it in the request body
      const response = await axiosInstance.post<TokenRefreshResponse>(
        AUTH_ENDPOINTS.REFRESH_TOKEN,
        {} // Empty body - cookie will be sent automatically
      );
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const errorMessage = getErrorMessage(error, 'Failed to refresh token.');
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  /**
   * Register a new user
   * @param userData User registration data
   * @returns Promise with the registered user data
   */
  register: async (userData: UserCreate): Promise<UserRead> => {
    try {
      const response = await axiosInstance.post<UserRead>(AUTH_ENDPOINTS.REGISTER, userData);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const errorMessage = getErrorMessage(error, 'Registration failed. Please try again.');
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  /**
   * Get current user profile
   * @returns Promise with the current user data
   */
  getCurrentUserProfile: async (): Promise<UserRead> => {
    try {
      const response = await axiosInstance.get<UserRead>(AUTH_ENDPOINTS.ME);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      throw error;
    }
  },

  /**
   * Request password reset
   * @param data Reset password request data
   * @returns Promise with the response
   */
  requestPasswordReset: async (data: ResetPasswordRequest): Promise<{message: string}> => {
    try {
      const response = await axiosInstance.post<{message: string}>(
        AUTH_ENDPOINTS.REQUEST_PASSWORD_RESET,
        data
      );
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const errorMessage = getErrorMessage(error, 'Failed to request password reset.');
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  /**
   * Set new password with reset token
   * @param data New password request data
   * @returns Promise with the response
   */
  setNewPassword: async (data: NewPasswordRequest): Promise<{message: string}> => {
    try {
      const response = await axiosInstance.post<{message: string}>(
        AUTH_ENDPOINTS.RESET_PASSWORD,
        {
          token: data.token,
          email: data.email,
          new_password: data.password,
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const errorMessage = getErrorMessage(error, 'Failed to set new password.');
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  requestEmailVerification: async (email: string): Promise<{message: string}> => {
    try {
      const response = await axiosInstance.post<{message: string}>(
        AUTH_ENDPOINTS.REQUEST_EMAIL_VERIFICATION,
        { email }
      );
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const errorMessage = getErrorMessage(error, 'Failed to request email verification.');
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  verifyEmail: async (token: string, email: string): Promise<{message: string}> => {
    try {
      const response = await axiosInstance.post<{message: string}>(AUTH_ENDPOINTS.VERIFY_EMAIL, {
        token,
        email,
      });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const errorMessage = getErrorMessage(error, 'Failed to verify email.');
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  /**
   * Log out the current user
   * Refresh token is sent automatically via HttpOnly cookie
   */
  logout: async () => {
    try {
      // Refresh token is sent automatically via HttpOnly cookie
      // No need to pass it in the request body
      await axiosInstance.post(AUTH_ENDPOINTS.LOGOUT, {});
    } catch (error) {
      devError('Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    }
    
    // Clear local storage (refresh token cookie will be cleared by server)
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token'); // Legacy cleanup
    localStorage.removeItem('user');
    localStorage.removeItem('token_expires_at');
  },

  /**
   * Check if a user is currently logged in
   * Note: Refresh token is now stored in HttpOnly cookie, so we only check access token
   * @returns True if logged in, false otherwise
   */
  isLoggedIn: (): boolean => {
    // Access token presence indicates logged in state
    // Refresh token is in HttpOnly cookie and cannot be checked from JavaScript
    return !!localStorage.getItem('token');
  },

  /**
   * Get the current user from localStorage
   * @returns Current user or null if not logged in
   */
  getCurrentUser: () => {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;
    
    try {
      return JSON.parse(userJson);
    } catch (e) {
      devError('Failed to parse stored user data:', e);
      return null;
    }
  },

  /**
   * Get stored tokens
   * Note: Refresh token is now in HttpOnly cookie and cannot be accessed from JavaScript
   * @returns Object with access token (refresh token is in cookie)
   */
  getTokens: () => {
    return {
      accessToken: localStorage.getItem('token'),
      refreshToken: null // Refresh token is in HttpOnly cookie, not accessible from JavaScript
    };
  },

  /**
   * Store authentication tokens
   * Note: Refresh token is now stored in HttpOnly cookie by the server
   * Only access token is stored in localStorage
   */
  storeTokens: (accessToken: string, refreshToken?: string, expiresIn?: number) => {
    localStorage.setItem('token', accessToken);
    // Refresh token is stored in HttpOnly cookie by server, but we keep it for backward compatibility
    // during migration period. It will be removed in a future update.
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    
    // Store expiration time if provided (expiresIn is in seconds)
    if (expiresIn) {
      const expiresAt = Date.now() + (expiresIn * 1000);
      localStorage.setItem('token_expires_at', expiresAt.toString());
    }
  },

  /**
   * Check if the access token is expired or about to expire
   * @param bufferMinutes Minutes before expiration to consider token as "expiring soon" (default: 3)
   * @returns True if token is expired or expiring soon
   */
  isTokenExpiringSoon: (bufferMinutes: number = 3): boolean => {
    const expiresAtStr = localStorage.getItem('token_expires_at');
    if (!expiresAtStr) {
      // If we don't have expiration time, assume it might be expired
      return true;
    }
    
    const expiresAt = parseInt(expiresAtStr, 10);
    const bufferMs = bufferMinutes * 60 * 1000;
    const now = Date.now();
    
    // Token is expiring soon if current time + buffer >= expiration time
    return (now + bufferMs) >= expiresAt;
  },

  /**
   * Get the time remaining until token expiration in milliseconds
   * @returns Milliseconds until expiration, or 0 if expired/unknown
   */
  getTokenTimeRemaining: (): number => {
    const expiresAtStr = localStorage.getItem('token_expires_at');
    if (!expiresAtStr) {
      return 0;
    }
    
    const expiresAt = parseInt(expiresAtStr, 10);
    const remaining = expiresAt - Date.now();
    return Math.max(0, remaining);
  },

  clearAuthData: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token'); // Legacy cleanup
    localStorage.removeItem('user');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('redirectAfterLogin');
    try {
      sessionStorage.removeItem('vb_impersonation');
      sessionStorage.removeItem('vb_admin_backup');
    } catch {
      /* ignore */
    }
    // Note: Refresh token cookie will be cleared by server on logout
    devLog('All auth data cleared from localStorage');
  }
};