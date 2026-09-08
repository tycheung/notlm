import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';
import Loading from '../../../components/common/Loading';
import { SideActionsAPI } from '../../../api/side-actions';
import { EventsAPI } from '../../../api/events';
import { getErrorMessage } from '../../../api/apiErrors';
import { sideActionQueryKeys } from '../shared';

interface AlibiDoublesPairsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
  eventId: number;
}

const AlibiDoublesPairsModal: React.FC<AlibiDoublesPairsModalProps> = ({
  isOpen,
  onClose,
  sideActionId,
  sideActionName,
  eventId,
}) => {
  const queryClient = useQueryClient();
  const [poolId, setPoolId] = useState<number | ''>('');
  const [holderId, setHolderId] = useState<number | ''>('');
  const [partnerId, setPartnerId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const { data: pools = [] } = useQuery({
    queryKey: sideActionQueryKeys.pools(sideActionId),
    queryFn: () => SideActionsAPI.getSideActionPools(sideActionId),
    enabled: isOpen && sideActionId > 0,
  });
  const enabledPools = pools.filter((pool) => pool.is_enabled);
  const resolvedPoolId = poolId === '' ? enabledPools[0]?.id : Number(poolId);

  const { data: participants = [] } = useQuery({
    queryKey: ['eventParticipants', eventId, 'approved'],
    queryFn: () => EventsAPI.getEventParticipants(eventId, 'approved'),
    enabled: isOpen && eventId > 0,
  });

  const { data: pairList, isLoading } = useQuery({
    queryKey: ['alibiPairs', sideActionId, resolvedPoolId],
    queryFn: () =>
      SideActionsAPI.listAlibiDoublesPairs(sideActionId, {
        pool_id: resolvedPoolId,
      }),
    enabled: isOpen && sideActionId > 0 && resolvedPoolId != null,
  });

  const { data: eligible } = useQuery({
    queryKey: ['alibiPartners', sideActionId, holderId, resolvedPoolId],
    queryFn: () =>
      SideActionsAPI.getAlibiDoublesEligiblePartners(sideActionId, {
        holder_user_id: Number(holderId),
        pool_id: Number(resolvedPoolId),
      }),
    enabled: isOpen && holderId !== '' && resolvedPoolId != null,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      SideActionsAPI.createAlibiDoublesPair(sideActionId, {
        holder_user_id: Number(holderId),
        partner_user_id: Number(partnerId),
        pool_id: Number(resolvedPoolId),
      }),
    onSuccess: () => {
      setPartnerId('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['alibiPairs', sideActionId] });
      void queryClient.invalidateQueries({ queryKey: ['alibiPartners', sideActionId] });
      void queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not add pair')),
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: number) => SideActionsAPI.deleteSideActionEntry(entryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alibiPairs', sideActionId] });
      void queryClient.invalidateQueries({ queryKey: ['alibiPartners', sideActionId] });
      void queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not remove pair')),
  });

  const partnerOptions = useMemo(
    () => (eligible?.partners ?? []).filter((row) => row.eligible),
    [eligible]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Alibi Doubles pairs — ${sideActionName}`}
      size="xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Whoever signs up picks the partner. One pair = one fee, listed under the
          signer. A/B and B/A are the same pair. Bowlers whose squad has started
          scoring cannot be added as a partner from any squad.
        </p>
        {error && (
          <Alert variant="error" message={error} onDismiss={() => setError(null)} />
        )}
        {eligible?.signup_frozen && (
          <Alert
            variant="warning"
            message="This squad has started scoring. No new pairs can be added here."
            isDismissible={false}
          />
        )}
        {eligible?.holder_at_limit && !eligible.signup_frozen && (
          <Alert
            variant="warning"
            message="This signer is at the pair limit. Nobody else can enter with them until a pair is removed."
            isDismissible={false}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {enabledPools.length > 1 && (
            <label className="text-sm text-text">
              Squad
              <select
                className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2"
                value={resolvedPoolId ?? ''}
                onChange={(e) => setPoolId(Number(e.target.value))}
              >
                {enabledPools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.squad_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm text-text">
            Signer
            <select
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2"
              value={holderId}
              onChange={(e) => {
                setHolderId(e.target.value ? Number(e.target.value) : '');
                setPartnerId('');
              }}
            >
              <option value="">Select bowler</option>
              {participants.map((row) => (
                <option key={row.user_id} value={row.user_id}>
                  {row.user_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-text">
            Partner
            <select
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2"
              value={partnerId}
              onChange={(e) =>
                setPartnerId(e.target.value ? Number(e.target.value) : '')
              }
              disabled={holderId === '' || eligible?.signup_frozen}
            >
              <option value="">Select partner</option>
              {partnerOptions.map((row) => (
                <option key={row.user_id} value={row.user_id}>
                  {row.display_name}
                  {row.squad_name ? ` · ${row.squad_name}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="small"
            disabled={
              holderId === '' ||
              partnerId === '' ||
              resolvedPoolId == null ||
              addMutation.isPending ||
              Boolean(eligible?.signup_frozen) ||
              Boolean(eligible?.holder_at_limit)
            }
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? 'Adding…' : 'Add pair'}
          </Button>
        </div>

        {isLoading && <Loading />}
        {pairList && (
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="py-1 pr-3">Signer</th>
                  <th className="py-1 pr-3">Partner</th>
                  <th className="py-1 pr-3">Squad</th>
                  <th className="py-1 pr-3"> </th>
                </tr>
              </thead>
              <tbody>
                {pairList.pairs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-text-muted">
                      No pairs yet.
                    </td>
                  </tr>
                )}
                {pairList.pairs.map((row) => (
                  <tr key={row.entry_id} className="border-b border-border/50">
                    <td className="py-1 pr-3">{row.holder_name}</td>
                    <td className="py-1 pr-3">{row.partner_name}</td>
                    <td className="py-1 pr-3">{row.squad_name ?? '—'}</td>
                    <td className="py-1 pr-3 text-right">
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => deleteMutation.mutate(row.entry_id)}
                        disabled={deleteMutation.isPending}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AlibiDoublesPairsModal;
