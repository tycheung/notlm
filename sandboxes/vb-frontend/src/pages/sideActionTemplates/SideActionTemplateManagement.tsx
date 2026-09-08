import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageTitle from '../../components/common/PageTitle';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import ClickableSwapCell from '../../components/common/ClickableSwapCell';
import Breadcrumb from '../../components/common/Breadcrumb';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import InlineEditableCell from '../../components/common/InlineEditableCell';
import { sideActionTemplatesApi } from '../../api/sideActionTemplates';
import type { UserSideActionTemplateRead } from '../../types/sideActionTemplate';
import {
  groupSideActionTemplatesByType,
  summarizeSideActionTemplatePayload,
} from '../../utils/sideActionTemplateSorting';

type StatusKey = 'regular' | 'favorite';

function statusOf(t: UserSideActionTemplateRead): StatusKey {
  return t.is_favorite ? 'favorite' : 'regular';
}

const SideActionTemplateManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const prefix = location.pathname.startsWith('/admin') ? '/admin' : '/director';
  const [templateToDelete, setTemplateToDelete] =
    useState<UserSideActionTemplateRead | null>(null);

  const { data: templatesRaw, isLoading, error } = useQuery({
    queryKey: ['sideActionTemplates', 'all'],
    queryFn: () => sideActionTemplatesApi.list(),
  });
  const templates = Array.isArray(templatesRaw) ? templatesRaw : [];

  const groups = useMemo(
    () => groupSideActionTemplatesByType(templates),
    [templates]
  );

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: Parameters<typeof sideActionTemplatesApi.update>[1];
    }) => sideActionTemplatesApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sideActionTemplates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sideActionTemplatesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sideActionTemplates'] });
    },
  });

  const handleStatusChange = async (
    t: UserSideActionTemplateRead,
    key: StatusKey
  ) => {
    await updateMutation.mutateAsync({
      id: t.id,
      body: { is_favorite: key === 'favorite' },
    });
  };

  const handleRenameTemplate = async (
    template: UserSideActionTemplateRead,
    nextName: string | number | null
  ) => {
    const normalizedName = String(nextName ?? '').trim();
    if (!normalizedName) {
      throw new Error('Template name is required');
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
      <Alert variant="error" message="Failed to load side action templates." />
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <Breadcrumb
        items={[
          { label: 'Home', path: '/' },
          { label: 'Dashboard', path: `${prefix}` },
          { label: 'Side action templates' },
        ]}
      />
      <PageTitle className="mt-4 mb-2">Side action templates</PageTitle>
      <p className="text-text-muted mb-6">
        Your saved side-action setups (games, fees, prizes, type settings), grouped by
        type. Favorites sort to the top of each group and in the side-action form
        dropdown. Click status to toggle Regular ↔ Favorite.
      </p>

      {!groups.length ? (
        <div className="rounded border border-border bg-surface-light p-6 text-sm text-text-muted">
          No templates yet. Open a side action form and use{' '}
          <span className="font-medium text-text">Save as template…</span> to create
          one.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.type}>
              <h2 className="text-lg font-semibold text-text mb-2">
                {group.label}
                <span className="ml-2 text-sm font-normal text-text-muted">
                  ({group.templates.length})
                </span>
              </h2>
              <div className="overflow-x-auto rounded border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-light text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Summary</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.templates.map((t) => (
                      <tr key={t.id} className="border-t border-border">
                        <td className="px-3 py-2 align-middle">
                          <InlineEditableCell
                            value={t.name}
                            type="text"
                            onSave={(value) => handleRenameTemplate(t, value)}
                            placeholder="Template name"
                            disabled={updateMutation.isPending}
                          />
                        </td>
                        <td className="px-3 py-2 align-middle text-text-muted max-w-xs">
                          {summarizeSideActionTemplatePayload(t)}
                        </td>
                        <td className="px-3 py-2 align-middle max-w-xs">
                          <ClickableSwapCell
                            compact
                            value={statusOf(t)}
                            onChange={(k) =>
                              handleStatusChange(t, k as StatusKey)
                            }
                            options={[
                              { key: 'regular', label: 'Regular' },
                              { key: 'favorite', label: 'Favorite' },
                            ]}
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="lightbackground"
                              size="small"
                              onClick={() =>
                                navigate(
                                  `${prefix}/side-action-templates/${t.id}`
                                )
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="small"
                              disabled={deleteMutation.isPending}
                              onClick={() => setTemplateToDelete(t)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-text-muted">
        <Link to={prefix} className="text-accent underline">
          Back to dashboard
        </Link>
      </p>

      <ConfirmDialog
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={() => {
          if (templateToDelete) {
            deleteMutation.mutate(templateToDelete.id);
          }
          setTemplateToDelete(null);
        }}
        title="Delete side action template"
        message={
          templateToDelete
            ? `Delete template "${templateToDelete.name}"? This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default SideActionTemplateManagement;
