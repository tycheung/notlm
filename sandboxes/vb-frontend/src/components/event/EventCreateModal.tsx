import React, { useState, useLayoutEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal';
import EventForm from './EventForm';
import Alert from '../common/Alert';
import Loading from '../common/Loading';
import Label from '../common/Label';
import Select from '../common/Select';
import { EventsAPI } from '../../api/events';
import { TournamentsAPI } from '../../api/tournaments';
import { eventFormatTemplatesApi } from '../../api/eventFormatTemplates';
import { EventCreate, EventUpdate } from '../../types/event';
import { applyDefaultStructureToEvent, eventHasRounds } from '../../services/defaultRoundSetup';
import {
  clearEventCreateDraft,
  loadEventCreateDraft,
  mergeEventCreateDraft,
} from '../../utils/eventCreateDraftStorage';
import { getErrorMessage } from '../../api/apiErrors';
import {
  sortEventFormatTemplates,
  toEventFormatTemplateOption,
} from '../../utils/eventFormatTemplateSorting';
import { invalidateEventFlowStructureQueries } from './flow/RoundFlowManagement';
import { validateTemplateRoundStructure } from '../../utils/roundStructureValidation';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { useOptionalDirectorGuide } from '../../features/director-guide';

interface EventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: number;
  onSuccess?: () => void;
  /** e.g. /director or /admin for links */
  layoutPrefix?: string;
}

const EventCreateModal: React.FC<EventCreateModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  onSuccess,
  layoutPrefix = '/director',
}) => {
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const guide = useOptionalDirectorGuide();

  const { data: tournament, isLoading: loadingTournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => TournamentsAPI.getTournament(tournamentId),
    enabled: !!tournamentId && isOpen,
  });

  useLayoutEffect(() => {
    if (!isOpen || loadingTournament) return;
    const d = loadEventCreateDraft(tournamentId);
    setSelectedTemplateId(d?.selectedTemplateId ?? null);
  }, [isOpen, loadingTournament, tournamentId]);

  const { data: formatTemplatesRaw } = useQuery({
    queryKey: ['eventFormatTemplates'],
    queryFn: () => eventFormatTemplatesApi.list(),
    enabled: isOpen,
  });
  const formatTemplates = sortEventFormatTemplates(
    Array.isArray(formatTemplatesRaw) ? formatTemplatesRaw : []
  );

  const createEventMutation = useMutation({
    mutationFn: async ({
      data,
      templateId,
    }: {
      data: EventCreate;
      templateId: number | null;
    }) => {
      const createdEvent = await EventsAPI.createEvent(data);
      const hasExistingRounds = await eventHasRounds(createdEvent.id);
      const deferFormat =
        guide?.session?.actionQueue?.some((a) => a.stepId === 'apply_format') === true;
      if (!hasExistingRounds && !deferFormat) {
        await applyDefaultStructureToEvent(createdEvent.id, templateId);
      }
      return createdEvent;
    },
    onSuccess: async (createdEvent) => {
      queryClient.invalidateQueries({ queryKey: ['tournamentEvents', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      invalidateEventFlowStructureQueries(queryClient, createdEvent.id);

      clearEventCreateDraft(tournamentId);
      setError(null);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
      guide?.notifyStepCompleted('create_event', {
        tournamentId,
        eventId: createdEvent.id,
      });
      navigate(roleAwareNav.getEventPath(createdEvent.id));
    },
    onError: (error: any) => {
      console.error('Error creating event:', error);
      setError(
        getErrorMessage(
          error,
          'Failed to create event or apply format. You may need to add rounds manually.'
        )
      );
    },
  });

  const handleSubmit = async (formData: EventCreate | EventUpdate) => {
    setError(null);

    const createData = {
      ...formData,
      tournament_id: tournamentId,
    } as EventCreate;

    if (selectedTemplateId != null) {
      const selectedTemplate = formatTemplates.find((tpl) => tpl.id === selectedTemplateId);
      const templateValidationError = validateTemplateRoundStructure(selectedTemplate?.payload);
      if (templateValidationError) {
        setError(templateValidationError);
        return;
      }
    }

    try {
      await createEventMutation.mutateAsync({
        data: createData,
        templateId: selectedTemplateId,
      });
    } catch {
      // handled in onError
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const restoredDraft = isOpen && !loadingTournament ? loadEventCreateDraft(tournamentId) : null;

  if (loadingTournament) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Create New Event"
        size="large"
        closeOnOutsideClick={false}
      >
        <div className="flex justify-center py-8">
          <Loading size="medium" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Event"
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

      <div className="mb-4 rounded border border-border bg-surface-light p-3">
        <Label className="mb-1 block text-sm">Event format</Label>
        <p className="text-xs text-text-muted mb-2">
          <Link to={`${layoutPrefix}/event-formats`} className="text-accent underline">
            Manage saved formats
          </Link>
        </p>
        <Select
          value={selectedTemplateId === null ? '' : String(selectedTemplateId)}
          onChange={(v) => {
            const next = v === '' ? null : parseInt(v, 10);
            setSelectedTemplateId(next);
            mergeEventCreateDraft(tournamentId, { selectedTemplateId: next });
          }}
          placeholder="Use my default saved format"
          options={formatTemplates.map(toEventFormatTemplateOption)}
        />
      </div>

      <EventForm
        tournamentId={tournamentId}
        tournament={tournament}
        onSubmit={handleSubmit}
        isSubmitting={createEventMutation.isPending}
        onCancel={handleClose}
        restoredDraft={restoredDraft}
        draftPersistenceTournamentId={tournamentId}
      />
    </Modal>
  );
};

export default EventCreateModal;
