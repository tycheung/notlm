import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../../../components/common/Modal';
import Loading from '../../../components/common/Loading';
import Alert from '../../../components/common/Alert';
import Button from '../../../components/common/Button';
import { SideActionsAPI } from '../../../api/side-actions';
import { getErrorMessage } from '../../../api/apiErrors';
import { sideActionQueryKeys } from '../shared';
import Tabs from '../../../components/common/Tabs';
import { sideActionStandingsShowMoney } from '../../../utils/sideActionStandingsMoney';
import type { MysteryGameStandingsPool } from '../../../types/side_action';
import { competitorColumnLabel } from '../competitorLabel';
import {
  normalizeOutcome,
  poolTargetLabel,
  sortRowsForDisplay,
  spinCardTone,
  type OutcomeKind,
  winnerNames,
  winnerScoreDetails,
} from './mysteryGameSpinOutcome';

interface MysteryGameSpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
  allowSpin?: boolean;
  autoStartSpin?: boolean;
}

const SPIN_DURATION_MS = 2200;

interface PoolOutcomeBannerProps {
  pool: MysteryGameStandingsPool;
  showMoney: boolean;
}

const PoolOutcomeBanner: React.FC<PoolOutcomeBannerProps> = ({ pool, showMoney }) => {
  if (!pool.spun) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-light px-4 py-3 text-sm text-text-muted">
        Not generated yet. Spin when every entrant has a score.
      </div>
    );
  }

  const outcome = normalizeOutcome(pool.outcome);
  const names = winnerNames(pool);
  const payoutTotal = names.length
    ? (pool.winners ?? []).reduce(
        (sum, winner) => sum + Number(winner.payout ?? 0),
        0
      )
    : 0;

  if (outcome === 'needs_respin') {
    return (
      <Alert
        variant="warning"
        title="No match on this spin"
        message="No one hit the mystery number exactly. Use Re-spin to draw a new mystery number."
        isDismissible={false}
      />
    );
  }

  if (outcome === 'no_scores') {
    return (
      <Alert
        variant="error"
        title="No scores to compare"
        message="The mystery number was spun, but no complete scores were available for this pool."
        isDismissible={false}
      />
    );
  }

  if (!names.length) {
    return (
      <Alert
        variant="warning"
        title="No winner"
        message="The spin completed, but no winner could be determined for this pool."
        isDismissible={false}
      />
    );
  }

  const winnerLabel = names.length > 1 ? 'Winners' : 'Winner';
  const payoutNote =
    showMoney && payoutTotal > 0
      ? ` · $${payoutTotal.toFixed(2)}${names.length > 1 ? ' split' : ''}`
      : '';

  if (outcome === 'exact_match') {
    return (
      <Alert
        variant="success"
        title="Exact match"
        message={
          <>
            <span className="font-semibold text-text">{winnerScoreDetails(pool)}</span>
            <span className="text-text-muted">
              {' '}
              — matched mystery number {pool.target_score ?? '—'} exactly{payoutNote}.
            </span>
          </>
        }
        isDismissible={false}
      />
    );
  }

  if (outcome === 'closest') {
    return (
      <Alert
        variant="success"
        title="Closest score wins"
        message={
          <>
            <span className="font-semibold text-text">{winnerScoreDetails(pool)}</span>
            <span className="text-text-muted">
              {' '}
              — closest to mystery number {pool.target_score ?? '—'}
              {pool.distance != null ? ` (off by ${pool.distance})` : ''}
              {payoutNote}. No one had to hit the mystery number exactly.
            </span>
          </>
        }
        isDismissible={false}
      />
    );
  }

  return (
    <Alert
      variant="info"
      title={winnerLabel}
      message={`${names.join(', ')}${payoutNote}.`}
      isDismissible={false}
    />
  );
};

