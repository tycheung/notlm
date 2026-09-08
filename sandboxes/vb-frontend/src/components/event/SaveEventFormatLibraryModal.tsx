import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Input from '../common/Input';
import Label from '../common/Label';
import SearchableSelect from '../common/SearchableSelect';
import { EventsAPI } from '../../api/events';
import { eventFormatTemplatesApi } from '../../api/eventFormatTemplates';
import { getErrorMessage } from '../../api/apiErrors';
import type { UserEventFormatTemplateRead } from '../../types/eventFormatTemplate';
import type { EventStructurePayload } from '../../constants/defaultEventStructurePayload';
import { toEventFormatTemplateOption } from '../../utils/eventFormatTemplateSorting';
import { ensurePayloadRoundsHaveSquads, syncStructurePayloadCounts } from '../../utils/eventStructurePayloadFlow';

export const SAVE_FORMAT_TO_LIBRARY_BUTTON_LABEL = 'Save format to library';

type SaveMode = 'new' | 'overwrite';

type SaveEventFormatLibraryModalBase = {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null | undefined;
  templates: UserEventFormatTemplateRead[];
  /** Called after successful save (either mode). */
  onSaved?: (message: string) => void;
};

export type SaveEventFormatLibraryModalProps =
  | (SaveEventFormatLibraryModalBase & {
      source: 'event';
      eventId: number;
    })
  | (SaveEventFormatLibraryModalBase & {
      source: 'wizard';
      wizardPayload: EventStructurePayload;
      /** Pre-select a non-system template in “update existing”. */
      preferredOverwriteTemplateId?: number | null;
      onWizardAfterSave?: () => void;
    });

