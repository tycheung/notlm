import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { isSaOnlyRole } from '../../utils/roles';
import PageTitle from '../../components/common/PageTitle';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import ClickableSwapCell from '../../components/common/ClickableSwapCell';
import Breadcrumb from '../../components/common/Breadcrumb';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import InlineEditableCell from '../../components/common/InlineEditableCell';
import { eventFormatTemplatesApi } from '../../api/eventFormatTemplates';
import type { UserEventFormatTemplateRead } from '../../types/eventFormatTemplate';
import { sortEventFormatTemplates } from '../../utils/eventFormatTemplateSorting';

type StatusKey = 'regular' | 'favorite' | 'default';

function statusOf(t: UserEventFormatTemplateRead): StatusKey {
  if (t.is_default) return 'default';
  if (t.is_favorite) return 'favorite';
  return 'regular';
}

const EventFormatManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  if (isSaOnlyRole(user?.role)) {
    return <Navigate to="/director" replace />;
  }

  const prefix = location.pathname.startsWith('/admin') ? '/admin' : '/director';
  const [templateToDelete, setTemplateToDelete] = useState<UserEventFormatTemplateRead | null>(null);

  const { data: templatesRaw, isLoading, error } = useQuery({
    queryKey: ['eventFormatTemplates'],
    queryFn: () => eventFormatTemplatesApi.list(),
  });
  const templates = Array.isArray(templatesRaw) ? templatesRaw : [];

  const sorted = useMemo(() => {
    return sortEventFormatTemplates(templates);
  }, [templates]);

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: Parameters<typeof eventFormatTemplatesApi.update>[1];
    }) => eventFormatTemplatesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventFormatTemplates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => eventFormatTemplatesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventFormatTemplates'] });
    },
  });

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
    setTemplateToDelete(null);
  };

  const handleStatusChange = async (t: UserEventFormatTemplateRead, key: StatusKey) => {
    if (key === 'default') {
      await updateMutation.mutateAsync({
        id: t.id,
        body: { is_default: true, is_favorite: false },
      });
    } else if (key === 'favorite') {
      await updateMutation.mutateAsync({
        id: t.id,
        body: { is_favorite: true, is_default: false },
      });
    } else {
      await updateMutation.mutateAsync({
        id: t.id,
        body: { is_favorite: false, is_default: false },
      });
    }
  };

  const handleRenameTemplate = async (
    template: UserEventFormatTemplateRead,
    nextName: string | number | null
  ) => {
    const normalizedName = String(nextName ?? '').trim();
    if (!normalizedName) {
      throw new Error('Format name is required');
    }
    if (normalizedName === template.name) return;
    await updateMutation.mutateAsync({
      id: template.id,
      body: { name: normalizedName },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" message="Failed to load saved event formats." />
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <Breadcrumb
        items={[
          { label: 'Home', path: '/' },
          { label: 'Dashboard', path: `${prefix}` },
          { label: 'Event formats' },
        ]}
      />
      <PageTitle className="mt-4 mb-2">
        Saved event formats
      </PageTitle>
      <p className="text-text-muted mb-6">
        These structures are applied when you create a new event (or choose a specific format in the
        create form). Click a row status to cycle Regular → Favorite → Default. One format is always
        your default; the built-in standard cannot be deleted.
      </p>

      <div className="mb-6">
        <Button
          type="button"
          variant="darkbackground"
          onClick={() => navigate(`${prefix}/event-formats/wizard`)}
        >
          Event format wizard
        </Button>
        <p className="mt-2 text-sm text-text-muted">
          Design rounds, squads, and advancement in the wizard, then save to this library. Built-in
          formats can only be saved as new (fork)—not overwritten in place.
        </p>
      </div>

      <div className="overflow-x-auto rounded border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-light text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2 align-middle">
                  {t.is_system ? (
                    <>
                      {t.name}
                      <span className="ml-2 text-xs text-text-muted">(built-in)</span>
                    </>
                  ) : (
                    <InlineEditableCell
                      value={t.name}
                      type="text"
                      onSave={(value) => handleRenameTemplate(t, value)}
                      placeholder="Format name"
                      disabled={updateMutation.isPending}
                    />
                  )}
                </td>
                <td className="px-3 py-2 align-middle max-w-xs">
                  <ClickableSwapCell
                    compact
                    value={statusOf(t)}
                    onChange={(k) => handleStatusChange(t, k as StatusKey)}
                    options={[
                      { key: 'regular', label: 'Regular' },
                      { key: 'favorite', label: 'Favorite' },
                      { key: 'default', label: 'Default' },
                    ]}
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="lightbackground"
                      size="small"
                      onClick={() => navigate(`${prefix}/event-formats/wizard/${t.id}`)}
                    >
                      Edit
                    </Button>
                    {!t.is_system && (
                      <Button
                        variant="danger"
                        size="small"
                        disabled={deleteMutation.isPending}
                        onClick={() => setTemplateToDelete(t)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-text-muted">
        <button
          type="button"
          className="text-accent underline"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </p>

      <ConfirmDialog
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={confirmDeleteTemplate}
        title="Delete saved format"
        message={
          templateToDelete
            ? `Delete saved format "${templateToDelete.name}"? This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default EventFormatManagement;
