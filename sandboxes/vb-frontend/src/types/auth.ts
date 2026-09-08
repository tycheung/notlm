import { UserRead } from './user';

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authentication response from login
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserRead;
  expires_in?: number;  // Access token expiry in seconds
  requires_2fa?: boolean;
  session_id?: string;
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  refresh_token: string;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Request password reset
 */
export interface ResetPasswordRequest {
  email: string;
}

/**
 * Set new password with reset token
 */
export interface NewPasswordRequest {
  token: string;
  email: string;
  password: string;
}