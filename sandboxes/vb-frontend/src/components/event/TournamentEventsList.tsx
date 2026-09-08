import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { EventsAPI } from '../../api/events';
import { EventRead, EventStats } from '../../types/event';
import { EventRegistrationStats } from '../../types/event_participant';
import Card from '../common/Card';
import Button from '../common/Button';
import Loading from '../common/Loading';
import Alert from '../common/Alert';
import EventProgressTracker from './EventProgressTracker';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { formatDateRangeNaive, parseNaiveDateTimeToTimestamp } from '../../utils/dateUtils';
import { GUIDE_IDS } from '../../features/director-guide/guideIds';

interface TournamentEventsListProps {
  tournamentId: number;
  canManage?: boolean;
  onAddEventClick?: () => void;
}

const TournamentEventsList: React.FC<TournamentEventsListProps> = ({
  tournamentId,
  canManage = false,
  onAddEventClick
}) => {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  
  // Fetch events for the tournament
  const { 
    data: events,
    isLoading,
    error
  } = useQuery({
    queryKey: ['tournamentEvents', tournamentId],
    queryFn: () => EventsAPI.getTournamentEvents(tournamentId),
    enabled: !!tournamentId,
  });
  
  // Fetch stats for the selected event
  const {
    data: eventStats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['eventStats', selectedEventId],
    queryFn: () => EventsAPI.getEventStats(selectedEventId!),
    enabled: !!selectedEventId,
  });
  
  // Fetch registration stats for the selected event
  const {
    data: participants,
    isLoading: isLoadingParticipants,
  } = useQuery({
    queryKey: ['eventParticipants', selectedEventId],
    queryFn: () => EventsAPI.getEventParticipants(selectedEventId!),
    enabled: !!selectedEventId && !!canManage,
  });
  
  // Auto-select the first event when events are loaded
  useEffect(() => {
    if (events && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loading size="medium" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert
        variant="error"
        message="Failed to load tournament events"
        className="mb-4"
      />
    );
  }
  
  if (!events || events.length === 0) {
    return (
      <Card className="mb-6">
        <div className="text-center py-8">
          <p className="text-text-muted mb-4">No events have been created for this tournament yet.</p>
          {canManage && onAddEventClick && (
            <Button
              variant="lightbackground"
              onClick={onAddEventClick}
              data-guide-id={GUIDE_IDS.CREATE_EVENT}
            >
              Create First Event
            </Button>
          )}
        </div>
      </Card>
    );
  }
  
  // Sort events by start date (earliest first)
  const sortedEvents = [...events].sort((a, b) => 
    parseNaiveDateTimeToTimestamp(a.start_date) - parseNaiveDateTimeToTimestamp(b.start_date)
  );
  
  const selectedEvent = events.find(event => event.id === selectedEventId);
  
  return (
    <div>
      {/* Events navigation */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-primary">Tournament Events</h2>
        {canManage && onAddEventClick && (
          <Button
            variant="lightbackground"
            onClick={onAddEventClick}
            data-guide-id={GUIDE_IDS.CREATE_EVENT}
          >
            Add Event
          </Button>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Event list */}
        <div className="md:w-1/3">
          <Card title="Events">
            <nav className="space-y-1">
              {sortedEvents.map((event) => (
                <button
                  key={event.id}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between rounded-md transition-colors ${
                    selectedEventId === event.id
                      ? 'bg-primary/15 text-text'
                      : 'text-text hover:bg-surface-light'
                  }`}
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{event.name}</span>
                    <span className="text-sm text-text-dim">
                      {formatDateRangeNaive(event.start_date, event.end_date)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-sm">
                    <span>{event.current_entries} entries</span>
                  </div>
                </button>
              ))}
            </nav>
          </Card>
        </div>
        
        {/* Event details and stats */}
        <div className="md:w-2/3">
          {selectedEvent && (
            <div>
              {/* Event progress tracker */}
              <EventProgressTracker 
                event={selectedEvent}
                stats={eventStats}
                regStats={undefined}
                isLoading={isLoadingStats || isLoadingParticipants}
              />
              
              {/* Event details card */}
              <Card title="Event Details" className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-text-dim">Description</div>
                        <p className="whitespace-pre-line text-text">
                          {selectedEvent.description || 'No description available.'}
                        </p>
                      </div>
                      
                      <div>
                        <div className="text-sm text-text-dim">Handicap</div>
                        <p className="text-text">
                          {(selectedEvent.handicap_percentage ?? 0) === 0
                            ? 'Scratch'
                            : `${selectedEvent.handicap_percentage}% of ${selectedEvent.handicap_base_score}`}
                        </p>
                      </div>
                      

                    </div>
                  </div>
                  
                  <div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-text-dim">Entry Fee</div>
                        <p className="text-text">${selectedEvent.entry_fee?.toFixed(2) || 'Free'}</p>
                      </div>
                      
                      <div>
                        <div className="text-sm text-text-dim">Re-Entry</div>
                        <p className="text-text">
                          {selectedEvent.allows_reentry ? (
                            <>
                              Allowed
                              {selectedEvent.max_reentries !== null && ` (max ${selectedEvent.max_reentries})`}
                              {selectedEvent.reentry_fee !== null && selectedEvent.reentry_fee !== undefined && ` - $${selectedEvent.reentry_fee.toFixed(2)}`}
                            </>
                          ) : 'Not allowed'}
                        </p>
                      </div>
                      
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button 
                    variant="darkbackground"
                    onClick={() => navigate(roleAwareNav.getEventPath(selectedEvent.id))}
                  >
                    View Event Details
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentEventsList; 
