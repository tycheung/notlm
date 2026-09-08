import React, { useState, useEffect } from 'react';
import { EventsAPI } from '../../api/events';
import { HistoricalQualifyingAverage } from '../../types/event_participant';
import { formatDateNaive } from '../../utils/dateUtils';
import HistoryIcon from '@mui/icons-material/History';

interface HistoricalAveragesDisplayProps {
  userId: number;
  className?: string;
  showTitle?: boolean;
  limit?: number;
}

const HistoricalAveragesDisplay: React.FC<HistoricalAveragesDisplayProps> = ({
  userId,
  className = '',
  showTitle = true,
  limit
}) => {
  const [averages, setAverages] = useState<HistoricalQualifyingAverage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistoricalAverages = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await EventsAPI.getUserHistoricalQualifyingAverages(userId, limit);
        setAverages(data);
      } catch (err) {
        console.error('Failed to fetch historical averages:', err);
        setError('Failed to load historical averages');
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalAverages();
  }, [userId, limit]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-xs text-text-muted">Loading averages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-xs text-red-600 py-2 ${className}`}>
        {error}
      </div>
    );
  }

  if (averages.length === 0) {
    return (
      <div className={`text-xs text-text-muted py-2 ${className}`}>
        No historical averages found
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showTitle && (
        <div className="flex items-center gap-1 mb-2">
          <HistoryIcon className="w-4 h-4 text-text-muted" />
          <span className="text-xs font-medium text-text-muted">
            Qualifying Averages
          </span>
        </div>
      )}
      
      <div className="space-y-1">
        {averages.map((average, index) => (
          <div
            key={average.id}
            className="flex items-center justify-between py-1 px-2 bg-surface-light rounded text-xs border"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text truncate">
                {average.qualifying_average.toFixed(1)}
              </div>
              <div className="text-text-muted truncate">
                {average.tournament_name || 'Unknown Tournament'}
              </div>
              <div className="text-text-muted truncate">
                {average.bowling_center_name || 'Unknown Center'}
              </div>
            </div>
            
            <div className="text-right text-text-muted ml-2">
              <div className="whitespace-nowrap">
                {average.tournament_date 
                  ? formatDateNaive(average.tournament_date).split(',')[0] // Just the date part
                  : 'Unknown Date'
                }
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {averages.length === 0 && (
        <div className="text-xs text-text-muted italic py-2">
          No previous qualifying averages on record
        </div>
      )}
    </div>
  );
};

export default HistoricalAveragesDisplay; 