import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';
import Modal from '../common/Modal';
import Alert from '../common/Alert';
import { sideActionTemplatesApi } from '../../api/sideActionTemplates';
import { getErrorMessage } from '../../api/apiErrors';
import type { SideActionType } from '../../types/side_action';
import type { UserSideActionTemplateRead } from '../../types/sideActionTemplate';
import {
  applySideActionTemplatePayload,
  buildSideActionTemplatePayload,
  type SideActionTemplateFormSnapshot,
} from '../../utils/sideActionTemplatePayload';
import { formatSideActionType } from '../../utils/sideActionDisplay';
import { sortSideActionTemplates } from '../../utils/sideActionTemplateSorting';

export const sideActionTemplateQueryKey = (type?: SideActionType) =>
  ['sideActionTemplates', type ?? 'all'] as const;

interface SideActionTemplateControlsProps {
  sideActionType: SideActionType;
  eventGameCount: number;
  /** Current form snapshot used when saving. */
  getSnapshot: () => SideActionTemplateFormSnapshot;
  /** Apply loaded template fields into the form. */
  onApply: (fields: Partial<SideActionTemplateFormSnapshot>) => void;
}

const SideActionTemplateControls: React.FC<SideActionTemplateControlsProps> = ({
  sideActionType,
  eventGameCount,
  getSnapshot,
  onApply,
}) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const prefix = location.pathname.startsWith('/admin') ? '/admin' : '/director';
  const [selectedId, setSelectedId] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveFavorite, setSaveFavorite] = useState(false);
  const [overwriteId, setOverwriteId] = useState('');
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: sideActionTemplateQueryKey(sideActionType),
    queryFn: () => sideActionTemplatesApi.list(sideActionType),
  });

  const sorted = useMemo(
    () => sortSideActionTemplates(templates),
    [templates]
  );

  const selected = useMemo(
    () => sorted.find((t) => String(t.id) === selectedId) ?? null,
    [sorted, selectedId]
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['sideActionTemplates'] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const snapshot = getSnapshot();
      const payload = buildSideActionTemplatePayload(snapshot);
      if (saveMode === 'overwrite' && overwriteId) {
        return sideActionTemplatesApi.update(Number(overwriteId), {
          name: saveName.trim(),
          payload,
          is_favorite: saveFavorite,
        });
      }
      return sideActionTemplatesApi.create({
        name: saveName.trim(),
        side_action_type: sideActionType,
        payload,
        is_favorite: saveFavorite,
      });
    },
    onSuccess: (row) => {
      invalidate();
      setSaveOpen(false);
      setInfo(`Saved template “${row.name}”.`);
      setError(null);
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Failed to save template'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sideActionTemplatesApi.remove(id),
    onSuccess: () => {
      invalidate();
      setSelectedId('');
      setInfo('Template deleted.');
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Failed to delete template'));
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }: { id: number; is_favorite: boolean }) =>
      sideActionTemplatesApi.update(id, { is_favorite }),
    onSuccess: (row) => {
      invalidate();
      setInfo(
        row.is_favorite
          ? `“${row.name}” marked favorite.`
          : `“${row.name}” unmarked as favorite.`
      );
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Failed to update favorite'));
    },
  });

  const applySelected = () => {
    const template = selected;
    if (!template) return;
    const fields = applySideActionTemplatePayload(template.payload, {
      sideActionType,
      eventGameCount,
      applySuggestedName: false,
    });
    onApply(fields);
    setInfo(`Loaded “${template.name}”. Review games and prizes before saving.`);
    setError(null);
  };

  const openSave = () => {
    const snapshot = getSnapshot();
    setSaveName(
      snapshot.name?.trim() || `${formatSideActionType(sideActionType)} template`
    );
    setSaveMode('new');
    setOverwriteId('');
    setSaveFavorite(false);
    setError(null);
    setSaveOpen(true);
  };

  return (
    <div className="mb-4 rounded-md border border-border bg-surface-light p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text">Templates</p>
          <p className="text-xs text-text-muted">
            Your saved {formatSideActionType(sideActionType)} setups (games, fees,
            prizes). Favorites sort first. Squad scope is not included.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`${prefix}/side-action-templates`}
            className="text-xs text-accent underline self-center"
          >
            Manage templates
          </Link>
          <Button type="button" variant="secondary" size="small" onClick={openSave}>
            Save as template…
          </Button>
        </div>
      </div>

      {info ? (
        <Alert variant="info" message={info} onDismiss={() => setInfo(null)} />
      ) : null}
      {error && !saveOpen ? (
        <Alert variant="error" message={error} onDismiss={() => setError(null)} />
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[14rem] flex-1">
          <Label htmlFor="sa-template-select" className="text-xs">
            Load template
          </Label>
          <select
            id="sa-template-select"
            className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text"
            value={selectedId}
            disabled={isLoading || sorted.length === 0}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">
              {isLoading
                ? 'Loading…'
                : sorted.length
                  ? 'Choose a template…'
                  : 'No templates yet'}
            </option>
            {sorted.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.is_favorite ? '★ ' : ''}
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          size="small"
          disabled={!selectedId}
          onClick={applySelected}
        >
          Apply
        </Button>
        <Button
          type="button"
          variant="outline"
          size="small"
          disabled={!selected || favoriteMutation.isPending}
          onClick={() => {
            if (!selected) return;
            favoriteMutation.mutate({
              id: selected.id,
              is_favorite: !selected.is_favorite,
            });
          }}
        >
          {selected?.is_favorite ? 'Unfavorite' : 'Favorite'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="small"
          disabled={!selectedId || deleteMutation.isPending}
          onClick={() => {
            if (!selected) return;
            if (
              window.confirm(
                `Delete template “${selected.name}”? This cannot be undone.`
              )
            ) {
              deleteMutation.mutate(selected.id);
            }
          }}
        >
          Delete
        </Button>
      </div>

      <Modal
        isOpen={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save side action template"
        size="medium"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={createMutation.isPending}
              disabled={
                !saveName.trim() ||
                (saveMode === 'overwrite' && !overwriteId) ||
                createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {error ? (
            <Alert variant="error" message={error} onDismiss={() => setError(null)} />
          ) : null}
          <p className="text-sm text-text-muted">
            Saves the current fees, prizes, games, and type settings for{' '}
            {formatSideActionType(sideActionType)}. Event and squad choices are not
            stored.
          </p>
          <div className="space-y-2">
            <label className="flex items-center text-sm text-text">
              <input
                type="radio"
                className="mr-2"
                checked={saveMode === 'new'}
                onChange={() => {
                  setSaveMode('new');
                  setSaveFavorite(false);
                }}
              />
              Create new template
            </label>
            <label className="flex items-center text-sm text-text">
              <input
                type="radio"
                className="mr-2"
                checked={saveMode === 'overwrite'}
                onChange={() => setSaveMode('overwrite')}
                disabled={sorted.length === 0}
              />
              Update existing template
            </label>
          </div>
          {saveMode === 'overwrite' ? (
            <div>
              <Label htmlFor="sa-template-overwrite">Template</Label>
              <select
                id="sa-template-overwrite"
                className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                value={overwriteId}
                onChange={(e) => {
                  setOverwriteId(e.target.value);
                  const t = sorted.find((row) => String(row.id) === e.target.value);
                  if (t) {
                    setSaveName(t.name);
                    setSaveFavorite(Boolean(t.is_favorite));
                  }
                }}
              >
                <option value="">Choose…</option>
                {sorted.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.is_favorite ? '★ ' : ''}
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Input
            label="Template name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            required
            fullWidth
          />
          <label className="flex items-center text-sm text-text">
            <input
              type="checkbox"
              className="mr-2"
              checked={saveFavorite}
              onChange={(e) => setSaveFavorite(e.target.checked)}
            />
            Mark as favorite
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default SideActionTemplateControls;
export type { UserSideActionTemplateRead };
