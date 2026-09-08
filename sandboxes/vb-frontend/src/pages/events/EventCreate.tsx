import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { EventCreate as EventCreateType, EventUpdate } from '../../types/event';
import PageTitle from '../../components/common/PageTitle';
import ErrorMessage from '../../components/common/ErrorMessage';
import Label from '../../components/common/Label';
import Select from '../../components/common/Select';
import { EventsAPI } from '../../api/events';
import { TournamentsAPI } from '../../api/tournaments';
import { eventFormatTemplatesApi } from '../../api/eventFormatTemplates';
import { useAuth } from '../../contexts/AuthContext';
import { applyDefaultStructureToEvent, eventHasRounds } from '../../services/defaultRoundSetup';
import EventForm from '../../components/event/EventForm';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { sortEventFormatTemplates, toEventFormatTemplateOption } from '../../utils/eventFormatTemplateSorting';
import { getErrorMessage } from '../../api/apiErrors';
import { useTournamentManagementAccess } from '../../hooks/useTournamentManagementAccess';
import Loading from '../../components/common/Loading';
import { validateTemplateRoundStructure } from '../../utils/roundStructureValidation';

const EventCreate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const layoutPrefix = location.pathname.startsWith('/admin')
    ? '/admin'
    : '/director';
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const parsedTournamentId = parseInt(tournamentId || '0');
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);

  const { data: formatTemplatesRaw } = useQuery({
    queryKey: ['eventFormatTemplates'],
    queryFn: () => eventFormatTemplatesApi.list(),
    enabled: !!user,
  });
  const formatTemplates = sortEventFormatTemplates(
    Array.isArray(formatTemplatesRaw) ? formatTemplatesRaw : []
  );
  
  // Fetch tournament data for breadcrumbs
  const { data: tournament } = useQuery({
    queryKey: ['tournament', parsedTournamentId],
    queryFn: () => TournamentsAPI.getTournament(parsedTournamentId),
    enabled: !!parsedTournamentId,
  });

  const { canCreateEvents, isLoading: tournamentAccessLoading } =
    useTournamentManagementAccess(parsedTournamentId);
  
  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async ({
      data,
      templateId,
    }: {
      data: EventCreateType;
      templateId: number | null;
    }) => {
      const event = await EventsAPI.createEvent(data);
      const hasExistingRounds = await eventHasRounds(event.id);
      if (!hasExistingRounds) {
        await applyDefaultStructureToEvent(event.id, templateId);
      }
      return event;
    },
    onSuccess: async (event) => {
      navigate(roleAwareNav.getEventPath(event.id), {
        state: { roundSetupError: null },
      });
    },
    onError: (error: unknown) => {
      console.error('Error creating event:', error);
      const msg = getErrorMessage(error, 'Failed to create event. Please try again.');
      if (String(msg).includes('round') || String(msg).includes('format')) {
        setFormError(
          `${msg} The event may have been created; you can add rounds manually in event details.`
        );
      } else {
        setFormError(msg);
      }
    },
  });
  
  // Handle form submission
  const handleSubmit = async (formData: EventCreateType | EventUpdate) => {
    setFormError(null);
    
    if (!parsedTournamentId) {
      setFormError('Invalid tournament ID');
      return;
    }
    
    // Ensure the data has tournament_id (since we're creating)
    const createData = formData as EventCreateType;
    createData.tournament_id = parsedTournamentId;

    if (selectedTemplateId != null) {
      const selectedTemplate = formatTemplates.find((tpl) => tpl.id === selectedTemplateId);
      const templateValidationError = validateTemplateRoundStructure(selectedTemplate?.payload);
      if (templateValidationError) {
        setFormError(templateValidationError);
        return;
      }
    }
    
    try {
      await createEventMutation.mutateAsync({
        data: createData,
        templateId: selectedTemplateId,
      });
    } catch (error) {
      // Error is already handled by the mutation
    }
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    navigate(roleAwareNav.getTournamentPath(parsedTournamentId));
  };

  if (parsedTournamentId && tournamentAccessLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loading size="medium" />
      </div>
    );
  }

  if (parsedTournamentId && user && tournament && !canCreateEvents) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <ErrorMessage
          title="Access denied"
          message="You do not have permission to create events in this tournament."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb navigation */}
      {tournament && (
        <Breadcrumb 
          items={[
            { label: 'Home', path: '/' },
            { label: 'Tournaments', path: roleAwareNav.getRoleAwarePath('/tournaments') },
            { label: tournament.name, path: roleAwareNav.getTournamentPath(tournament.id) },
            { label: 'Create Event' }
          ]} 
        />
      )}
      
      <div className="mb-8">
        <PageTitle className="mb-2">Create New Event</PageTitle>
        <p className="text-text-muted">Add a new event to your tournament.</p>
      </div>
      
      {formError && (
        <ErrorMessage
          message={formError}
          title="Event Creation Error"
          onDismiss={() => setFormError(null)}
          className="mb-6"
        />
      )}

      <div className="mb-6 rounded border border-border bg-surface-light p-4">
        <Label className="mb-2 block">Event format (rounds &amp; advancement)</Label>
        <p className="text-sm text-text-muted mb-2">
          Choose a saved format to apply after the event is created, or use your default. Manage
          formats in{' '}
          <Link
            to={`${layoutPrefix}/event-formats`}
            className="text-accent underline"
          >
            saved event formats
          </Link>
          .
        </p>
        <div className="max-w-md">
          <Select
            value={selectedTemplateId === null ? '' : String(selectedTemplateId)}
            onChange={(v) =>
              setSelectedTemplateId(v === '' ? null : parseInt(v, 10))
            }
            placeholder="Use my default saved format"
            options={formatTemplates.map(toEventFormatTemplateOption)}
          />
        </div>
      </div>
      
      <EventForm
        tournamentId={parsedTournamentId}
        tournament={tournament}
        onSubmit={handleSubmit}
        isSubmitting={createEventMutation.isPending}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default EventCreate; 