const SaveEventFormatLibraryModal: React.FC<SaveEventFormatLibraryModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    userId,
    templates,
    onSaved,
    source,
  } = props;
  const eventId = source === 'event' ? props.eventId : undefined;
  const wizardPayload = source === 'wizard' ? props.wizardPayload : undefined;
  const preferredOverwriteTemplateId =
    source === 'wizard' ? props.preferredOverwriteTemplateId : undefined;
  const onWizardAfterSave = source === 'wizard' ? props.onWizardAfterSave : undefined;

  const queryClient = useQueryClient();
  const templatesRef = useRef(templates);
  templatesRef.current = templates;

  const [mode, setMode] = useState<SaveMode>('new');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [overwriteTemplateId, setOverwriteTemplateId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setName('');
    setDescription('');
    const list = templatesRef.current;
    if (source === 'event') {
      setMode('new');
      setOverwriteTemplateId('');
      return;
    }
    if (preferredOverwriteTemplateId != null) {
      const t = list.find((x) => x.id === preferredOverwriteTemplateId && !x.is_system);
      if (t) {
        setMode('overwrite');
        setOverwriteTemplateId(String(preferredOverwriteTemplateId));
        setDescription(t.description || '');
        return;
      }
    }
    setMode('new');
    setOverwriteTemplateId('');
  }, [isOpen, source, preferredOverwriteTemplateId]);

  const overwriteOptions = templates
    .filter((t) => !t.is_system)
    .map(toEventFormatTemplateOption);

  const createFromEventMutation = useMutation({
    mutationFn: (vars: { name: string; description: string }) =>
      eventFormatTemplatesApi.createFromEvent({
        event_id: eventId!,
        name: vars.name.trim(),
        description: vars.description.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventFormatTemplates'] });
      void queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      void queryClient.invalidateQueries({ queryKey: ['eventRounds', eventId] });
      void queryClient.invalidateQueries({ queryKey: ['tournamentFlowRelationships', eventId] });
      onClose();
      onSaved?.('Saved current format to your library.');
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, 'Could not save format to library.'));
    },
  });

  const updateFromEventMutation = useMutation({
    mutationFn: async ({ id, description }: { id: number; description: string }) => {
      const payload = await EventsAPI.getFormatExport(eventId!);
      return eventFormatTemplatesApi.update(id, {
        payload,
        description: description.trim() || null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventFormatTemplates'] });
      onClose();
      onSaved?.('Updated saved format with the current event structure.');
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, 'Could not update saved format.'));
    },
  });

  const createFromWizardMutation = useMutation({
    mutationFn: (vars: {
      name: string;
      description: string;
      payload: Record<string, unknown>;
    }) =>
      eventFormatTemplatesApi.create({
        name: vars.name.trim(),
        description: vars.description.trim() || null,
        payload: vars.payload,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventFormatTemplates'] });
      onWizardAfterSave?.();
      onClose();
      onSaved?.('Saved as a new format in your library.');
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, 'Could not save format to library.'));
    },
  });

  const updateFromWizardMutation = useMutation({
    mutationFn: (vars: {
      id: number;
      description: string;
      payload: Record<string, unknown>;
    }) =>
      eventFormatTemplatesApi.update(vars.id, {
        payload: vars.payload,
        description: vars.description.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventFormatTemplates'] });
      onWizardAfterSave?.();
      onClose();
      onSaved?.('Updated saved format with the structure from the wizard.');
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, 'Could not update saved format.'));
    },
  });

  const busy =
    source === 'event'
      ? createFromEventMutation.isPending || updateFromEventMutation.isPending
      : createFromWizardMutation.isPending || updateFromWizardMutation.isPending;

  const handleSave = () => {
    setError(null);
    if (!userId) {
      setError('Sign in to save formats to your library.');
      return;
    }
    if (mode === 'new') {
      const n = name.trim();
      if (!n) {
        setError('Enter a name for the new saved format.');
        return;
      }
      if (source === 'event') {
        createFromEventMutation.mutate({ name: n, description });
        return;
      }
      createFromWizardMutation.mutate({
        name: n,
        description,
        payload: syncStructurePayloadCounts(
          ensurePayloadRoundsHaveSquads(wizardPayload)
        ) as Record<string, unknown>,
      });
      return;
    }

    const id = parseInt(overwriteTemplateId, 10);
    if (!id || Number.isNaN(id)) {
      setError('Choose a saved format to update.');
      return;
    }
    const target = templates.find((t) => t.id === id);
    if (!target || target.is_system) {
      setError('Built-in formats cannot be overwritten. Save as new instead.');
      return;
    }

    if (source === 'event') {
      if (
        !window.confirm(
          'Overwrite this saved format with the current event structure? Favorite/default flags stay the same.'
        )
      ) {
        return;
      }
      updateFromEventMutation.mutate({ id, description });
      return;
    }

    if (
      !window.confirm(
        'Overwrite this saved format with the structure in the wizard? Favorite/default flags stay the same.'
      )
    ) {
      return;
    }
    updateFromWizardMutation.mutate({
      id,
      description,
      payload: syncStructurePayloadCounts(
        ensurePayloadRoundsHaveSquads(wizardPayload)
      ) as Record<string, unknown>,
    });
  };

  const primaryDisabled =
    !userId ||
    (mode === 'new' && !name.trim()) ||
    (mode === 'overwrite' && (!overwriteTemplateId || overwriteOptions.length === 0));

  const primaryLabel = mode === 'new' ? 'Save as new' : 'Update saved format';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!busy) {
          onClose();
          setError(null);
        }
      }}
      title="Save format to library"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="lightbackground"
            disabled={busy}
            onClick={() => {
              onClose();
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="darkbackground"
            isLoading={busy}
            disabled={primaryDisabled}
            onClick={handleSave}
          >
            {primaryLabel}
          </Button>
        </div>
      }
    >
      {error && (
        <Alert variant="error" message={error} onDismiss={() => setError(null)} className="mb-3" />
      )}

      <div className="space-y-3">
        <div>
          <Label>Save mode</Label>
          <select
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            value={mode}
            disabled={busy}
            onChange={(e) => setMode(e.target.value as SaveMode)}
          >
            <option value="new">Save as new format</option>
            <option value="overwrite">Update existing saved format</option>
          </select>
        </div>

        {mode === 'new' ? (
          <Input
            label="Name for this saved format"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            placeholder="e.g. My doubles format"
          />
        ) : (
          <div>
            <SearchableSelect
              name="overwrite_template_id"
              label="Saved format to update"
              value={overwriteTemplateId}
              onChange={(e) => {
                const next = String(e.target.value).trim();
                setOverwriteTemplateId(next);
                const t = templates.find((x) => String(x.id) === next);
                if (t?.description) setDescription(t.description);
              }}
              options={overwriteOptions}
              placeholder="Select a format"
              searchInputPlaceholder="Search saved formats..."
            />
            {overwriteOptions.length === 0 && (
              <p className="mt-2 text-sm text-text-muted">
                No custom saved formats yet. Save as new first, or create one from the Event Format
                wizard.
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="format-description">Description (helps find this later)</Label>
          <textarea
            id="format-description"
            data-guide-id="guide-format-description"
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm min-h-[72px]"
            value={description}
            disabled={busy}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 5-game qualifying, cashers cut, then single-elim bracket"
          />
        </div>

        {!userId && (
          <p className="text-sm text-text-muted">
            Sign in to copy this format into your personal format library.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default SaveEventFormatLibraryModal;
