import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsersAPI } from '../../api/users';
import { UsbcClaimsAPI } from '../../api/usbcClaims';
import { EventsAPI } from '../../api/events';
import { Role, UserRead } from '../../types/user';
import { useAuth } from '../../contexts/AuthContext';
import type { USBCClaimRead } from '../../types/usbcClaim';
import type { PendingSignupEventRead } from '../../types/event';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import Loading from '../../components/common/Loading';
import { getErrorMessage } from '../../api/apiErrors';
import { formatDateTimeNaive } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import Label from '../../components/common/Label';
import { claimRoutingLabel, parseUsbcAssignConflict, validateUsbcAssignDraft } from './actionsNeededUtils';

const ActionsNeeded: React.FC = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftUsbc, setDraftUsbc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [mergePrompt, setMergePrompt] = useState<{
    placeholderUserId: number;
    existingUserName: string;
    usbc_id: string;
  } | null>(null);

  const [claimError, setClaimError] = useState<string | null>(null);
  const [reviewNotesByClaim, setReviewNotesByClaim] = useState<Record<number, string>>(
    {}
  );
  const [busyClaimId, setBusyClaimId] = useState<number | null>(null);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['temporaryUsbcUsers'],
    queryFn: () => UsersAPI.getTemporaryUsbcUsers({ skip: 0, limit: 500 }),
  });

  const { data: pendingSignups = [], isLoading: pendingSignupsLoading } = useQuery({
    queryKey: ['pendingSignupEvents'],
    queryFn: () => EventsAPI.getPendingSignupEvents(),
    enabled: Boolean(user),
  });

  const { data: pendingClaims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['usbcClaims', 'pending', 'admin'],
    queryFn: () => UsbcClaimsAPI.listClaims({ status: 'pending', limit: 500 }),
    enabled: Boolean(user) && isAdmin,
  });

  const assignMutation = useMutation({
    mutationFn: ({
      userId,
      usbc_id,
      merge_into_existing,
    }: {
      userId: number;
      usbc_id: string;
      merge_into_existing?: boolean;
    }) => UsersAPI.assignUsbc(userId, usbc_id, { merge_into_existing }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporaryUsbcUsers'] });
      queryClient.invalidateQueries({ queryKey: ['actionsNeededCounts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingSignupEvents'] });
      setEditingId(null);
      setDraftUsbc('');
      setFormError(null);
      setMergePrompt(null);
    },
    onError: (err: unknown) => {
      const conflict = parseUsbcAssignConflict(err);
      if (conflict && editingId != null) {
        setMergePrompt({
          placeholderUserId: editingId,
          existingUserName: conflict.existing_user_name,
          usbc_id: conflict.usbc_id,
        });
        setFormError(null);
        return;
      }
      setMergePrompt(null);
      setFormError(getErrorMessage(err, 'Could not update USBC'));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      claimId,
      status,
      review_notes,
    }: {
      claimId: number;
      status: 'approved' | 'rejected';
      review_notes?: string | null;
    }) => UsbcClaimsAPI.reviewClaim(claimId, { status, review_notes }),
    onMutate: ({ claimId }) => {
      setBusyClaimId(claimId);
      setClaimError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usbcClaims'] });
      queryClient.invalidateQueries({ queryKey: ['actionsNeededCounts'] });
      setBusyClaimId(null);
    },
    onError: (err: unknown) => {
      setClaimError(getErrorMessage(err, 'Could not update claim'));
      setBusyClaimId(null);
    },
  });

  const startEdit = (u: UserRead) => {
    setEditingId(u.id);
    setDraftUsbc('');
    setFormError(null);
    setMergePrompt(null);
  };

  const submitAssign = (userId: number, merge_into_existing = false) => {
    setFormError(null);
    const validationError = validateUsbcAssignDraft(draftUsbc);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    assignMutation.mutate({
      userId,
      usbc_id: draftUsbc.trim(),
      merge_into_existing,
    });
  };

  const layoutPrefix = location.pathname.startsWith('/admin') ? '/admin' : '/director';

  const actionsCrumb = (
    <Breadcrumb
      items={[homeCrumb(), layoutDashboardCrumb(location.pathname), { label: 'Actions needed' }]}
      className="mb-4"
    />
  );

  if (isLoading || !user) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        {actionsCrumb}
        <Loading />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {actionsCrumb}
      <PageTitle className="mb-2">Actions Needed</PageTitle>
      <p className="text-text-muted text-sm mb-6">
        {isAdmin
          ? 'Pending event sign-ups, temporary USBC placeholders, and disputed USBC ID claims.'
          : 'Pending event sign-ups and temporary USBC placeholders you created.'}
      </p>

      {error && (
        <Alert variant="error" message="Could not load the list. Try again." className="mb-4" />
      )}
      {formError && (
        <Alert variant="error" message={formError} className="mb-4" onDismiss={() => setFormError(null)} />
      )}

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-primary mb-1">Pending sign-ups</h2>
        <p className="text-text-muted text-sm mb-4">
          Bowlers who signed up for a public event wait here until you approve them on that
          event’s Participant Management page.
        </p>
        {pendingSignupsLoading ? (
          <Loading />
        ) : pendingSignups.length === 0 ? (
          <p className="text-text-muted">No pending event sign-ups right now.</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-light text-left">
                <tr>
                  <th className="p-3 font-medium">Event</th>
                  <th className="p-3 font-medium">Tournament</th>
                  <th className="p-3 font-medium">Pending</th>
                  <th className="p-3 font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {pendingSignups.map((row: PendingSignupEventRead) => (
                  <tr key={row.event_id} className="border-t border-border">
                    <td className="p-3">{row.event_name}</td>
                    <td className="p-3 text-text-muted">{row.tournament_name}</td>
                    <td className="p-3 tabular-nums">{row.pending_count}</td>
                    <td className="p-3">
                      <Link
                        to={`${layoutPrefix}/events/${row.event_id}?tab=participants`}
                        className="text-primary font-medium hover:underline"
                      >
                        Participant management
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-primary mb-1">Temporary USBC IDs</h2>
        <p className="text-text-muted text-sm mb-4">
          {isAdmin ? (
            <>
              Placeholder USBC IDs (V…) across the system, including walk-up stubs and bowlers who
              signed up without a USBC. Assign their real USBC ID here.
            </>
          ) : (
            <>
              Placeholder USBC IDs (V…) you created for walk-up or imported bowlers without a USBC.
              Assign their real USBC ID here.
            </>
          )}
        </p>
        {rows.length === 0 ? (
          <p className="text-text-muted">No temporary USBC placeholders right now.</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-light text-left">
                <tr>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Temporary USBC</th>
                  <th className="p-3 font-medium">Created</th>
                  <th className="p-3 font-medium w-80">Assign real USBC</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u: UserRead) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="p-3 font-mono text-xs">{u.usbc_id}</td>
                    <td className="p-3 text-text-muted">
                      {u.created_at ? formatDateTimeNaive(u.created_at) : '—'}
                    </td>
                    <td className="p-3">
                      {editingId === u.id ? (
                        <div className="min-w-0">
                          <label
                            htmlFor={`assign-usbc-${u.id}`}
                            className="block mb-1 text-xs sm:text-sm font-semibold text-text-muted uppercase tracking-[0.06em]"
                          >
                            Real USBC ID
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                            <div className="min-w-0 flex-1">
                              <Input
                                id={`assign-usbc-${u.id}`}
                                omitMargin
                                value={draftUsbc}
                                onChange={(e) => {
                                  setDraftUsbc(e.target.value);
                                  setMergePrompt(null);
                                }}
                                fullWidth
                              />
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                type="button"
                                variant="lightbackground"
                                size="small"
                                onClick={() => {
                                  setEditingId(null);
                                  setDraftUsbc('');
                                  setMergePrompt(null);
                                }}
                                disabled={assignMutation.isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="darkbackground"
                                size="small"
                                isLoading={assignMutation.isPending}
                                onClick={() => submitAssign(u.id)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                          {mergePrompt?.placeholderUserId === u.id && (
                            <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                              <p className="text-sm text-text mb-2">
                                USBC <span className="font-mono">{mergePrompt.usbc_id}</span> belongs to{' '}
                                <span className="font-semibold">{mergePrompt.existingUserName}</span>.
                                Merge this placeholder into that account so event scores and roster entries
                                stay with the real bowler.
                              </p>
                              <Button
                                type="button"
                                variant="darkbackground"
                                size="small"
                                isLoading={assignMutation.isPending}
                                onClick={() => submitAssign(u.id, true)}
                              >
                                Merge into existing account
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button type="button" variant="outline" size="small" onClick={() => startEdit(u)}>
                          Assign USBC
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAdmin && (
      <section>
        <h2 className="text-lg font-semibold text-primary mb-1">USBC ID claims</h2>
        <p className="text-text-muted text-sm mb-4">
          Requests to take over a USBC ID that already belongs to another account. Approve or
          reject these as admin — tournament directors are not involved.
        </p>

        {claimError && (
          <Alert
            variant="error"
            message={claimError}
            className="mb-4"
            onDismiss={() => setClaimError(null)}
          />
        )}

        {claimsLoading ? (
          <Loading />
        ) : pendingClaims.length === 0 ? (
          <p className="text-text-muted">No pending USBC claims.</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-light text-left">
                <tr>
                  <th className="p-3 font-medium">USBC</th>
                  <th className="p-3 font-medium">Claimant</th>
                  <th className="p-3 font-medium">Claim email</th>
                  <th className="p-3 font-medium">Target profile</th>
                  {isAdmin && <th className="p-3 font-medium">Routing</th>}
                  <th className="p-3 font-medium">Requested</th>
                  <th className="p-3 font-medium min-w-[220px]">Review</th>
                </tr>
              </thead>
              <tbody>
                {pendingClaims.map((c: USBCClaimRead) => (
                  <tr key={c.id} className="border-t border-border align-top">
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs">{c.claimed_usbc_id}</span>
                        {c.claim_type === 'usbc_id_merge' && (
                          <span className="inline-flex w-fit items-center rounded-full bg-yellow-200 px-2 py-0.5 text-[11px] font-medium text-yellow-900">
                            USBC ID merge
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {c.claimant_user
                        ? `${c.claimant_user.first_name} ${c.claimant_user.last_name} (#${c.claimant_user_id})`
                        : `#${c.claimant_user_id}`}
                      {c.claimant_linked_usbc_ids && c.claimant_linked_usbc_ids.length > 0 && (
                        <div className="mt-1 text-xs text-text-muted">
                          IDs: {c.claimant_linked_usbc_ids.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-text-muted break-all">{c.claimant_email || '—'}</td>
                    <td className="p-3">
                      {c.target_user
                        ? `${c.target_user.first_name} ${c.target_user.last_name} (#${c.target_user_id})`
                        : c.target_user_id != null
                          ? `#${c.target_user_id}`
                          : '—'}
                      {c.target_linked_usbc_ids && c.target_linked_usbc_ids.length > 0 && (
                        <div className="mt-1 text-xs text-text-muted">
                          IDs: {c.target_linked_usbc_ids.join(', ')}
                        </div>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-text-muted text-xs">{claimRoutingLabel(c)}</td>
                    )}
                    <td className="p-3 text-text-muted whitespace-nowrap">
                      {c.created_at ? formatDateTimeNaive(c.created_at) : '—'}
                    </td>
                    <td className="p-3">
                      <div className="space-y-2">
                        <Label htmlFor={`claim-notes-${c.id}`} className="text-xs mb-0">
                          Notes (optional)
                        </Label>
                        <Input
                          id={`claim-notes-${c.id}`}
                          omitMargin
                          value={reviewNotesByClaim[c.id] ?? ''}
                          onChange={(e) =>
                            setReviewNotesByClaim((prev) => ({
                              ...prev,
                              [c.id]: e.target.value,
                            }))
                          }
                          fullWidth
                          placeholder="Reason or context"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="darkbackground"
                            size="small"
                            isLoading={busyClaimId === c.id && reviewMutation.isPending}
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                claimId: c.id,
                                status: 'approved',
                                review_notes: reviewNotesByClaim[c.id]?.trim() || undefined,
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="small"
                            isLoading={busyClaimId === c.id && reviewMutation.isPending}
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                claimId: c.id,
                                status: 'rejected',
                                review_notes: reviewNotesByClaim[c.id]?.trim() || undefined,
                              })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}
    </div>
  );
};

export default ActionsNeeded;
