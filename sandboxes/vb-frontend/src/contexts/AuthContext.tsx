import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AuthAPI } from '../api/auth';
import { verifyTwoFactorLogin } from '../api/account';
import { AuthResponse } from '../types/auth';
import { UserRead } from '../types/user';
import axiosInstance from '../api/axios';
import { getAppHomeUrl } from '../utils/appUrl';

export type LoginResult =
  | { status: 'authenticated' }
  | { status: 'requires_2fa'; sessionId: string };

interface AuthContextType {
  user: UserRead | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeTwoFactorLogin: (code: string, sessionId: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: UserRead) => void;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserRead | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use ref to store timer so it persists across renders
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is already logged in on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (!token || !storedUser) {
          setLoading(false);
          return;
        }

        // Parse stored user data but don't set it yet
        let parsedUser: UserRead | null = null;
        try {
          parsedUser = JSON.parse(storedUser);
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
          // Clear corrupted data from localStorage
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token'); // Legacy cleanup
          setLoading(false);
          return;
        }
        
        // Validate the token first before setting user
        try {
          const isValid = await validateTokenInternal();
          if (isValid && parsedUser) {
            // Only set user if token is valid
            setUser(parsedUser);
            // Start token refresh timer since user is logged in
            // Note: Timer will be started in the useEffect when user is set
          } else {
            // Clear invalid session data
            await logout();
          }
        } catch (error: any) {
          console.error('Error validating token:', error);
          // Only logout for authentication errors, not for network/server errors
          if (error.response && error.response.status === 401) {
            await logout();
          } else if (parsedUser) {
            // For network errors, set user but mark as potentially stale
            setUser(parsedUser);
          }
        } finally {
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Authentication error:', error);
        await logout();
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Proactive token refresh timer function
  const startTokenRefreshTimer = () => {
    // Clear any existing timer
    if (tokenRefreshTimerRef.current) {
      clearInterval(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    
    const checkAndRefreshToken = async () => {
      // Check if token is expiring soon (within 3 minutes)
      if (AuthAPI.isTokenExpiringSoon(3)) {
        try {
          // Refresh token is automatically sent via HttpOnly cookie
          // No need to get it from localStorage
          const response = await AuthAPI.refreshToken();
          
          AuthAPI.storeTokens(
            response.access_token,
            undefined,
            response.expires_in
          );
          const { reissueImpersonationAfterAdminRefresh } = await import(
            '../utils/impersonationSession'
          );
          await reissueImpersonationAfterAdminRefresh();
          
        } catch (error) {
          console.error('Proactive token refresh failed:', error);
          // If refresh fails, the axios interceptor will handle it on next request
        }
      }
    };
    
    // Check immediately
    checkAndRefreshToken();
    
    // Then check every 2 minutes (more frequent than token expiration)
    tokenRefreshTimerRef.current = setInterval(checkAndRefreshToken, 2 * 60 * 1000);
  };
  
  // Periodically validate token to ensure it hasn't expired
  useEffect(() => {
    if (!user) {
      // Clear timer if user logs out
      if (tokenRefreshTimerRef.current) {
        clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
      return;
    }

    // Start proactive refresh timer when user is logged in
    startTokenRefreshTimer();

    // Also validate token every 5 minutes as a backup
    const tokenValidationInterval = setInterval(() => {
      validateToken();
    }, 5 * 60 * 1000);

    return () => {
      if (tokenRefreshTimerRef.current) {
        clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
      clearInterval(tokenValidationInterval);
    };
  }, [user]);

  // Internal function to validate the token with the server
  const validateTokenInternal = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      // Make a request to a protected endpoint that requires authentication
      const response = await axiosInstance.get('/users/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // If successful, also update the user info to ensure it's fresh
      if (response.data && response.status === 200) {
        localStorage.setItem('user', JSON.stringify(response.data));
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Token validation failed:', error);
      // If the token validation fails, automatically sign the user out
      // This will be triggered when there's a 401 error (expired/invalid token)
      // or when the backend is unreachable
      
      // Only log out if we get a clear 401 unauthorized
      if (error.response && error.response.status === 401) {
        return false;
      }
      
      // For network errors or other issues, don't log out during page refresh
      // This helps prevent unwanted redirects on refresh
      throw error; // Re-throw to be handled by caller
    }
  };

  // Function to validate the token with the server (public API)
  const validateToken = async (): Promise<boolean> => {
    try {
      const isValid = await validateTokenInternal();
      if (!isValid) {
        await logout();
      }
      return isValid;
    } catch (error: any) {
      // Only log out if we get a clear 401 unauthorized
      if (error.response && error.response.status === 401) {
        await logout();
        return false;
      }
      
      // For network errors or other issues, return current auth state
      return !!user;
    }
  };

  const applyAuthSession = (response: AuthResponse) => {
    AuthAPI.storeTokens(
      response.access_token,
      response.refresh_token || undefined,
      response.expires_in
    );
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
    startTokenRefreshTimer();
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    try {
      const response = await AuthAPI.login({ email, password });

      if (response.requires_2fa) {
        if (!response.session_id) {
          throw new Error('Two-factor authentication required but no session was returned.');
        }
        return { status: 'requires_2fa', sessionId: response.session_id };
      }

      applyAuthSession(response);
      return { status: 'authenticated' };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeTwoFactorLogin = async (code: string, sessionId: string) => {
    setLoading(true);
    try {
      const { data } = await verifyTwoFactorLogin(code, sessionId);
      applyAuthSession(data);
    } catch (error) {
      console.error('2FA login verification failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Clear token refresh timer
    if (tokenRefreshTimerRef.current) {
      clearInterval(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    
    // Call API logout to invalidate refresh token
    try {
      await AuthAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    }
    
    // Clear all auth-related localStorage data
    AuthAPI.clearAuthData();
    
    // Clear user state
    setUser(null);
    
    // Navigate to home using simple window.location
    window.location.href = getAppHomeUrl();
  };

  const updateUser = (userData: UserRead) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    completeTwoFactorLogin,
    logout,
    updateUser,
    validateToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
