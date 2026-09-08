import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import type { BracketEngineFinancialsReport } from '../../api/side-actions';
import { competitorColumnLabel } from '../../features/side-actions/competitorLabel';

interface BracketFinancialsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionName: string;
  report: BracketEngineFinancialsReport | null;
  isLoading?: boolean;
}

type SortKey = 'name' | 'entries' | 'refundAmount' | 'winnings' | 'totalPayout';

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function statsForUser(
  stats: BracketEngineFinancialsReport['stats'],
  userId: number
) {
  return stats[String(userId)] ?? stats[userId as unknown as string];
}

const BracketFinancialsReportModal: React.FC<BracketFinancialsReportModalProps> = ({
  isOpen,
  onClose,
  sideActionName,
  report,
  isLoading = false,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const rows = useMemo(() => {
    if (!report) return [];
    const { quotas, stats, entry_fee: entryFee, payouts, user_display_names: names } = report;
    return quotas.map((quota) => {
      const bowlerStats = statsForUser(stats, quota.user_id);
      const refundAmount = quota.unused * entryFee;
      const firstWins = bowlerStats?.first ?? 0;
      const secondWins = bowlerStats?.second ?? 0;
      const thirdWins = bowlerStats?.third ?? 0;
      const fourthWins = bowlerStats?.fourth ?? 0;
      const splitWins = bowlerStats?.split ?? 0;
      const firstPay = firstWins * payouts.first;
      const secondPay = secondWins * payouts.second;
      const thirdPay = thirdWins * (payouts.third ?? 0);
      const fourthPay = fourthWins * (payouts.fourth ?? 0);
      const splitPay = splitWins * ((payouts.first + payouts.second) / 2);
      const winnings = bowlerStats?.reward ?? 0;
      const totalPayout = refundAmount + winnings;
      const name =
        names?.[quota.user_id] ??
        names?.[String(quota.user_id) as unknown as number] ??
        `User ${quota.user_id}`;

      return {
        userId: quota.user_id,
        name,
        entries: quota.count,
        placed: quota.quota,
        refundEntries: quota.unused,
        eliminated: (bowlerStats?.r1l ?? 0) + (bowlerStats?.r2l ?? 0),
        firstWins,
        secondWins,
        thirdWins,
        fourthWins,
        splitWins,
        firstPay,
        secondPay,
        thirdPay,
        fourthPay,
        splitPay,
        refundAmount,
        winnings,
        totalPayout,
      };
    });
  }, [report]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        const diff = av.localeCompare(bv, undefined, { sensitivity: 'base' });
        return sortAsc ? diff : -diff;
      }
      const diff = Number(av) - Number(bv);
      return sortAsc ? diff : -diff;
    });
    return copy;
  }, [rows, sortAsc, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
      return;
    }
    setSortKey(key);
    setSortAsc(key === 'name');
  };

  const sortMarker = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  const financials = report?.financials;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Financials — ${sideActionName}`}
      size="large"
      closeOnOutsideClick
    >
      {isLoading && <p className="text-sm text-text-muted py-4">Loading financial report…</p>}

      {!isLoading && report && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-text mb-2">Event totals</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <div className="rounded-md border border-border bg-surface-light p-3">
                <p className="text-xs uppercase text-text-dim">Collected</p>
                <p className="font-semibold text-text">
                  {formatMoney(financials?.total_collected ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-light p-3">
                <p className="text-xs uppercase text-text-dim">Refunds</p>
                <p className="font-semibold text-text">
                  {formatMoney(financials?.total_refunds ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-light p-3">
                <p className="text-xs uppercase text-text-dim">Winnings</p>
                <p className="font-semibold text-text">
                  {formatMoney(financials?.winnings ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-light p-3">
                <p className="text-xs uppercase text-text-dim">Total payout (refunds + winnings)</p>
                <p className="font-semibold text-text">
                  {formatMoney(financials?.total_payout ?? 0)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-light p-3">
                <p className="text-xs uppercase text-text-dim">Fees</p>
                <p className="font-semibold text-primary">
                  {formatMoney(financials?.fees ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-muted">
            Entry fee {formatMoney(report.entry_fee)} · 1st{' '}
            {formatMoney(report.payouts.first)} · 2nd{' '}
            {formatMoney(report.payouts.second)}
            {(report.payouts.third ?? 0) > 0
              ? ` · 3rd ${formatMoney(report.payouts.third ?? 0)}`
              : ''}
            {(report.payouts.fourth ?? 0) > 0
              ? ` · 4th ${formatMoney(report.payouts.fourth ?? 0)}`
              : ''}
          </p>

          <div>
            <h3 className="text-sm font-semibold text-text mb-2">
              {report.entry_unit === 'team' ? 'Team' : 'Individual'} breakdown
            </h3>
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-border text-sm" aria-label="Bracket prize and refund breakdown">
                <thead className="bg-primary sticky top-0">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-text">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('name')}>
                        {competitorColumnLabel(report.entry_unit)}{sortMarker('name')}
                      </button>
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('entries')}>
                        Entries{sortMarker('entries')}
                      </button>
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">Refund</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">1st</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">2nd</th>
                    {(report.payouts.third ?? 0) > 0 || (report.payouts.fourth ?? 0) > 0 ? (
                      <>
                        <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">3rd</th>
                        <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">4th</th>
                      </>
                    ) : null}
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">Tie</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('refundAmount')}>
                        Refund ${sortMarker('refundAmount')}
                      </button>
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('winnings')}>
                        Winnings{sortMarker('winnings')}
                      </button>
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-text">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('totalPayout')}>
                        Total{sortMarker('totalPayout')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedRows.map((row) => (
                    <tr key={row.userId}>
                      <td className="px-3 py-2 font-medium text-text">{row.name}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{row.entries}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{row.refundEntries}</td>
                      <td className="px-3 py-2 text-right text-text-muted">
                        {row.firstWins > 0 ? (
                          <span title={formatMoney(row.firstPay)}>
                            {row.firstWins} ({formatMoney(row.firstPay)})
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-text-muted">
                        {row.secondWins > 0 ? (
                          <span title={formatMoney(row.secondPay)}>
                            {row.secondWins} ({formatMoney(row.secondPay)})
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {(report.payouts.third ?? 0) > 0 || (report.payouts.fourth ?? 0) > 0 ? (
                        <>
                          <td className="px-3 py-2 text-right text-text-muted">
                            {row.thirdWins > 0 ? (
                              <span title={formatMoney(row.thirdPay)}>
                                {row.thirdWins} ({formatMoney(row.thirdPay)})
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-text-muted">
                            {row.fourthWins > 0 ? (
                              <span title={formatMoney(row.fourthPay)}>
                                {row.fourthWins} ({formatMoney(row.fourthPay)})
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </>
                      ) : null}
                      <td className="px-3 py-2 text-right text-text-muted">
                        {row.splitWins > 0 ? (
                          <span title={formatMoney(row.splitPay)}>
                            {row.splitWins} ({formatMoney(row.splitPay)})
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-text-muted">
                        {row.refundAmount > 0 ? formatMoney(row.refundAmount) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-text-muted">
                        {row.winnings > 0 ? formatMoney(row.winnings) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-text">
                        {row.totalPayout > 0 ? formatMoney(row.totalPayout) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BracketFinancialsReportModal;