const MysteryGameSpinModal: React.FC<MysteryGameSpinModalProps> = ({
  isOpen,
  onClose,
  sideActionId,
  sideActionName,
  allowSpin = true,
  autoStartSpin = false,
}) => {
  const queryClient = useQueryClient();
  const [activePool, setActivePool] = useState('all');
  const [spinning, setSpinning] = useState(false);
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const autoStartedRef = useRef(false);
  const selectedPoolId = activePool === 'all' ? undefined : Number(activePool);

  const { data: poolManifest = [] } = useQuery({
    queryKey: sideActionQueryKeys.pools(sideActionId),
    queryFn: () => SideActionsAPI.getSideActionPools(sideActionId),
    enabled: isOpen && sideActionId > 0,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: sideActionQueryKeys.standings(
      'mystery_game',
      sideActionId,
      selectedPoolId
    ),
    queryFn: () =>
      SideActionsAPI.getMysteryGameStandings(
        sideActionId,
        selectedPoolId ? { pool_id: selectedPoolId } : undefined
      ),
    enabled: isOpen && sideActionId > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const spinMutation = useMutation({
    mutationFn: () =>
      SideActionsAPI.spinMysteryGame(
        sideActionId,
        selectedPoolId ? { pool_id: selectedPoolId } : undefined
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
      await refetch();
    },
  });

  useEffect(() => {
    setActivePool('all');
    setSpinning(false);
    setDisplayNumber(null);
    autoStartedRef.current = false;
  }, [isOpen, sideActionId]);

  useEffect(() => {
    setDisplayNumber(null);
  }, [activePool]);

  const minScore = data?.min_mystery_score ?? 0;
  const maxScore = data?.max_mystery_score ?? 300;

  const runSpinAnimation = async () => {
    if (spinning || spinMutation.isPending) return;
    setSpinning(true);
    const started = Date.now();
    const tick = () => {
      const span = Math.max(1, maxScore - minScore);
      const n = minScore + Math.floor(Math.random() * (span + 1));
      setDisplayNumber(n);
      if (Date.now() - started < SPIN_DURATION_MS) {
        window.setTimeout(tick, 60);
      }
    };
    tick();
    try {
      const result = await spinMutation.mutateAsync();
      const resultPools = result.pools ?? [];
      const targets = resultPools
        .map((pool) => pool.target_score)
        .filter((target): target is number => target != null);
      const uniqueTargets = new Set(targets);
      const selectedTarget =
        selectedPoolId != null
          ? resultPools.find((pool) => pool.pool_id === selectedPoolId)
              ?.target_score ?? null
          : uniqueTargets.size === 1
            ? targets[0]
            : null;
      const remaining = Math.max(0, SPIN_DURATION_MS - (Date.now() - started));
      await new Promise((r) => window.setTimeout(r, remaining));
      setDisplayNumber(selectedTarget);
    } catch {
      setDisplayNumber(null);
    } finally {
      setSpinning(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !autoStartSpin || !allowSpin || !data) return;
    if (autoStartedRef.current) return;
    if (data.spun) return;
    if (!data.pools?.length || !data.pools.every((p) => p.is_complete)) return;
    autoStartedRef.current = true;
    void runSpinAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoStartSpin, allowSpin, data]);

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
    collected: Number(data?.fund?.collected ?? 0),
    prize_fund: Number(data?.fund?.prize_fund ?? 0),
    rowPayouts: pools.flatMap((pool) =>
      pool.rows.flatMap((row) => [row.payout, row.provisional_payout])
    ),
  });
  const competitorLabel = competitorColumnLabel(data?.entry_unit);

  const incomplete = (data?.pools ?? []).some((p) => !p.is_complete);
  const visibleOutcome = useMemo<OutcomeKind>(() => {
    if (spinning || !data?.spun) return 'pending';
    if (pools.some((pool) => normalizeOutcome(pool.outcome) === 'needs_respin')) {
      return 'needs_respin';
    }
    if (pools.length === 1) {
      return normalizeOutcome(pools[0]?.outcome);
    }
    if (pools.every((pool) => normalizeOutcome(pool.outcome) === 'exact_match')) {
      return 'exact_match';
    }
    if (pools.some((pool) => winnerNames(pool).length > 0)) {
      return 'closest';
    }
    return 'unknown';
  }, [data?.spun, pools, spinning]);
  const headlineTarget = useMemo(() => {
    if (spinning && displayNumber != null) return displayNumber;
    const sharedTarget = poolTargetLabel(pools);
    if (sharedTarget != null) return sharedTarget;
    if (displayNumber != null && pools.length === 1) return displayNumber;
    if (pools.length === 1) return pools[0]?.target_score ?? null;
    return null;
  }, [displayNumber, pools, spinning]);

  const headlineCaption = useMemo(() => {
    if (!data?.spun || spinning) {
      return 'The spun mystery number — winners are compared against this value.';
    }
    if (pools.length > 1 && poolTargetLabel(pools) == null) {
      return 'Each squad has its own mystery number — see the pool sections below.';
    }
    const pool = pools[0];
    if (!pool?.spun) {
      return 'The spun mystery number — winners are compared against this value.';
    }
    const outcome = normalizeOutcome(pool.outcome);
    if (outcome === 'closest') {
      return `Mystery number ${pool.target_score ?? '—'} — winner is the closest score, not necessarily an exact match.`;
    }
    if (outcome === 'exact_match') {
      return `Mystery number ${pool.target_score ?? '—'} — winner matched this number exactly.`;
    }
    if (outcome === 'needs_respin') {
      return `Mystery number ${pool.target_score ?? '—'} — no exact match on this spin.`;
    }
    return 'The spun mystery number — winners are compared against this value.';
  }, [data?.spun, pools, spinning]);

  const showGlobalOutcome =
    Boolean(data?.spun) && !spinning && pools.length === 1 && pools[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mystery Game — ${sideActionName}`}
      size="xlarge"
    >
      <div className="space-y-4">
        {incomplete && (
          <Alert
            variant="warning"
            message="All entrant scores must be complete before generating the mystery number."
            isDismissible={false}
          />
        )}

        <div
          className={`rounded-lg border bg-gradient-to-b px-4 py-8 text-center transition-colors ${spinCardTone(
            visibleOutcome
          )}`}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Mystery Number
          </p>
          <p
            className={`mt-3 font-semibold tabular-nums text-text transition-transform ${
              spinning ? 'scale-110 animate-pulse' : 'scale-100'
            }`}
            style={{ fontSize: '4.5rem', lineHeight: 1 }}
            aria-live="polite"
          >
            {headlineTarget ?? (pools.length > 1 ? 'Per squad' : '—')}
          </p>
          <p className="mt-2 text-sm text-text-muted">{headlineCaption}</p>
          <p className="mt-1 text-xs text-text-muted">
            Range {minScore}–{maxScore}
            {data?.handicap_mode === 'handicap' ? ' · Scores include handicap' : ''}
            {data?.no_match_policy
              ? ` · No exact match: ${data.no_match_policy}`
              : ''}
          </p>
          {allowSpin && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="primary"
                size="small"
                disabled={spinning || spinMutation.isPending || incomplete}
                onClick={() => void runSpinAnimation()}
              >
                {spinning || spinMutation.isPending
                  ? 'Spinning…'
                  : data?.needs_respin
                    ? 'Re-spin'
                    : data?.spun
                      ? 'Spin again'
                      : 'Generate / Spin'}
              </Button>
              {data?.needs_respin && !spinning && (
                <span className="text-sm font-medium text-pending">
                  No exact match — re-spin required
                </span>
              )}
              {spinMutation.isError && (
                <span className="text-sm text-danger">
                  {getErrorMessage(spinMutation.error, 'Failed to spin')}
                </span>
              )}
            </div>
          )}
        </div>

        {showGlobalOutcome && (
          <PoolOutcomeBanner pool={pools[0]} showMoney={showMoney} />
        )}

        {data?.needs_respin && pools.length > 1 && !spinning && (
          <Alert
            variant="warning"
            title="Re-spin required"
            message="At least one squad pool has no exact match on the current mystery number."
            isDismissible={false}
          />
        )}

        {tabs.length > 1 && (
          <Tabs tabs={tabs} activeTab={activePool} onTabChange={setActivePool} />
        )}

        {isLoading && <Loading />}
        {isError && (
          <Alert
            variant="error"
            message={getErrorMessage(error, 'Failed to load Mystery Game')}
          />
        )}

        {pools.map((pool) => {
          const displayRows = sortRowsForDisplay(pool);
          const poolOutcome = normalizeOutcome(pool.outcome);

          return (
          <div key={pool.pool_id} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-text">{pool.label}</h3>
              {pool.spun && pool.target_score != null && (
                <span className="rounded-full border border-border bg-surface-light px-2.5 py-0.5 text-xs font-medium text-text-muted">
                  Mystery {pool.target_score}
                </span>
              )}
            </div>

            {(pools.length > 1 || !showGlobalOutcome) && (
              <PoolOutcomeBanner pool={pool} showMoney={showMoney} />
            )}

            {data?.game_scope === 'all_games_pool' && (
              <p className="text-xs text-text-muted">
                Each selected game is a separate entry in the pool. The highlighted row
                shows the score that won — other games for the same team are listed
                separately.
              </p>
            )}

            {showMoney && pool.fund && (
              <p className="text-xs text-text-muted">
                Prize fund ${Number(pool.fund.prize_fund ?? 0).toFixed(2)} ·{' '}
                {pool.entry_count} entries
              </p>
            )}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border bg-surface-light">
                    <th className="py-2 px-3">{competitorLabel}</th>
                    <th className="py-2 px-3">Game</th>
                    <th className="py-2 px-3">Score</th>
                    {pool.spun && <th className="py-2 px-3">Δ</th>}
                    <th className="py-2 px-3">Place</th>
                    {showMoney && <th className="py-2 px-3">Payout</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row) => (
                    <tr
                      key={`${row.user_id}-${row.game_number}`}
                      className={`border-b border-border/50 ${
                        row.is_winner
                          ? poolOutcome === 'needs_respin'
                            ? ''
                            : 'bg-success/10 font-medium ring-1 ring-inset ring-success/30'
                          : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{row.display_name}</span>
                          {row.is_winner && poolOutcome !== 'needs_respin' && (
                            <span className="rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-success">
                              {poolOutcome === 'exact_match' ? 'Exact match' : 'Winner'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">{row.game_number ?? '—'}</td>
                      <td className="py-2 px-3 tabular-nums">
                        {formatMysteryScore(row.score)}
                      </td>
                      {pool.spun && (
                        <td
                          className={`py-2 px-3 tabular-nums ${
                            row.is_winner && poolOutcome !== 'needs_respin'
                              ? 'font-semibold text-success'
                              : 'text-text-muted'
                          }`}
                        >
                          {row.distance != null ? row.distance : '—'}
                        </td>
                      )}
                      <td className="py-2 px-3">{row.place ?? '—'}</td>
                      {showMoney && (
                        <td className="py-2 px-3 tabular-nums font-medium">
                          {row.payout > 0 ? `$${row.payout.toFixed(2)}` : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                  {displayRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={showMoney ? 6 : 5}
                        className="px-3 py-3 text-text-muted"
                      >
                        No scores yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
        })}
      </div>
    </Modal>
  );
};

export default MysteryGameSpinModal;
