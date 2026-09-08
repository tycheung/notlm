import React, { useEffect, useState } from 'react';
import {
  BillingHistoryItem,
  BillingUsageItem,
  TdAccessAPI,
} from '../../api/tdAccess';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import { formatDateTimeNaive } from '../../utils/dateUtils';

interface BillingHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

const BillingHistoryModal: React.FC<BillingHistoryModalProps> = ({
  open,
  onClose,
}) => {
  const [tab, setTab] = useState<'billing' | 'usage'>('billing');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BillingHistoryItem[]>([]);
  const [usage, setUsage] = useState<BillingUsageItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [h, u] = await Promise.all([
          TdAccessAPI.getBillingHistory(),
          TdAccessAPI.getBillingUsage(),
        ]);
        if (cancelled) return;
        setHistory(h.items || []);
        setUsage(u.items || []);
      } catch {
        if (!cancelled) setError('Could not load billing history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Modal isOpen={open} onClose={onClose} title="Billing / Usage History" size="large">
      <div className="flex gap-2 border-b border-border mb-4">
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium ${
            tab === 'billing'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-muted'
          }`}
          onClick={() => setTab('billing')}
        >
          Billing
        </button>
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium ${
            tab === 'usage'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-muted'
          }`}
          onClick={() => setTab('usage')}
        >
          Usage
        </button>
      </div>
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loading />
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error}</p>
      ) : tab === 'billing' ? (
        history.length === 0 ? (
          <p className="text-sm text-text-muted">No billing activity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((row) => (
              <li key={row.id} className="py-3 flex justify-between gap-4 text-sm">
                <div>
                  <div className="font-medium text-text">{row.label}</div>
                  <div className="text-text-muted text-xs mt-0.5">
                    {formatDateTimeNaive(row.created_at)}
                  </div>
                </div>
                <div
                  className={
                    row.amount_cents < 0 ? 'text-success font-medium' : 'text-text'
                  }
                >
                  {row.amount_cents < 0 ? '-' : ''}$
                  {(Math.abs(row.amount_cents) / 100).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : usage.length === 0 ? (
        <p className="text-sm text-text-muted">No pass usage yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {usage.map((row) => (
            <li key={row.credit_id} className="py-3 text-sm">
              <div className="font-medium text-text">
                {row.kind.replace(/_/g, ' ')}
                {row.tournament_name ? ` → ${row.tournament_name}` : ''}
              </div>
              <div className="text-text-muted text-xs mt-0.5">
                {formatDateTimeNaive(row.applied_at)}
                {row.applied_by_name ? ` · by ${row.applied_by_name}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default BillingHistoryModal;
