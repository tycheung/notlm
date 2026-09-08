import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EventsAPI } from '../../api/events';
import { EventRead } from '../../types/event';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../common/Card';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import CopyTournamentModal from '../tournament/CopyTournamentModal';
import { formatDateNaive } from '../../utils/dateUtils';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { getErrorMessage } from '../../api/apiErrors';
import { GUIDE_IDS } from '../../features/director-guide';

interface EventListProps {
  tournamentId: number;
  tournamentName?: string;
  /** Show Add Event / Add First Event */
  canAddEvent?: boolean;
  /** Show Copy tournament beside Add Event */
  canCopyTournament?: boolean;
  /** Show Delete on each event (tournament master only) */
  canDeleteEvents?: boolean;
  onAddEventClick?: () => void;
}

const EventList: React.FC<EventListProps> = ({
  tournamentId,
  tournamentName = '',
  canAddEvent = false,
  canCopyTournament = false,
  canDeleteEvents = false,
  onAddEventClick,
}) => {
  const showAdd = canAddEvent;
  const showCopy = canCopyTournament;
  const showDelete = canDeleteEvents;
  const [eventToDelete, setEventToDelete] = useState<EventRead | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const queryClient = useQueryClient();

  const {
    data: events = [],
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ['tournamentEvents', tournamentId],
    queryFn: () => EventsAPI.getTournamentEvents(tournamentId),
    enabled: !!tournamentId,
  });

  const loadError = isError
    ? getErrorMessage(queryError, 'Failed to load events')
    : null;

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => EventsAPI.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournamentEvents', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      setEventToDelete(null);
      setDeleteError(null);
    },
    onError: (error: unknown) => {
      console.error('Error deleting event:', error);
      setDeleteError(getErrorMessage(error, 'Failed to delete event. Please try again.'));
      setEventToDelete(null);
    },
  });

  const handleDeleteEvent = (event: EventRead) => {
    setEventToDelete(event);
  };

  const confirmDeleteEvent = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate(eventToDelete.id);
    }
  };

  const cancelDeleteEvent = () => {
    setEventToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-danger">
        <p>{loadError}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card title="Tournament Events">
        <div className="text-center py-8">
          <p className="text-text-muted mb-4">No events have been created for this tournament yet.</p>
          {showAdd && onAddEventClick && (
            <Button 
              variant="lightbackground" 
              size="small"
              onClick={onAddEventClick}
              data-guide-id={GUIDE_IDS.CREATE_EVENT}
            >
              Add First Event
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <>
      {deleteError && (
        <div className="mb-4 rounded border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm">
          {deleteError}
        </div>
      )}
      <Card title="Tournament Events" className="mb-6">
        <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
          <p className="text-text-muted">{events.length} {events.length === 1 ? 'event' : 'events'}</p>
          <div className="flex flex-wrap gap-2">
            {showCopy && tournamentName && (
              <Button
                variant="outline"
                size="small"
                onClick={() => setCopyModalOpen(true)}
              >
                Copy tournament
              </Button>
            )}
            {showAdd && onAddEventClick && (
              <Button 
                variant="lightbackground" 
                size="small"
                onClick={onAddEventClick}
                data-guide-id={GUIDE_IDS.CREATE_EVENT}
              >
                Add Event
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          {events.map((event) => {
            const eventPath = roleAwareNav.getEventPath(event.id);
            
            return (
              <div 
                key={event.id} 
                className="rounded-md border border-border p-4 transition-colors hover:bg-surface-light"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <Link 
                      to={eventPath} 
                      className="text-primary hover:text-primary-light font-medium text-lg"
                    >
                      {event.name}
                    </Link>
                    <div className="mt-1 text-sm text-text-muted">
                      {formatDateNaive(event.start_date)} - {formatDateNaive(event.end_date)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {event.entry_fee && (
                        <span className="inline-flex items-center rounded-full border border-success/40 bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                          ${event.entry_fee.toFixed(2)} Entry
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
                        {(event.handicap_percentage ?? 0) === 0
                          ? 'Scratch'
                          : `${event.handicap_percentage}% of ${event.handicap_base_score}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link to={eventPath}>
                      <Button variant="darkbackground" size="small">View</Button>
                    </Link>
                    {showDelete && (
                      <Button 
                        variant="danger" 
                        size="small"
                        onClick={() => handleDeleteEvent(event)}
                        disabled={deleteEventMutation.isPending}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                
                {event.description && (
                  <div className="mt-3 line-clamp-2 text-sm text-text-muted">
                    {event.description}
                  </div>
                )}
                
                <div className="mt-3 flex justify-between items-center text-sm">
                  <div className="text-text-muted">
                    {event.max_entries !== null 
                      ? `${event.current_entries}/${event.max_entries} participants` 
                      : `${event.current_entries} participants`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!eventToDelete}
        onConfirm={confirmDeleteEvent}
        onClose={cancelDeleteEvent}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.name}"? This action cannot be undone and will remove all associated data including rounds, squads, and participant registrations.`}
        confirmText="Delete Event"
        cancelText="Cancel"
        confirmVariant="danger"
      />

      {showCopy && tournamentName && (
        <CopyTournamentModal
          isOpen={copyModalOpen}
          onClose={() => setCopyModalOpen(false)}
          sourceTournamentId={tournamentId}
          sourceTournamentName={tournamentName}
        />
      )}
    </>
  );
};

export default EventList; 
