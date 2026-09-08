import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import EventEditModal from '../../components/event/EventEditModal';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import { EventsAPI } from '../../api/events';
import { getErrorMessage } from '../../api/apiErrors';

const EventEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const eventId = id ? parseInt(id, 10) : 0;
  const navigate = useNavigate();
  const location = useLocation();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => EventsAPI.getEvent(eventId),
    enabled: eventId > 0,
  });

  const handleClose = () => {
    const eventDetailsPath = location.pathname.replace(/\/edit$/, '');
    navigate(eventDetailsPath || `/events/${eventId}`);
  };

  if (!eventId) {
    return <Alert variant="error" message="Invalid event id." />;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (error || !event) {
    return (
      <Alert
        variant="error"
        message={getErrorMessage(error, 'Failed to load event for editing.')}
      />
    );
  }

  return (
    <EventEditModal
      isOpen
      onClose={handleClose}
      eventId={eventId}
      tournamentId={event.tournament_id}
    />
  );
};

export default EventEditPage;
