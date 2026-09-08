import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../../../components/common/Modal';
import Loading from '../../../components/common/Loading';
import Alert from '../../../components/common/Alert';
import { SideActionsAPI } from '../../../api/side-actions';
import { getErrorMessage } from '../../../api/apiErrors';
import { sideActionQueryKeys } from '../shared';
import Tabs from '../../../components/common/Tabs';
import { sideActionStandingsShowMoney } from '../../../utils/sideActionStandingsMoney';

interface AlibiDoublesStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
}

const AlibiDoublesStandingsModal: React.FC<AlibiDoublesStandingsModalProps> = ({
  isOpen,
  onClose,
  sideActionId,
  sideActionName,
}) => {
  const [activePool, setActivePool] = useState('all');
  const selectedPoolId = activePool === 'all' ? undefined : Number(activePool);

  const { data: poolManifest = [] } = useQuery({
    queryKey: sideActionQueryKeys.pools(sideActionId),
    queryFn: () => SideActionsAPI.getSideActionPools(sideActionId),
    enabled: isOpen && sideActionId > 0,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: sideActionQueryKeys.standings(
      'alibi_doubles',
      sideActionId,
      selectedPoolId
    ),
    queryFn: () =>
      SideActionsAPI.getAlibiDoublesStandings(
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

  const pools =
    selectedPoolId == null
      ? data?.pools ?? []
      : (data?.pools ?? []).filter((p) => p.pool_id === selectedPoolId);
  const showMoney = sideActionStandingsShowMoney({
    money_visible: data?.money_visible,
    collected: data?.fund?.collected,
    prize_fund: data?.fund?.prize_fund,
    rowPayouts: pools.flatMap((pool) =>
      pool.rows.flatMap((row) => [row.payout, row.provisional_payout])
    ),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Alibi Doubles — ${sideActionName}`}
      size="xl"
    >
      <div className="space-y-4">
        {tabs.length > 1 && (
          <Tabs tabs={tabs} activeTab={activePool} onChange={setActivePool} />
        )}

        {isLoading && <Loading />}
        {isError && (
          <Alert
            variant="error"
            message={getErrorMessage(error, 'Failed to load standings')}
          />
        )}

        {data && (
          <>
            <p className="text-sm text-text-muted">
              {data.games_label || 'Games'} · {data.handicap_mode}
              {data.fund?.pair_count != null
                ? ` · ${data.fund.pair_count} pairs`
                : ''}
            </p>
            {pools.map((pool) => (
              <div key={`${pool.pool_id}-${pool.division}`} className="space-y-2">
                <h3 className="text-sm font-semibold text-text">{pool.label}</h3>
                {pool.rows.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    Waiting on pair tickets and scores.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-text-muted border-b border-border">
                          <th className="py-1 pr-3">Place</th>
                          <th className="py-1 pr-3">Team</th>
                          <th className="py-1 pr-3">Scores</th>
                          <th className="py-1 pr-3">Total</th>
                          {showMoney ? <th className="py-1 pr-3">Payout</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {pool.rows.map((row) => (
                          <tr
                            key={`${row.user_id_a}-${row.user_id_b}`}
                            className="border-b border-border/50"
                          >
                            <td className="py-1 pr-3">{row.place ?? '—'}</td>
                            <td className="py-1 pr-3">{row.display_name}</td>
                            <td className="py-1 pr-3">
                              {row.score_a} + {row.score_b}
                            </td>
                            <td className="py-1 pr-3">{row.score}</td>
                            {showMoney ? (
                              <td className="py-1 pr-3">
                                {row.payout > 0
                                  ? `$${row.payout.toFixed(2)}`
                                  : row.provisional_payout > 0
                                    ? `$${row.provisional_payout.toFixed(2)}*`
                                    : '—'}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
};

export default AlibiDoublesStandingsModal;
