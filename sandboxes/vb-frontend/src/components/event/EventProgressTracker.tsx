import React from 'react';
import { EventRead } from '../../types/event';
import { EventStats } from '../../types/event';
import { EventRegistrationStats } from '../../types/event_participant';
import Card from '../common/Card';
import Loading from '../common/Loading';
import { parseNaiveDateTimeToDate } from '../../utils/dateUtils';

interface EventProgressTrackerProps {
  event: EventRead;
  stats?: EventStats;
  regStats?: EventRegistrationStats;
  isLoading?: boolean;
}

const EventProgressTracker: React.FC<EventProgressTrackerProps> = ({
  event,
  stats,
  regStats,
  isLoading = false
}) => {
  // Calculate event progress as a percentage
  const calculateProgress = () => {
    const startDate = parseNaiveDateTimeToDate(event.start_date);
    const endDate = parseNaiveDateTimeToDate(event.end_date);
    const currentDate = new Date();
    if (!startDate || !endDate) return 0;
    
    // If event hasn't started yet
    if (currentDate < startDate) return 0;
    
    // If event has ended
    if (currentDate > endDate) return 100;
    
    // Calculate percentage of time elapsed
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = currentDate.getTime() - startDate.getTime();
    return Math.round((elapsedDuration / totalDuration) * 100);
  };
  
  // Calculate current status text based on dates
  const getStatusText = () => {
    const startDate = parseNaiveDateTimeToDate(event.start_date);
    const endDate = parseNaiveDateTimeToDate(event.end_date);
    const currentDate = new Date();
    if (!startDate || !endDate) return 'Schedule unavailable';
    
    if (currentDate < startDate) {
      const daysToStart = Math.ceil((startDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      return `Starting in ${daysToStart} day${daysToStart !== 1 ? 's' : ''}`;
    } else if (currentDate > endDate) {
      return 'Completed';
    } else {
      const daysToEnd = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      return `In progress - ${daysToEnd} day${daysToEnd !== 1 ? 's' : ''} remaining`;
    }
  };
  
  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Main statistics to display in grid
  const mainStats = [
    {
      label: 'Participants',
      value: stats ? formatNumber(stats.total_participants) : regStats ? formatNumber(regStats.approved_count) : formatNumber(event.current_entries),
      icon: (
        <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      label: 'Games Played',
      value: stats ? formatNumber(stats.total_games) : '-',
      icon: (
        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Highest Score',
      value: stats ? formatNumber(stats.highest_score) : '-',
      subValue: stats?.highest_score_user_name ? `by ${stats.highest_score_user_name}` : '',
      icon: (
        <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
      label: 'Avg. Score',
      value: stats ? stats.average_score.toFixed(1) : '-',
      icon: (
        <svg className="h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    }
  ];
  
  const progressPercentage = calculateProgress();
  const statusText = getStatusText();
  
  return (
    <Card title={`Event Progress: ${event.name}`} className="mb-6">
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loading size="medium" />
        </div>
      ) : (
        <div>
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <div>{progressPercentage}% Complete</div>
              <div>{statusText}</div>
            </div>
            <div className="h-4 w-full bg-border rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  progressPercentage === 100 
                    ? 'bg-green-500' 
                    : progressPercentage > 75 
                    ? 'bg-yellow-500' 
                    : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {mainStats.map((stat, index) => (
              <div key={index} className="bg-surface-light rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="mr-2">{stat.icon}</div>
                  <div className="text-sm text-text-muted">{stat.label}</div>
                </div>
                <div className="text-xl font-semibold">{stat.value}</div>
                {stat.subValue && (
                  <div className="text-xs text-text-muted">{stat.subValue}</div>
                )}
              </div>
            ))}
          </div>
          
          {/* Additional stats */}
          {stats && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-text-muted mb-1">Perfect Games</div>
                <div className="text-xl font-semibold">{stats.perfect_games}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-muted mb-1">Total Strikes</div>
                <div className="text-xl font-semibold">{formatNumber(stats.total_strikes)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-muted mb-1">Total Spares</div>
                <div className="text-xl font-semibold">{formatNumber(stats.total_spares)}</div>
              </div>
            </div>
          )}
          
          {/* Registration stats */}
          {regStats && (
            <div className="mt-6">
              <h3 className="text-md font-medium mb-3">Registration Stats</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center bg-surface-light rounded-lg p-3">
                  <div className="text-sm text-text-muted mb-1">Total Registrations</div>
                  <div className="text-xl font-semibold">{regStats.total_registrations}</div>
                </div>
                <div className="text-center bg-surface-light rounded-lg p-3">
                  <div className="text-sm text-text-muted mb-1">Pending</div>
                  <div className="text-xl font-semibold">{regStats.pending_count}</div>
                </div>
                <div className="text-center bg-surface-light rounded-lg p-3">
                  <div className="text-sm text-text-muted mb-1">Checked In</div>
                  <div className="text-xl font-semibold">{regStats.total_checked_in} / {regStats.approved_count}</div>
                </div>
                <div className="text-center bg-surface-light rounded-lg p-3">
                  <div className="text-sm text-text-muted mb-1">Re-Entries</div>
                  <div className="text-xl font-semibold">{regStats.reentry_count}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default EventProgressTracker; 
