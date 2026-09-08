import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import Alert from '../common/Alert';
import { SideActionsAPI } from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import { sideActionQueryKeys } from '../../features/side-actions/shared';
import { sideActionStandingsShowMoney } from '../../utils/sideActionStandingsMoney';
import { formatEliminatorDropLabel } from '../../utils/eliminatorProjection';
import Tabs from '../common/Tabs';

interface EliminatorStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
}

const EliminatorStandingsModal: React.FC<EliminatorStandingsModalProps> = ({
  isOpen,
  onClose,
  sideActionId,
  sideActionName,
}) => {
  const [activePool, setActivePool] = useState('all');
  const selectedPoolId = activePool === 'all' ? undefined : Number(activePool);
  const { data: poolManifest = [], isLoading: arePoolsLoading } = useQuery({
    queryKey: sideActionQueryKeys.pools(sideActionId),
    queryFn: () => SideActionsAPI.getSideActionPools(sideActionId),
    enabled: isOpen && sideActionId > 0,
  });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: sideActionQueryKeys.standings(
      'eliminator',
      sideActionId,
      selectedPoolId
    ),
    queryFn: () =>
      SideActionsAPI.getEliminatorStandings(
        sideActionId,
        selectedPoolId ? { pool_id: selectedPoolId } : undefined
      ),
    enabled: isOpen && sideActionId > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    setActivePool('all');
  }, [isOpen, sideActionId]);

  const tabs = [
    { id: 'all', label: 'All squads' },
    ...poolManifest
      .filter((pool) => pool.is_enabled)
      .map((pool) => ({ id: String(pool.id), label: pool.squad_name })),
  ];
  const visiblePools =
    selectedPoolId == null
      ? data?.pools ?? []
      : (data?.pools ?? []).filter((pool) => pool.pool_id === selectedPoolId);
  const selectedPool =
    selectedPoolId == null
      ? undefined
      : data?.pools.find((pool) => pool.pool_id === selectedPoolId);
  const summaryProjection = selectedPool?.projection ?? data?.projection;
  const summaryFund =
    selectedPoolId == null
      ? data?.fund
      : data?.pool_funds.find((fund) => fund.pool_id === selectedPoolId) ?? data?.fund;
  const allPoolsVary =
    selectedPoolId == null &&
    new Set(
      (data?.pools ?? []).map((pool) =>
        JSON.stringify({
          games: pool.projection.game_numbers,
          dropMode: pool.projection.drop_mode,
          dropAmount: pool.projection.drop_amount,
          roundMode: pool.projection.round_mode,
        })
      )
    ).size > 1;
  const showMoney = sideActionStandingsShowMoney({
    money_visible: data?.money_visible,
    collected: summaryFund?.collected,
    prize_fund: summaryFund?.prize_fund,
    rowPayouts: visiblePools.flatMap((pool) =>
      pool.rounds.flatMap((round) =>
        round.rows.flatMap((row) => [row.payout, row.provisional_payout])
      )
    ),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${sideActionName} — Eliminator`} size="large">
      {(isLoading || arePoolsLoading) && <Loading />}
      {isError && (
        <Alert variant="error" message={getErrorMessage(error, 'Failed to load standings.')} />
      )}
      {data && (
        <div className="space-y-4">
          {tabs.length > 1 && (
            <Tabs
              activeTab={activePool}
              tabs={tabs}
              onTabChange={setActivePool}
              variant="underline"
              size="sm"
              className="overflow-x-auto"
              ariaLabel="Eliminator squad standings"
              idPrefix={`eliminator-${sideActionId}-pools`}
              panelId={`eliminator-${sideActionId}-panel`}
            />
          )}
          <div
            id={`eliminator-${sideActionId}-panel`}
            role="tabpanel"
            aria-labelledby={`eliminator-${sideActionId}-pools-tab-${activePool}`}
            className="space-y-4"
          >
          <p className="text-sm text-text-muted">
            {allPoolsVary
              ? 'Varies by squad'
              : `${data.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap'} · Games ${
                  summaryProjection?.game_numbers.join(', ') ?? ''
                } · Drop ${formatEliminatorDropLabel({
                  dropMode: summaryProjection?.drop_mode ?? data.drop_mode,
                  dropAmount: summaryProjection?.drop_amount ?? data.drop_amount,
                  dropSchedule:
                    summaryProjection?.drop_schedule ?? data.drop_schedule,
                  roundMode: summaryProjection?.round_mode ?? data.round_mode,
                })} · ${selectedPool?.final_alive ?? data.final_alive} alive in Game ${
                  selectedPool?.payout_game ?? data.payout_game
                } (payout)`}
          </p>
          {summaryFund && (
            <div className="text-sm rounded border border-border bg-surface-light px-3 py-2">
              Entries {summaryFund.entry_count}
              {showMoney
                ? ` · Collected $${summaryFund.collected.toFixed(2)} · Expenses $${summaryFund.expenses.toFixed(2)} · Fund $${summaryFund.prize_fund.toFixed(2)}`
                : ''}
            </div>
          )}
          {visiblePools.map((pool) => (
            <section key={pool.pool_id} className="space-y-3">
              <h3 className="font-semibold text-text">
                {pool.squad_name ?? `Squad ${pool.squad_id}`}
              </h3>
              {showMoney && pool.fund.overcommitted ? (
                <Alert variant="warning" message="Configured payouts exceed this squad fund." />
              ) : showMoney && !pool.fund.payout_ready ? (
                <Alert
                  variant="warning"
                  message="Payouts are provisional until this squad field is complete."
                />
              ) : null}
              {pool.warning && <Alert variant="warning" message={pool.warning} />}
              {pool.rounds.map((round) => (
                <div key={`${pool.pool_id}-${round.role}-${round.game_number}`} className="space-y-2">
                  <h4 className="text-sm font-semibold text-text">
                    {round.label}{' '}
                    <span className="font-normal text-text-muted">
                      ({round.starting_alive} start
                      {round.role === 'cut' ? `, drop ${round.dropped}` : ''} → {round.surviving})
                    </span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table
                      className="min-w-full text-sm"
                      aria-label={`${pool.squad_name ?? `Squad ${pool.squad_id}`} ${round.label}`}
                    >
                      <thead>
                        <tr className="text-left text-text-muted border-b border-border">
                          <th scope="col" className="py-1 pr-3">
                            {round.role === 'payout' ? 'Place' : 'Rank'}
                          </th>
                          <th scope="col" className="py-1 pr-3">
                            {data.entry_unit === 'team' ? 'Team' : 'Bowler'}
                          </th>
                          <th scope="col" className="py-1 pr-3">Score</th>
                          <th scope="col" className="py-1 pr-3">Status</th>
                          {showMoney && round.role === 'payout' && (
                            <th scope="col" className="py-1 pr-3">Payout</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {round.rows.map((row, index) => (
                          <tr
                            key={`${row.user_id}-${index}`}
                            className={`border-b border-border/60 ${
                              row.status === 'eliminated' ? 'opacity-60' : ''
                            }`}
                          >
                            <td className="py-1 pr-3">{row.place ?? row.rank ?? '—'}</td>
                            <td className="py-1 pr-3">{row.display_name}</td>
                            <td className="py-1 pr-3">{row.score ?? '—'}</td>
                            <td className="py-1 pr-3 capitalize">{row.status}</td>
                            {showMoney && round.role === 'payout' && (
                              <td className="py-1 pr-3">
                                {row.payout > 0
                                  ? `$${row.payout.toFixed(2)}`
                                  : row.provisional_payout > 0
                                    ? `$${row.provisional_payout.toFixed(2)} provisional`
                                    : ''}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EliminatorStandingsModal;
