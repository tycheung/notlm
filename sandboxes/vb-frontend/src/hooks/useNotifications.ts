import { useState, useCallback } from 'react';
import { getErrorMessage } from '../api/apiErrors';
import { NotificationsAPI } from '../api/notifications';

export const useNotifications = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get user notifications
  const getUserNotifications = useCallback(async (userId: number, unreadOnly: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const notifications = await NotificationsAPI.getNotifications({
        user_id: userId,
        unread_only: unreadOnly
      });
      return notifications;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to fetch notifications');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    setLoading(true);
    setError(null);
    try {
      const notification = await NotificationsAPI.markNotificationAsRead(notificationId);
      return notification;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to mark notification as read');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get notification summary for user
  const getNotificationSummary = useCallback(async (userId: number) => {
    setLoading(true);
    setError(null);
    try {
      const summary = await NotificationsAPI.getUserNotificationsSummary(userId);
      return summary;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to fetch notification summary');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: number) => {
    setLoading(true);
    setError(null);
    try {
      await NotificationsAPI.deleteNotification(notificationId);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to delete notification');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getUserNotifications,
    markAsRead,
    getNotificationSummary,
    deleteNotification
  };
};