import { NotificationType } from './notification_enum';

export interface NotificationBase {
  user_id: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  entity_id?: number | null;
  entity_type?: string | null;
  priority: number;
  expires_at?: string | null; // ISO format datetime
}

export interface NotificationCreate extends NotificationBase {}

export interface NotificationUpdate {
  title?: string;
  message?: string;
  notification_type?: NotificationType;
  entity_id?: number | null;
  entity_type?: string | null;
  read?: boolean;
  expires_at?: string | null; // ISO format datetime
  priority?: number;
}

export interface NotificationRead extends NotificationBase {
  id: number;
  created_at: string; // ISO format datetime
  updated_at?: string | null; // ISO format datetime
  read: boolean;
  read_at?: string | null; // ISO format datetime
}

export interface BatchNotificationCreate {
  user_ids: number[];
  title: string;
  message: string;
  notification_type: NotificationType;
  entity_id?: number | null;
  entity_type?: string | null;
  priority: number;
  expires_at?: string | null; // ISO format datetime
}

export interface NotificationSummary {
  total: number;
  unread: number;
  priority_unread: number;
}