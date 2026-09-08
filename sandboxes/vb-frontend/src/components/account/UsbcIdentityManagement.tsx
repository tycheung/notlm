import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '../common/Alert';
import Button from '../common/Button';
import Input from '../common/Input';
import {
  claimAdditionalUsbcIdentity,
  getUsbcIdentities,
  setActiveUsbcIdentity,
} from '../../api/account';
import { getErrorMessage } from '../../api/apiErrors';

const UsbcIdentityManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [newUsbcId, setNewUsbcId] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['accountUsbcIdentities'],
    queryFn: async () => (await getUsbcIdentities()).data,
  });

  const identities = useMemo(() => data?.identities ?? [], [data]);

  const activateMutation = useMutation({
    mutationFn: (usbcId: string) => setActiveUsbcIdentity(usbcId),
    onSuccess: () => {
      setError(null);
      setSuccess('Active USBC ID updated.');
      queryClient.invalidateQueries({ queryKey: ['accountUsbcIdentities'] });
      queryClient.invalidateQueries({ queryKey: ['securityInfo'] });
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, 'Could not switch active USBC ID.'));
    },
  });

  const claimMutation = useMutation({
    mutationFn: ({ usbcId, notes }: { usbcId: string; notes?: string }) =>
      claimAdditionalUsbcIdentity(usbcId, notes),
    onSuccess: (response) => {
      setError(null);
      setSuccess(
        response.data?.claim_id
          ? 'Claim submitted for admin review.'
          : 'Claim submitted successfully.'
      );
      setNewUsbcId('');
      setClaimNotes('');
      queryClient.invalidateQueries({ queryKey: ['usbcClaims'] });
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, 'Could not submit USBC ID claim.'));
    },
  });

  if (isLoading) {
    return <div className="text-text-muted">Loading USBC identity management...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary">USBC IDs</h2>
        <p className="text-text-muted text-sm mt-1">
          Choose your active USBC ID and request additional IDs to be merged into your account.
        </p>
      </div>

      {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}
      {success && <Alert variant="success" message={success} onDismiss={() => setSuccess(null)} />}

      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="text-lg font-semibold text-primary mb-3">Your linked USBC IDs</h3>
        {identities.length === 0 ? (
          <p className="text-text-muted text-sm">No linked USBC IDs found yet.</p>
        ) : (
          <ul className="space-y-2">
            {identities.map((identity) => (
              <li
                key={identity.usbc_id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{identity.usbc_id}</span>
                  {identity.is_active && (
                    <span className="inline-flex items-center rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  )}
                </div>
                {!identity.is_active && (
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    disabled={activateMutation.isPending}
                    onClick={() => activateMutation.mutate(identity.usbc_id)}
                  >
                    Set Active
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="text-lg font-semibold text-primary mb-3">Claim another USBC ID</h3>
        <div className="grid gap-3">
          <Input
            label="USBC ID"
            name="new_usbc_id"
            value={newUsbcId}
            onChange={(e) => setNewUsbcId(e.target.value)}
            placeholder="Enter additional USBC ID"
            required
          />
          <Input
            label="Notes (optional)"
            name="claim_notes"
            value={claimNotes}
            onChange={(e) => setClaimNotes(e.target.value)}
            placeholder="Context for TD/admin review"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="darkbackground"
              isLoading={claimMutation.isPending}
              disabled={!newUsbcId.trim() || claimMutation.isPending}
              onClick={() =>
                claimMutation.mutate({
                  usbcId: newUsbcId.trim(),
                  notes: claimNotes.trim() || undefined,
                })
              }
            >
              Claim Additional USBC ID
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsbcIdentityManagement;
