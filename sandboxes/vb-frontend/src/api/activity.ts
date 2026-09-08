import axiosInstance from '../api/axios';

export interface ActivityLogEntry {
  id: number;
  action: string;
  description: string;
  user: string;
  timestamp: string;
}

const ACTIVITY_ENDPOINTS = {
  LOGS: '/admin/activity',
  LOG: (id: number) => `/admin/activity/${id}`,
};

export const ActivityAPI = {
  /**
   * Get system activity logs
   * @returns Promise with array of activity logs
   */
  getActivityLogs: async (params?: { limit?: number }): Promise<ActivityLogEntry[]> => {
    const response = await axiosInstance.get<ActivityLogEntry[]>(ACTIVITY_ENDPOINTS.LOGS, { params });
    return response.data;
  }
}; 