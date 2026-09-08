import { devError } from './devLog';
import axiosInstance from './axios';

export type AbuseReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export interface AbuseReportableEvent {
  event_id: number;
  event_name: string;
  tournament_id: number | null;
  tournament_name: string | null;
}

export interface AbuseReport {
  id: number;
  reporter_user_id: number;
  reporter_name: string;
  reporter_email: string;
  event_id: number | null;
  event_name: string;
  tournament_id: number | null;
  tournament_name: string | null;
  reason: string;
  status: AbuseReportStatus;
  admin_notes: string | null;
  outcome?: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface AbuseReportList {
  items: AbuseReport[];
  open_count: number;
  has_more?: boolean;
}

export interface AbuseReportCreatePayload {
  event_id: number;
  reason: string;
}

export interface AbuseReportUpdatePayload {
  status?: AbuseReportStatus;
  admin_notes?: string | null;
  outcome?: string | null;
}

const ACCOUNT_ENDPOINTS = {
  REPORTABLE_EVENTS: '/account/abuse-reports/reportable-events',
  CREATE: '/account/abuse-reports',
};

const ADMIN_ENDPOINTS = {
  LIST: '/admin/abuse-reports',
  DETAIL: (id: number) => `/admin/abuse-reports/${id}`,
};

export const AbuseReportsAPI = {
  listReportableEvents: async (): Promise<AbuseReportableEvent[]> => {
    try {
      const response = await axiosInstance.get<AbuseReportableEvent[]>(
        ACCOUNT_ENDPOINTS.REPORTABLE_EVENTS
      );
      return response.data;
    } catch (error) {
      devError('Error fetching reportable events:', error);
      throw error;
    }
  },

  createReport: async (payload: AbuseReportCreatePayload): Promise<AbuseReport> => {
    try {
      const response = await axiosInstance.post<AbuseReport>(
        ACCOUNT_ENDPOINTS.CREATE,
        payload
      );
      return response.data;
    } catch (error) {
      devError('Error creating abuse report:', error);
      throw error;
    }
  },

  listAdminReports: async (params?: {
    status?: AbuseReportStatus;
    queue?: 'needs_review';
    limit?: number;
  }): Promise<AbuseReportList> => {
    try {
      const response = await axiosInstance.get<AbuseReportList>(ADMIN_ENDPOINTS.LIST, {
        params,
      });
      return response.data;
    } catch (error) {
      devError('Error listing abuse reports:', error);
      throw error;
    }
  },

  updateAdminReport: async (
    id: number,
    payload: AbuseReportUpdatePayload
  ): Promise<AbuseReport> => {
    try {
      const response = await axiosInstance.patch<AbuseReport>(
        ADMIN_ENDPOINTS.DETAIL(id),
        payload
      );
      return response.data;
    } catch (error) {
      devError('Error updating abuse report:', error);
      throw error;
    }
  },
};
