import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../../../components/common/Modal';
import Loading from '../../../components/common/Loading';
import Alert from '../../../components/common/Alert';
import Button from '../../../components/common/Button';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { SideActionsAPI } from '../../../api/side-actions';
import { getErrorMessage } from '../../../api/apiErrors';
import { sideActionQueryKeys } from '../shared';
import Tabs from '../../../components/common/Tabs';
import { sideActionStandingsShowMoney } from '../../../utils/sideActionStandingsMoney';

interface MysteryDoublesStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
  allowDrawPairs?: boolean;
}

type DrawConfirmKind = 'odd_field' | 'redraw' | null;

const MysteryDoublesStandingsModal: React.FC<MysteryDoublesStandingsModalProps> = ({
  isOpen,
  onClose,
  sideActionId,
  sideActionName,
  allowDrawPairs = true,
}) => {
  const queryClient = useQueryClient();
  const [activePool, setActivePool] = useState('all');
  const [drawConfirm, setDrawConfirm] = useState<DrawConfirmKind>(null);
  const selectedPoolId = activePool === 'all' ? undefined : Number(activePool);

  const { data: poolManifest = [] } = useQuery({
    queryKey: sideActionQueryKeys.pools(sideActionId),
    queryFn: () => SideActionsAPI.getSideActionPools(sideActionId),
    enabled: isOpen && sideActionId > 0,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: sideActionQueryKeys.standings(
      'mystery_doubles',
      sideActionId,
      selectedPoolId
    ),
    queryFn: () =>
      SideActionsAPI.getMysteryDoublesStandings(
        sideActionId,
        selectedPoolId ? { pool_id: selectedPoolId } : undefined
      ),
    enabled: isOpen && sideActionId > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const drawMutation = useMutation({
    mutationFn: () => SideActionsAPI.drawMysteryDoublesPairs(sideActionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
      await refetch();
    },
  });

  useEffect(() => {
    setActivePool('all');
    setDrawConfirm(null);
  }, [isOpen, sideActionId]);

  const requestDrawPairs = () => {
    if (
      data?.entrant_warning &&
      data.odd_entrant_policy !== 'refund_random'
    ) {
      setDrawConfirm('odd_field');
      return;
    }
    if (data?.pairs_drawn) {
      setDrawConfirm('redraw');
      return;
    }
    drawMutation.mutate();
  };

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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Mystery Doubles — ${sideActionName}`}
        size="xl"
      >
        <div className="space-y-4">
          {data?.entrant_warning && (
            <Alert variant="warning" message={data.entrant_warning} isDismissible={false} />
          )}
          {allowDrawPairs && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="small"
                disabled={drawMutation.isPending}
                onClick={requestDrawPairs}
              >
                {drawMutation.isPending
                  ? 'Drawing…'
                  : data?.pairs_drawn
                    ? 'Redraw pairs'
                    : 'Draw pairs'}
              </Button>
              {drawMutation.isError && (
                <span className="text-sm text-danger">
                  {getErrorMessage(drawMutation.error, 'Failed to draw pairs')}
                </span>
              )}
            </div>
          )}

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
                Game {data.game_number} · {data.handicap_mode} ·{' '}
                {data.pairs_drawn ? 'Pairs drawn' : 'Pairs not drawn yet'}
                {data.fund?.pair_count != null
                  ? ` · ${data.fund.pair_count} pairs`
                  : ''}
              </p>
              {pools.map((pool) => (
                <div key={`${pool.pool_id}-${pool.division}`} className="space-y-2">
                  <h3 className="text-sm font-semibold text-text">{pool.label}</h3>
                  {!pool.pairs_drawn ? (
                    <p className="text-sm text-text-muted">Draw pairs to rank teams.</p>
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
                              <td className="py-1 pr-3 font-medium">{row.score}</td>
                              {showMoney ? (
                                <td className="py-1 pr-3">
                                  $
                                  {(row.payout || row.provisional_payout || 0).toFixed(2)}
                                  {!pool.is_complete || !data.fund?.payout_ready
                                    ? ' *'
                                    : ''}
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

      <ConfirmDialog
        isOpen={drawConfirm === 'odd_field'}
        onClose={() => setDrawConfirm(null)}
        title="Odd field — draw anyway?"
        message={`${data?.entrant_warning ?? 'Odd number of entrants.'}\n\nDrawing will fail unless the odd-entrant policy is set to refund one random entrant.`}
        confirmText="Draw anyway"
        confirmVariant="danger"
        onConfirm={() => {
          setDrawConfirm(null);
          drawMutation.mutate();
        }}
      />
      <ConfirmDialog
        isOpen={drawConfirm === 'redraw'}
        onClose={() => setDrawConfirm(null)}
        title="Redraw pairs?"
        message="Pairs already drawn. Redrawing replaces the current pairing for this pot."
        confirmText="Redraw pairs"
        confirmVariant="danger"
        onConfirm={() => {
          setDrawConfirm(null);
          drawMutation.mutate();
        }}
      />
    </>
  );
};

export default MysteryDoublesStandingsModal;
