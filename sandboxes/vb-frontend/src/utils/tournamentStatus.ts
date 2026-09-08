import { TournamentRead } from '../types/tournament';
import { parseNaiveDateTimeToDate } from './dateUtils';

export type TournamentStatusType = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface TournamentStatusInfo {
  status: TournamentStatusType;
  label: string;
  colorClasses: string;
}

/**
 * Unified tournament status determination logic
 * Based on tournament dates and active flag
 */
export const getTournamentStatus = (tournament: TournamentRead): TournamentStatusType => {
  // Check if tournament is cancelled first
  if (!tournament.is_active) return 'cancelled';

  if (!tournament.start_date || !tournament.end_date) {
    return 'upcoming';
  }

  const startDate = parseNaiveDateTimeToDate(tournament.start_date);
  const endDate = parseNaiveDateTimeToDate(tournament.end_date);
  const today = new Date();
  if (!startDate || !endDate) return 'upcoming';

  // Compare dates to determine status
  if (today < startDate) return 'upcoming';
  if (today > endDate) return 'completed';
  return 'ongoing';
};

/**
 * Format status for display with proper capitalization
 */
export const formatTournamentStatus = (status: TournamentStatusType): string => {
  switch (status) {
    case 'ongoing':
      return 'Ongoing';
    case 'upcoming':
      return 'Upcoming';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
  }
};

/**
 * Get comprehensive tournament status information including styling
 */
export const getTournamentStatusInfo = (tournament: TournamentRead): TournamentStatusInfo => {
  const status = getTournamentStatus(tournament);
  const label = formatTournamentStatus(status);
  
  // Define consistent color classes for each status
  const colorClasses = {
    'upcoming': 'bg-blue-100 text-blue-800',
    'ongoing': 'bg-green-100 text-green-800', 
    'completed': 'bg-surface-light text-text',
    'cancelled': 'bg-red-100 text-red-800'
  };

  return {
    status,
    label,
    colorClasses: colorClasses[status]
  };
};

/**
 * Alternative color scheme for dark backgrounds (used in some tournament cards)
 */
export const getTournamentStatusInfoDark = (tournament: TournamentRead): TournamentStatusInfo => {
  const status = getTournamentStatus(tournament);
  const label = formatTournamentStatus(status);
  
  // Define color classes optimized for dark backgrounds
  const colorClasses = {
    'upcoming': 'bg-blue-600 text-white',
    'ongoing': 'bg-green-600 text-white',
    'completed': 'bg-gray-600 text-white', 
    'cancelled': 'bg-red-600 text-white'
  };

  return {
    status,
    label,
    colorClasses: colorClasses[status]
  };
};

/**
 * Simple binary status check for filtering
 */
export const isTournamentActive = (tournament: TournamentRead): boolean => {
  const status = getTournamentStatus(tournament);
  return status === 'ongoing' || status === 'upcoming';
};

export const isTournamentCompleted = (tournament: TournamentRead): boolean => {
  const status = getTournamentStatus(tournament);
  return status === 'completed';
}; 