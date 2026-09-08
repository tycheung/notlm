import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal';
import EventForm from './EventForm';
import Alert from '../common/Alert';
import Loading from '../common/Loading';
import { EventsAPI } from '../../api/events';
import { TournamentsAPI } from '../../api/tournaments';
import { EventCreate, EventUpdate, EventRead } from '../../types/event';
import {
  clearEventEditDraft,
  loadEventEditDraft,
} from '../../utils/eventEditDraftStorage';
import { getErrorMessage } from '../../api/apiErrors';

interface EventEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  tournamentId: number;
}

const EventEditModal: React.FC<EventEditModalProps> = ({
  isOpen,
  onClose,
  eventId,
  tournamentId
}) => {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch event data for editing
  const { data: event, isLoading: loadingEvent, error: eventError } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => EventsAPI.getEvent(eventId),
    enabled: !!eventId && isOpen,
  });

  // Fetch tournament data for date constraints
  const { data: tournament, isLoading: loadingTournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => TournamentsAPI.getTournament(tournamentId),
    enabled: !!tournamentId && isOpen,
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: (data: EventUpdate) => {
      return EventsAPI.updateEvent(eventId, data);
    },
    onSuccess: () => {
      clearEventEditDraft(eventId);
      // Invalidate and refetch related queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['tournamentEvents', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      setError(null);
      onClose();
    },
    onError: (error: any) => {
      console.error('Error updating event:', error);
      setError(getErrorMessage(error, 'Failed to update event. Please try again.'));
    },
  });

  const handleSubmit = async (formData: EventCreate | EventUpdate) => {
    setError(null);
    
    // Cast to EventUpdate since we know we're updating
    const updateData = formData as EventUpdate;
    
    try {
      await updateEventMutation.mutateAsync(updateData);
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const restoredDraft =
    isOpen && !loadingEvent && !loadingTournament ? loadEventEditDraft(eventId) : null;

  if (loadingEvent || loadingTournament) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Event"
        size="large"
        closeOnOutsideClick={false}
      >
        <div className="flex justify-center py-8">
          <Loading size="medium" />
        </div>
      </Modal>
    );
  }

  if (eventError || !event) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Event"
        size="large"
        closeOnOutsideClick={false}
      >
        <Alert
          variant="error"
          message="Failed to load event details. Please try again."
          className="mb-4"
        />
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Event"
      size="large"
      closeOnOutsideClick={false}
    >
      {error && (
        <Alert
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}
      
      <EventForm
        initialData={event}
        tournamentId={tournamentId}
        tournament={tournament}
        onSubmit={handleSubmit}
        isSubmitting={updateEventMutation.isPending}
        onCancel={handleClose}
        isEdit={true}
        restoredDraft={restoredDraft}
        draftPersistenceEventId={eventId}
      />
    </Modal>
  );
};

export default EventEditModal; 
