import api from './axios';
import { AxiosResponse } from 'axios';
import type { AuthResponse } from '../types/auth';
import type { USBCClaimRead } from '../types/usbcClaim';

// Account security API endpoints

// Password management
export const changePassword = async (currentPassword: string, newPassword: string) => {
  return api.post('/account/change-password', {
    current_password: currentPassword,
    new_password: newPassword
  });
};

export const requestPasswordReset = async (email: string) => {
  return api.post('/account/request-password-reset', { email });
};

export const resetPassword = async (token: string, email: string, newPassword: string) => {
  return api.post('/account/reset-password', {
    token,
    email,
    new_password: newPassword
  });
};

// Email verification
export const requestEmailVerification = async (email: string) => {
  return api.post('/account/request-email-verification', { email });
};

export const verifyEmail = async (token: string, email: string) => {
  return api.post('/account/verify-email', { token, email });
};

// Two-factor authentication
export interface TwoFactorSetupResponse {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}

export const setupTwoFactor = async (): Promise<AxiosResponse<TwoFactorSetupResponse>> => {
  return api.post('/account/2fa/setup');
};

export interface TwoFactorVerifyResponse {
  success: boolean;
  message: string;
}

export const verifyTwoFactor = async (code: string): Promise<AxiosResponse<TwoFactorVerifyResponse>> => {
  return api.post('/account/2fa/verify', { code });
};

export const disableTwoFactor = async (code: string) => {
  return api.post('/account/2fa/disable', { code });
};

export const verifyTwoFactorLogin = async (
  code: string,
  sessionId: string
): Promise<AxiosResponse<AuthResponse>> => {
  return api.post('/account/2fa/verify-login', { code }, {
    params: { session_id: sessionId }
  });
};

// Notification preferences
export enum NotificationPreference {
  ALL = 'all',
  IMPORTANT = 'important',
  NONE = 'none'
}

export enum EmailFrequency {
  IMMEDIATELY = 'immediately',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NONE = 'none',
}

export interface NotificationPreferences {
  notification_preference: NotificationPreference;
  email_notification_preference: EmailFrequency;
  push_notifications_enabled: boolean;
}

export const updateNotificationPreferences = async (preferences: NotificationPreferences) => {
  return api.put('/account/notification-preferences', preferences);
};

export const updateTdNotificationPreferences = async (prefs: Partial<TdNotificationPreferences>) => {
  return api.put('/account/td-notification-preferences', prefs);
};

// User sessions
export interface UserSession {
  id: number;
  device_info: string | null;
  ip_address: string | null;
  created_at: string;
  last_active_at: string;
  is_active: boolean;
}

export const getUserSessions = async (): Promise<AxiosResponse<UserSession[]>> => {
  return api.get('/account/sessions');
};

export const deleteSession = async (sessionId: number) => {
  return api.delete(`/account/sessions/${sessionId}`);
};

export const deleteAllSessions = async (keepCurrent: boolean = true) => {
  return api.delete('/account/sessions', {
    params: { keep_current: keepCurrent }
  });
};

// Security info
export interface TdNotificationPreferences {
  td_notify_email_enabled: boolean;
  td_notify_sms_enabled: boolean;
  td_email_rest_period_seconds: number;
  td_sms_rest_period_seconds: number;
  phone_verified_for_sms: boolean;
}

export interface UserSecurityInfo {
  id: number;
  email: string;
  email_verified: boolean;
  is_2fa_enabled: boolean;
  notification_preference: NotificationPreference;
  email_notification_preference: EmailFrequency;
  push_notifications_enabled: boolean;
  default_search_radius: number;
  last_login_at: string | null;
  last_login_ip: string | null;
  login_sessions: UserSession[];
  role: string;
  td_notify_email_enabled?: boolean;
  td_notify_sms_enabled?: boolean;
  td_email_rest_period_seconds?: number;
  td_sms_rest_period_seconds?: number;
  phone_verified_for_sms?: boolean;
}

export const getSecurityInfo = async (): Promise<AxiosResponse<UserSecurityInfo>> => {
  return api.get('/account/me/security');
};

// User preferences
export interface UserPreferences {
  default_search_radius?: number;
  notification_preference?: NotificationPreference;
  email_notification_preference?: EmailFrequency;
  push_notifications_enabled?: boolean;
}

export const updateUserPreferences = async (
  preferences: UserPreferences
): Promise<AxiosResponse<UserPreferences>> => {
  return api.put('/account/preferences', preferences);
};

export interface UsbcIdentityRead {
  usbc_id: string;
  is_active: boolean;
}

export interface UsbcIdentityManagementRead {
  active_usbc_id?: string | null;
  identities: UsbcIdentityRead[];
}

export const getUsbcIdentities = async (): Promise<AxiosResponse<UsbcIdentityManagementRead>> => {
  return api.get('/account/usbc-identities');
};

export const setActiveUsbcIdentity = async (
  usbc_id: string
): Promise<AxiosResponse<UsbcIdentityManagementRead>> => {
  return api.put('/account/usbc-identities/active', { usbc_id });
};

export const claimAdditionalUsbcIdentity = async (
  usbc_id: string,
  claimant_notes?: string
): Promise<AxiosResponse<USBCClaimRead>> => {
  return api.post('/account/usbc-identities/claim-additional', {
    usbc_id,
    claimant_notes,
  });
};