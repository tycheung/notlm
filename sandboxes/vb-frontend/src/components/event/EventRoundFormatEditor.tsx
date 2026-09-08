import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RoundsAPI } from '../../api/rounds';
import { getErrorMessage } from '../../api/apiErrors';
import type { RoundRead } from '../../types/round';
import TemplateRoundEditorModal from '../eventFormatWizard/TemplateRoundEditorModal';
import Alert from '../common/Alert';
import {
  editorDraftToRoundUpdate,
  roundReadToEditorDraft,
} from '../../utils/eventRoundFormatEditor';
import { invalidateEventFlowStructureQueries } from '../event/flow/RoundFlowManagement';

interface EventRoundFormatEditorProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  round: RoundRead | null;
  /** Relationships for eliminator display labels (optional). */
  relationships?: Record<string, unknown>[];
  isTeamEvent?: boolean;
  /** Called after a successful save (caches already invalidated). */
  onSaved?: () => void;
}

/**
 * Event-scoped round format editor (Baker / RR / bracket config, etc.).
 * Reuses the template round modal; persists via PATCH round.
 */
const EventRoundFormatEditor: React.FC<EventRoundFormatEditorProps> = ({
  isOpen,
  onClose,
  eventId,
  round,
  relationships = [],
  isTeamEvent = true,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const draft = useMemo(
    () => (round ? roundReadToEditorDraft(round) : null),
    [round]
  );

  const saveMutation = useMutation({
    mutationFn: async (next: Record<string, unknown>) => {
      if (!round?.id) throw new Error('No round selected');
      const body = editorDraftToRoundUpdate(next);
      return RoundsAPI.updateRound(round.id, body);
    },
    onSuccess: async () => {
      setSaveError(null);
      invalidateEventFlowStructureQueries(queryClient, eventId);
      if (round?.id) {
        await queryClient.invalidateQueries({ queryKey: ['round', round.id] });
        await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', round.id] });
      }
      onSaved?.();
      onClose();
    },
    onError: (err) => {
      setSaveError(getErrorMessage(err, 'Could not save round format settings.'));
    },
  });

  if (!isOpen || !draft) return null;

  return (
    <>
      {saveError && (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm">
          <Alert variant="error" message={saveError} onDismiss={() => setSaveError(null)} />
        </div>
      )}
      <TemplateRoundEditorModal
        isOpen={isOpen}
        onClose={() => {
          if (saveMutation.isPending) return;
          setSaveError(null);
          onClose();
        }}
        draft={draft}
        relationships={relationships}
        isNew={false}
        isTeamEvent={isTeamEvent}
        title="Edit round format"
        saveLabel={saveMutation.isPending ? 'Saving…' : 'Save'}
        saveDisabled={saveMutation.isPending}
        hideRoundRobinSchedule
        hidePodsSizeSettings
        onSave={(next) => {
          setSaveError(null);
          saveMutation.mutate(next);
        }}
      />
    </>
  );
};

export default EventRoundFormatEditor;
