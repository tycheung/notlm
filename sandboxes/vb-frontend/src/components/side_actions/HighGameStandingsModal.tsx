import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import Alert from '../common/Alert';
import { SideActionsAPI } from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import { sideActionQueryKeys } from '../../features/side-actions/shared';
import Tabs from '../common/Tabs';
import { sideActionStandingsShowMoney } from '../../utils/sideActionStandingsMoney';

interface HighGameStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
}

const HighGameStandingsModal: React.FC<HighGameStandingsModalProps> = ({
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
      'high_game',
      sideActionId,
      selectedPoolId
    ),
    queryFn: () =>
      SideActionsAPI.getHighGameStandings(
        sideActionId,
        selectedPoolId ? { pool_id: selectedPoolId } : undefined
      ),
    enabled: isOpen && sideActionId > 0,
    // Standings must reflect prize/expense edits immediately (global staleTime is 5m).
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
  const selectedPool =
    selectedPoolId == null
      ? undefined
      : data?.pools.find((pool) => pool.pool_id === selectedPoolId);
  const summaryGameNumbers =
    selectedPool?.game_numbers?.length
      ? selectedPool.game_numbers
      : data?.game_numbers ?? [];
  const summaryPayoutMode = selectedPool?.scoring_mode ?? data?.payout_mode;
  const enabledManifestPools = poolManifest.filter((pool) => pool.is_enabled);
  const allPoolsVary =
    selectedPoolId == null &&
    new Set(
      enabledManifestPools.map((pool) =>
        JSON.stringify({
          games: pool.game_numbers,
          payoutMode:
            pool.override_config?.type_config?.payout_mode ?? data?.payout_mode,
          handicapMode:
            pool.override_config?.type_config?.handicap_mode ?? data?.handicap_mode,
        })
      )
    ).size > 1;
  const summaryFund =
    selectedPoolId == null
      ? data?.fund
      : data?.pool_funds.find((fund) => fund.pool_id === selectedPoolId) ?? data?.fund;
  const visiblePools =
    selectedPoolId == null
      ? data?.pools ?? []
      : (data?.pools ?? []).filter((pool) => pool.pool_id === selectedPoolId);
  const showMoney = sideActionStandingsShowMoney({
    money_visible: data?.money_visible,
    collected: summaryFund?.collected,
    prize_fund: summaryFund?.prize_fund,
    rowPayouts: visiblePools.flatMap((pool) =>
      pool.rows.flatMap((row) => [row.payout, row.provisional_payout])
    ),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${sideActionName} — Standings`} size="large">
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
              ariaLabel="High Game squad standings"
              idPrefix={`high-game-${sideActionId}-pools`}
              panelId={`high-game-${sideActionId}-panel`}
            />
          )}
          <div
            id={`high-game-${sideActionId}-panel`}
            role="tabpanel"
            aria-labelledby={`high-game-${sideActionId}-pools-tab-${activePool}`}
            className="space-y-4"
          >
          <p className="text-sm text-text-muted">
            {allPoolsVary
              ? 'Varies by squad'
              : `${data.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap'} · ${
                  summaryPayoutMode === 'per_game' ? 'Per game' : 'Combined list'
                } · Games ${summaryGameNumbers.join(', ')}`}
          </p>
          {summaryFund && (
            <div className="text-sm rounded border border-border bg-surface-light px-3 py-2">
              Entries {summaryFund.entry_count}
              {showMoney
                ? ` · Collected $${summaryFund.collected.toFixed(2)} · Expenses $${summaryFund.expenses.toFixed(2)} · Fund $${summaryFund.prize_fund.toFixed(2)}`
                : ''}
            </div>
          )}
          {showMoney && summaryFund && !summaryFund.payout_ready && summaryFund.entry_count > 0 && (
            <Alert
              variant="warning"
              message={
                data.fund.overcommitted
                  ? 'Configured prizes exceed this pool’s available fund. Payouts are withheld.'
                  : 'Payouts are provisional until every selected game is complete.'
              }
            />
          )}
          {visiblePools.length === 0 && (
            <p className="text-sm text-text-muted">No scored entrants yet.</p>
          )}
          {visiblePools.map((pool) => {
            const manifestPool = poolManifest.find((item) => item.id === pool.pool_id);
            const gameNumbers =
              pool.game_numbers?.length
                ? pool.game_numbers
                : manifestPool?.game_numbers?.length
                  ? manifestPool.game_numbers
                  : data.game_numbers;
            const payoutMode = pool.scoring_mode ?? data.payout_mode;
            return (
            <div key={`${pool.pool_id}-${pool.label}`} className="space-y-2">
              <h3 className="text-sm font-semibold text-text">{pool.label}</h3>
              <p className="text-xs text-text-muted">
                {payoutMode === 'per_game' ? 'Per game' : 'Combined list'} · Games{' '}
                {gameNumbers.join(', ')}
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm" aria-label={`${pool.label} High Game standings`}>
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border">
                      <th scope="col" className="py-1 pr-3">Place</th>
                      <th scope="col" className="py-1 pr-3">
                        {data.entry_unit === 'team' ? 'Team' : 'Bowler'}
                      </th>
                      {payoutMode === 'combined' && (
                        <th scope="col" className="py-1 pr-3">Game</th>
                      )}
                      <th scope="col" className="py-1 pr-3">Score</th>
                      {showMoney && (
                        <th scope="col" className="py-1 pr-3">Payout</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pool.rows.length === 0 ? (
                      <tr>
                        <td colSpan={showMoney ? 5 : 4} className="py-2 text-text-muted">
                          No scores yet
                        </td>
                      </tr>
                    ) : (
                      pool.rows.map((row, idx) => (
                        <tr
                          key={`${row.user_id}-${row.game_number ?? 'x'}-${idx}`}
                          className="border-b border-border/60"
                        >
                          <td className="py-1 pr-3">{row.place ?? '—'}</td>
                          <td className="py-1 pr-3">{row.display_name}</td>
                          {payoutMode === 'combined' && (
                            <td className="py-1 pr-3">{row.game_number ?? '—'}</td>
                          )}
                          <td className="py-1 pr-3">{row.score}</td>
                          {showMoney && (
                            <td className="py-1 pr-3">
                              {row.payout > 0
                                ? `$${row.payout.toFixed(2)}`
                                : row.provisional_payout > 0
                                  ? `$${row.provisional_payout.toFixed(2)} provisional`
                                  : ''}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default HighGameStandingsModal;
