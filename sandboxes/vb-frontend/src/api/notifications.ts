import axiosInstance from '../api/axios';
import { 
  NotificationRead, 
  NotificationCreate, 
  NotificationUpdate,
  BatchNotificationCreate,
  NotificationSummary
} from '../types/notification';

const NOTIFICATION_ENDPOINTS = {
  NOTIFICATIONS: '/notifications',
  NOTIFICATION: (id: number) => `/notifications/${id}`,
  MARK_READ: (id: number) => `/notifications/${id}/mark-read`,
  BATCH: '/notifications/batch',
  USER_SUMMARY: (userId: number) => `/notifications/user/${userId}/summary`,
};

/**
 * Notifications API service
 */
export const NotificationsAPI = {
  /**
   * Get a list of notifications with optional filtering
   * @param params Optional filter parameters
   * @returns Promise with array of notifications
   */
  getNotifications: async (params?: {
    skip?: number;
    limit?: number;
    user_id?: number;
    unread_only?: boolean;
    notification_type?: string;
  }): Promise<NotificationRead[]> => {
    const response = await axiosInstance.get<NotificationRead[]>(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, { params });
    return response.data;
  },

  /**
   * Create a new notification
   * @param data Notification data
   * @returns Promise with created notification
   */
  createNotification: async (data: NotificationCreate): Promise<NotificationRead> => {
    const response = await axiosInstance.post<NotificationRead>(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, data);
    return response.data;
  },

  /**
   * Get a specific notification by ID
   * @param id Notification ID
   * @returns Promise with the notification data
   */
  getNotification: async (id: number): Promise<NotificationRead> => {
    const response = await axiosInstance.get<NotificationRead>(NOTIFICATION_ENDPOINTS.NOTIFICATION(id));
    return response.data;
  },

  /**
   * Update a notification
   * @param id Notification ID
   * @param data Updated notification data
   * @returns Promise with the updated notification data
   */
  updateNotification: async (id: number, data: NotificationUpdate): Promise<NotificationRead> => {
    const response = await axiosInstance.put<NotificationRead>(NOTIFICATION_ENDPOINTS.NOTIFICATION(id), data);
    return response.data;
  },

  /**
   * Delete a notification
   * @param id Notification ID
   * @returns Promise with void result
   */
  deleteNotification: async (id: number): Promise<void> => {
    await axiosInstance.delete(NOTIFICATION_ENDPOINTS.NOTIFICATION(id));
  },

  /**
   * Mark a notification as read
   * @param id Notification ID
   * @returns Promise with updated notification data
   */
  markNotificationAsRead: async (id: number): Promise<NotificationRead> => {
    const response = await axiosInstance.put<NotificationRead>(NOTIFICATION_ENDPOINTS.MARK_READ(id));
    return response.data;
  },

  /**
   * Create notifications for multiple users in a batch
   * @param data Batch notification data
   * @returns Promise with array of created notifications
   */
  createBatchNotifications: async (data: BatchNotificationCreate): Promise<NotificationRead[]> => {
    const response = await axiosInstance.post<NotificationRead[]>(NOTIFICATION_ENDPOINTS.BATCH, data);
    return response.data;
  },

  /**
   * Get a summary of notifications for a user
   * @param userId User ID
   * @returns Promise with notification summary
   */
  getUserNotificationsSummary: async (userId: number): Promise<NotificationSummary> => {
    const response = await axiosInstance.get<NotificationSummary>(NOTIFICATION_ENDPOINTS.USER_SUMMARY(userId));
    return response.data;
  }
};