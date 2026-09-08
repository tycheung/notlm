import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Loading from '../common/Loading';
import Alert from '../common/Alert';
import { SideActionsAPI } from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import { sideActionQueryKeys } from '../../features/side-actions/shared';
import { sideActionStandingsShowMoney } from '../../utils/sideActionStandingsMoney';
import Tabs from '../common/Tabs';

interface HighSetStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
}

const HighSetStandingsModal: React.FC<HighSetStandingsModalProps> = ({
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
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: sideActionQueryKeys.standings(
      'high_set',
      sideActionId,
      selectedPoolId
    ),
    queryFn: () =>
      SideActionsAPI.getHighSetStandings(
        sideActionId,
        selectedPoolId ? { pool_id: selectedPoolId } : undefined
      ),
    enabled: isOpen && sideActionId > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: isOpen ? 15_000 : false,
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
  const summarySeriesMode =
    selectedPool?.scoring_mode ?? selectedPool?.series_mode ?? data?.series_mode;
  const summaryBestN = selectedPool?.best_n ?? data?.best_n;
  const enabledManifestPools = poolManifest.filter((pool) => pool.is_enabled);
  const allPoolsVary =
    selectedPoolId == null &&
    new Set(
      enabledManifestPools.map((pool) =>
        JSON.stringify({
          games: pool.game_numbers,
          seriesMode:
            pool.override_config?.type_config?.series_mode ?? data?.series_mode,
          bestN: pool.override_config?.type_config?.best_n ?? data?.best_n,
          handicapMode:
            pool.override_config?.type_config?.handicap_mode ?? data?.handicap_mode,
        })
      )
    ).size > 1;
  const summaryFund =
    selectedPoolId == null
      ? data?.fund
      : data?.pool_funds.find((fund) => fund.pool_id === selectedPoolId) ?? data?.fund;
  const gameLabel =
    summaryGameNumbers.length
      ? `Games ${summaryGameNumbers.join(', ')}`
      : '';
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
              ariaLabel="High Series squad standings"
              idPrefix={`high-series-${sideActionId}-pools`}
              panelId={`high-series-${sideActionId}-panel`}
            />
          )}
          <div
            id={`high-series-${sideActionId}-panel`}
            role="tabpanel"
            aria-labelledby={`high-series-${sideActionId}-pools-tab-${activePool}`}
            className="space-y-4"
          >
          <p className="text-sm text-text-muted">
            {allPoolsVary
              ? 'Varies by squad'
              : `${data.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap'} · ${
                  summarySeriesMode === 'best_n'
                    ? `Best ${summaryBestN} selected games`
                    : 'Sum selected games'
                } · ${gameLabel}`}
          </p>
          <div className="flex justify-end">
            <Button
              type="button"
              size="small"
              variant="lightbackground"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
          {summaryFund && (
            <div className="text-sm rounded border border-border bg-surface-light px-3 py-2">
              Entries {summaryFund.entry_count}
              {showMoney
                ? ` · Collected $${summaryFund.collected.toFixed(2)} · Expenses $${summaryFund.expenses.toFixed(2)} · Fund $${summaryFund.prize_fund.toFixed(2)}`
                : ''}
            </div>
          )}
          {showMoney && summaryFund?.overcommitted && (
            <Alert
              variant="error"
              message="Configured payouts exceed the available prize fund. Payouts are withheld until the fund is corrected."
            />
          )}
          {showMoney &&
            summaryFund &&
            !summaryFund.payout_ready &&
            !summaryFund.overcommitted &&
            visiblePools.length > 0 && (
            <Alert
              variant="info"
              message="Standings are provisional. Payouts remain withheld until every configured game is complete."
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
            const seriesMode = pool.scoring_mode ?? pool.series_mode;
            return (
            <div key={`${pool.pool_id}-${pool.label}`} className="space-y-2">
              <h3 className="text-sm font-semibold text-text">{pool.label}</h3>
              <p className="text-xs text-text-muted">
                {seriesMode === 'best_n' ? `Best ${pool.best_n ?? data.best_n}` : 'Sum'} · Games{' '}
                {gameNumbers.join(', ')}
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm" aria-label={`${pool.label} High Series standings`}>
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border">
                      <th scope="col" className="py-1 pr-3">Place</th>
                      <th scope="col" className="py-1 pr-3">
                        {data.entry_unit === 'team' ? 'Team' : 'Bowler'}
                      </th>
                      {gameNumbers.map((g) => (
                        <th key={g} scope="col" className="py-1 pr-3">
                          G{g}
                        </th>
                      ))}
                      <th scope="col" className="py-1 pr-3">Series</th>
                      {showMoney ? <th scope="col" className="py-1 pr-3">Payout</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {pool.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={(showMoney ? 4 : 3) + gameNumbers.length}
                          className="py-2 text-text-muted"
                        >
                          No scores yet
                        </td>
                      </tr>
                    ) : (
                      pool.rows.map((row, idx) => (
                        <tr
                          key={`${row.user_id}-${idx}`}
                          className="border-b border-border/60"
                        >
                          <td className="py-1 pr-3">{row.place ?? '—'}</td>
                          <td className="py-1 pr-3">{row.display_name}</td>
                          {gameNumbers.map((g) => {
                            const sc = row.game_scores?.[String(g)];
                            return (
                              <td key={g} className="py-1 pr-3">
                                {sc != null ? sc : '—'}
                              </td>
                            );
                          })}
                          <td className="py-1 pr-3 font-medium">{row.score}</td>
                          {showMoney ? (
                            <td className="py-1 pr-3">
                              {row.payout > 0
                                ? `$${row.payout.toFixed(2)}`
                                : row.provisional_payout > 0
                                  ? `$${row.provisional_payout.toFixed(2)} provisional`
                                  : ''}
                            </td>
                          ) : null}
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

export default HighSetStandingsModal;
