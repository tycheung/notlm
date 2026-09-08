import axiosInstance from '../api/axios';

export interface SystemAlert {
  id: number;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

const ALERT_ENDPOINTS = {
  ALERTS: '/admin/alerts',
  ALERT: (id: number) => `/admin/alerts/${id}`,
  DISMISS: (id: number) => `/admin/alerts/${id}/dismiss`,
};

export const AlertsAPI = {
  /**
   * Get system alerts
   * @returns Promise with array of system alerts
   */
  getAlerts: async (params?: { limit?: number }): Promise<SystemAlert[]> => {
    const response = await axiosInstance.get<SystemAlert[]>(ALERT_ENDPOINTS.ALERTS, { params });
    return response.data;
  },

  /**
   * Dismiss a system alert
   * @param id Alert ID
   * @returns Promise with void result
   */
  dismissAlert: async (id: number): Promise<void> => {
    await axiosInstance.post(ALERT_ENDPOINTS.DISMISS(id));
  }
}; 