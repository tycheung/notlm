import { devError } from './devLog';
import axiosInstance from '../api/axios';

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptimeHours: number;
  lastBackup: string | null;
  diskUsage: number; // percentage
  memoryUsage: number; // percentage
  statusReasons: string[];
  dbSize: number; // size in MB
  dbConnections: number;
  dbCacheHitRatio: number; // percentage
  dbResponseTime: number; // in milliseconds
}

export interface AggregateCount {
  total: number;
  active: number;
}

export interface TournamentAggregateCount extends AggregateCount {
  completed: number;
}

export interface UserAggregateCount extends AggregateCount {
  newThisMonth: number;
}

export interface AbuseReportAggregateCount {
  open: number;
  in_review: number;
  total: number;
}

export interface BillingStats {
  available: boolean;
  message: string;
  activeAnnualSubscriptions: number;
  activeMonthlySubscriptions: number;
  activeSideActionAnnualSubscriptions?: number;
  activeSideActionMonthlySubscriptions?: number;
  unusedTournamentCredits: number;
  unusedSideActionPasses?: number;
  unusedLargeCapLiftPasses?: number;
}

export interface SystemStats {
  users: UserAggregateCount;
  tournaments: TournamentAggregateCount;
  bowlingCenters: AggregateCount;
  events: AggregateCount;
  games: AggregateCount;
  uniqueBowlers: number;
  abuseReports: AbuseReportAggregateCount;
  billing: BillingStats;
  subscriptionTds?: number;
  happeningToday?: number;
  comingUp?: number;
}

export type AdminScheduleEvent = {
  event_id: number;
  event_name: string;
  tournament_id: number;
  tournament_name: string;
  start_date: string;
  end_date: string;
};

export type AdminEventWindows = {
  happening_today: AdminScheduleEvent[];
  coming_up: AdminScheduleEvent[];
};

const SYSTEM_ENDPOINTS = {
  HEALTH: '/admin/system/health',
  STATS: '/admin/system/stats',
  EVENT_WINDOWS: '/admin/system/event-windows',
};

export const SystemAPI = {
  /**
   * Get system health information
   * @returns Promise with system health data
   */
  getSystemHealth: async (): Promise<SystemHealth> => {
    try {
      const response = await axiosInstance.get<SystemHealth>(SYSTEM_ENDPOINTS.HEALTH);
      return response.data;
    } catch (error) {
      devError('Error fetching system health:', error);
      throw error;
    }
  },
  /**
   * Get aggregate dashboard stats
   * @returns Promise with aggregate dashboard card counts
   */
  getSystemStats: async (): Promise<SystemStats> => {
    try {
      const response = await axiosInstance.get<SystemStats>(SYSTEM_ENDPOINTS.STATS);
      return response.data;
    } catch (error) {
      devError('Error fetching system stats:', error);
      throw error;
    }
  },

  getEventWindows: async (): Promise<AdminEventWindows> => {
    const response = await axiosInstance.get<AdminEventWindows>(SYSTEM_ENDPOINTS.EVENT_WINDOWS);
    const data = response.data || {};
    return {
      happening_today: Array.isArray(data.happening_today) ? data.happening_today : [],
      coming_up: Array.isArray(data.coming_up) ? data.coming_up : [],
    };
  },
};
