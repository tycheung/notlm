import React, { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import Alert from '../common/Alert';
import { SideActionsAPI } from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import { SideAction, SideActionType } from '../../types/side_action';
import { sideActionStandingsShowMoney } from '../../utils/sideActionStandingsMoney';
import { summarizeBowlerBracketOutcomes, bowlerBracketPayoutFromReports } from '../../utils/bowlerBracketOutcomes';

export interface BowlerLiveSelection {
  userId: number;
  displayName: string;
}

interface BowlerLiveSideActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: number;
  eventId: number;
  bowler: BowlerLiveSelection | null;
}

function typeLabel(type: SideActionType | string): string {
  switch (type) {
    case SideActionType.HIGH_GAME:
      return 'High Game';
    case SideActionType.HIGH_SET:
      return 'High Series';
    case SideActionType.ELIMINATOR:
      return 'Eliminator';
    case SideActionType.MYSTERY_DOUBLES:
      return 'Mystery Doubles';
    case SideActionType.MYSTERY_GAME:
      return 'Mystery Game';
    case SideActionType.LOVE_DOUBLES:
      return 'Love Doubles';
    case SideActionType.ALIBI_DOUBLES:
      return 'Alibi Doubles';
    case SideActionType.BRACKET:
      return 'Brackets';
    default:
      return String(type);
  }
}

type OutcomeLine = {
  sideActionId: number;
  name: string;
  typeLabel: string;
  detail: string;
  moneyLabel?: string;
};

function formatPlace(place?: number | null): string {
  if (place == null || place <= 0) return 'Entered';
  const mod100 = place % 100;
  const mod10 = place % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? 'th'
      : mod10 === 1
        ? 'st'
        : mod10 === 2
          ? 'nd'
          : mod10 === 3
            ? 'rd'
            : 'th';
  return `${place}${suffix}`;
}

function moneyFromRow(payout?: number | null, provisional?: number | null): string | undefined {
  if ((payout ?? 0) > 0) return `$${Number(payout).toFixed(2)}`;
  if ((provisional ?? 0) > 0) return `$${Number(provisional).toFixed(2)} provisional`;
  return undefined;
}

const BowlerLiveSideActionsSheet: React.FC<BowlerLiveSideActionsSheetProps> = ({
  isOpen,
  onClose,
  tournamentId,
  eventId,
  bowler,
}) => {
  const userId = bowler?.userId ?? 0;

  const { data: sideActions = [], isLoading: listLoading, isError: listError, error: listErr } =
    useQuery({
      queryKey: ['liveSideActions', tournamentId, eventId],
      queryFn: () =>
        SideActionsAPI.getSideActions({
          tournament_id: tournamentId,
          event_id: eventId,
          active_only: true,
        }),
      enabled: isOpen && tournamentId > 0 && eventId > 0,
      staleTime: 15_000,
    });

  const trackable = useMemo(
    () =>
      sideActions.filter(
        (sa) =>
          sa.side_action_type === SideActionType.HIGH_GAME ||
          sa.side_action_type === SideActionType.HIGH_SET ||
          sa.side_action_type === SideActionType.ELIMINATOR ||
          sa.side_action_type === SideActionType.MYSTERY_DOUBLES ||
          sa.side_action_type === SideActionType.MYSTERY_GAME ||
          sa.side_action_type === SideActionType.LOVE_DOUBLES ||
          sa.side_action_type === SideActionType.ALIBI_DOUBLES ||
          sa.side_action_type === SideActionType.BRACKET
      ),
    [sideActions]
  );

  const standingsQueries = useQueries({
    queries: trackable.map((sa) => ({
      queryKey: ['bowlerLiveSa', sa.id, sa.side_action_type, userId],
      enabled: isOpen && userId > 0,
      staleTime: 10_000,
      queryFn: async (): Promise<OutcomeLine[]> => {
        if (sa.side_action_type === SideActionType.BRACKET) {
          const detail = await SideActionsAPI.getSideAction(sa.id);
          const summary = summarizeBowlerBracketOutcomes(detail, userId);
          if (summary.potsEntered === 0) return [];

          const enabledPools = (detail.pools ?? []).filter((p) => p.is_enabled);
          const reports = (
            await Promise.all(
              enabledPools.map(async (pool) => {
                try {
                  return await SideActionsAPI.getBracketEngineFinancials(sa.id, pool.id);
                } catch {
                  return null;
                }
              })
            )
          ).filter((r): r is NonNullable<typeof r> => r != null);

          const payoutAmount = bowlerBracketPayoutFromReports(reports, userId);
          // Only show dollars from financials SSOT (same visibility path as TD reports).
          // Do not invent amounts from prize_distribution alone.
          const showMoney =
            reports.length > 0 &&
            sideActionStandingsShowMoney({
              collected: reports.reduce(
                (sum, r) => sum + Number(r.financials?.total_collected || 0),
                0
              ),
              prize_fund: reports.reduce(
                (sum, r) => sum + Number(r.financials?.winnings || 0),
                0
              ),
              rowPayouts: [payoutAmount],
            });

          return [
            {
              sideActionId: sa.id,
              name: sa.name,
              typeLabel: typeLabel(sa.side_action_type),
              detail: summary.detail,
              moneyLabel: showMoney ? moneyFromRow(payoutAmount, null) : undefined,
            },
          ];
        }

        if (sa.side_action_type === SideActionType.HIGH_GAME) {
          const data = await SideActionsAPI.getHighGameStandings(sa.id);
          const showMoney = sideActionStandingsShowMoney({
            money_visible: data.money_visible,
            collected: data.fund?.collected,
            prize_fund: data.fund?.prize_fund,
            rowPayouts: data.pools.flatMap((p) =>
              p.rows.flatMap((r) => [r.payout, r.provisional_payout])
            ),
          });
          const lines: OutcomeLine[] = [];
          for (const pool of data.pools) {
            for (const row of pool.rows) {
              if (row.user_id !== userId) continue;
              const placeBit = formatPlace(row.place);
              const scoreBit = row.score != null ? ` · ${row.score}` : '';
              const gameBit =
                row.game_number != null ? ` · Game ${row.game_number}` : '';
              lines.push({
                sideActionId: sa.id,
                name: sa.name,
                typeLabel: typeLabel(sa.side_action_type),
                detail: `${placeBit}${gameBit}${scoreBit}${pool.label ? ` · ${pool.label}` : ''}`,
                moneyLabel: showMoney
                  ? moneyFromRow(row.payout, row.provisional_payout)
                  : undefined,
              });
            }
          }
          return lines;
        }

        if (sa.side_action_type === SideActionType.HIGH_SET) {
          const data = await SideActionsAPI.getHighSetStandings(sa.id);
          const showMoney = sideActionStandingsShowMoney({
            money_visible: data.money_visible,
            collected: data.fund?.collected,
            prize_fund: data.fund?.prize_fund,
            rowPayouts: data.pools.flatMap((p) =>
              p.rows.flatMap((r) => [r.payout, r.provisional_payout])
            ),
          });
          const lines: OutcomeLine[] = [];
          for (const pool of data.pools) {
            for (const row of pool.rows) {
              if (row.user_id !== userId) continue;
              lines.push({
                sideActionId: sa.id,
                name: sa.name,
                typeLabel: typeLabel(sa.side_action_type),
                detail: `${formatPlace(row.place)} · Series ${row.score}${
                  pool.label ? ` · ${pool.label}` : ''
                }`,
                moneyLabel: showMoney
                  ? moneyFromRow(row.payout, row.provisional_payout)
                  : undefined,
              });
            }
          }
          return lines;
        }

        if (sa.side_action_type === SideActionType.ELIMINATOR) {
          const data = await SideActionsAPI.getEliminatorStandings(sa.id);
          const showMoney = sideActionStandingsShowMoney({
            money_visible: data.money_visible,
            collected: data.fund?.collected,
            prize_fund: data.fund?.prize_fund,
            rowPayouts: data.pools.flatMap((p) =>
              p.rounds.flatMap((r) =>
                r.rows.flatMap((row) => [row.payout, row.provisional_payout])
              )
            ),
          });
          const lines: OutcomeLine[] = [];
          for (const pool of data.pools) {
            const potComplete = Boolean(pool.is_complete);
            // Prefer the bowler's latest appearance across rounds (elimination or payout).
            let latest: {
              place?: number | null;
              rank?: number | null;
              status?: string | null;
              score?: number | null;
              payout?: number | null;
              provisional_payout?: number | null;
              role?: string | null;
            } | null = null;
            for (const round of pool.rounds) {
              for (const row of round.rows) {
                if (row.user_id !== userId) continue;
                latest = {
                  place: row.place,
                  rank: row.rank,
                  status: row.status,
                  score: row.score,
                  payout: row.payout,
                  provisional_payout: row.provisional_payout,
                  role: round.role,
                };
              }
            }
            if (!latest) continue;
            const rawStatus = String(latest.status || '').toLowerCase();
            let statusLabel = '';
            if (rawStatus === 'eliminated') {
              statusLabel = 'Eliminated';
            } else if (rawStatus === 'alive') {
              statusLabel = potComplete || latest.role === 'payout' ? 'Finished' : 'Alive';
            } else if (latest.status) {
              statusLabel = String(latest.status);
            }
            const statusBit = statusLabel ? ` · ${statusLabel}` : '';
            lines.push({
              sideActionId: sa.id,
              name: sa.name,
              typeLabel: typeLabel(sa.side_action_type),
              detail: `${formatPlace(latest.place ?? latest.rank)}${statusBit}${
                latest.score != null ? ` · ${latest.score}` : ''
              }${pool.squad_name ? ` · ${pool.squad_name}` : ''}`,
              moneyLabel: showMoney
                ? moneyFromRow(latest.payout, latest.provisional_payout)
                : undefined,
            });
          }
          return lines;
        }

        if (sa.side_action_type === SideActionType.MYSTERY_DOUBLES) {
          const data = await SideActionsAPI.getMysteryDoublesStandings(sa.id);
          const showMoney = sideActionStandingsShowMoney({
            money_visible: data.money_visible,
            collected: data.fund?.collected,
            prize_fund: data.fund?.prize_fund,
            rowPayouts: data.pools.flatMap((p) =>
              p.rows.flatMap((r) => [r.payout, r.provisional_payout])
            ),
          });
          const lines: OutcomeLine[] = [];
          for (const pool of data.pools) {
            for (const row of pool.rows) {
              if (row.user_id_a !== userId && row.user_id_b !== userId) continue;
              lines.push({
                sideActionId: sa.id,
                name: sa.name,
                typeLabel: typeLabel(sa.side_action_type),
                detail: `${formatPlace(row.place)} · ${row.display_name} · ${row.score}${
                  pool.label ? ` · ${pool.label}` : ''
                }`,
                moneyLabel: showMoney
                  ? moneyFromRow(row.payout, row.provisional_payout)
                  : undefined,
              });
            }
          }
          return lines;
        }

        if (sa.side_action_type === SideActionType.MYSTERY_GAME) {
          const data = await SideActionsAPI.getMysteryGameStandings(sa.id);
          const showMoney = sideActionStandingsShowMoney({
            money_visible: data.money_visible,
            collected: Number(data.fund?.collected ?? 0),
            prize_fund: Number(data.fund?.prize_fund ?? 0),
            rowPayouts: data.pools.flatMap((p) =>
              p.rows.flatMap((r) => [r.payout, r.provisional_payout])
            ),
          });
          const lines: OutcomeLine[] = [];
          for (const pool of data.pools) {
            for (const row of pool.rows) {
              if (row.user_id !== userId) continue;
              const targetBit =
                pool.target_score != null ? ` · mystery ${pool.target_score}` : '';
              lines.push({
                sideActionId: sa.id,
                name: sa.name,
                typeLabel: typeLabel(sa.side_action_type),
                detail: `${formatPlace(row.place)} · ${row.score}${targetBit}${
                  pool.label ? ` · ${pool.label}` : ''
                }`,
                moneyLabel: showMoney
                  ? moneyFromRow(row.payout, row.provisional_payout)
                  : undefined,
              });
            }
          }
          return lines;
        }

        if (sa.side_action_type === SideActionType.LOVE_DOUBLES) {
          const data = await SideActionsAPI.getLoveDoublesStandings(sa.id);
          const showMoney = sideActionStandingsShowMoney({
            money_visible: data.money_visible,
            collected: data.fund?.collected,
            prize_fund: data.fund?.prize_fund,
            rowPayouts: data.pools.flatMap((p) =>
              p.rows.flatMap((r) => [r.payout, r.provisional_payout])
            ),
          });
          const lines: OutcomeLine[] = [];
          for (const pool of data.pools) {
            for (const row of pool.rows) {
              if (row.user_id_a !== userId && row.user_id_b !== userId) continue;
              lines.push({
                sideActionId: sa.id,
                name: sa.name,
                typeLabel: typeLabel(sa.side_action_type),
                detail: `${formatPlace(row.place)} · ${row.display_name} · ${row.score}${
                  pool.label ? ` · ${pool.label}` : ''
                }`,
                moneyLabel: showMoney
                  ? moneyFromRow(row.payout, row.provisional_payout)
                  : undefined,
              });
            }
          }
          return lines;
        }

        if (sa.side_action_type === SideActionType.ALIBI_DOUBLES) {
          const data = await SideActionsAPI.getAlibiDoublesStandings(sa.id);
          const showMoney = sideActionStandingsShowMoney({
            money_visible: data.money_visible,
            collected: data.fund?.collected,
            prize_fund: data.fund?.prize_fund,
            rowPayouts: data.pools.flatMap((p) =>
              p.rows.flatMap((r) => [r.payout, r.provisional_payout])
            ),
          });
          const lines: OutcomeLine[] = [];
          for (const pool of data.pools) {
            for (const row of pool.rows) {
              if (row.user_id_a !== userId && row.user_id_b !== userId) continue;
              lines.push({
                sideActionId: sa.id,
                name: sa.name,
                typeLabel: typeLabel(sa.side_action_type),
                detail: `${formatPlace(row.place)} · ${row.display_name} · ${row.score}${
                  pool.label ? ` · ${pool.label}` : ''
                }`,
                moneyLabel: showMoney
                  ? moneyFromRow(row.payout, row.provisional_payout)
                  : undefined,
              });
            }
          }
          return lines;
        }

        return [];
      },
    })),
  });

  const outcomes = standingsQueries.flatMap((q) => q.data ?? []);
  const standingsLoading = standingsQueries.some((q) => q.isLoading || q.isFetching);
  const standingsError = standingsQueries.find((q) => q.isError);

  const byAction = useMemo(() => {
    const map = new Map<number, { sa: SideAction; lines: OutcomeLine[] }>();
    for (const sa of trackable) {
      map.set(sa.id, { sa, lines: [] });
    }
    for (const line of outcomes) {
      const bucket = map.get(line.sideActionId);
      if (bucket) bucket.lines.push(line);
    }
    return [...map.values()].filter((b) => b.lines.length > 0);
  }, [trackable, outcomes]);

  return (
    <Modal
      isOpen={isOpen && bowler != null}
      onClose={onClose}
      title={bowler ? `${bowler.displayName} — Side actions` : 'Side actions'}
      size="medium"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Active pots and results for this bowler. Dollar amounts appear only when you are
          entitled to see event side-action money.
        </p>

        {(listLoading || standingsLoading) && <Loading />}
        {listError && (
          <Alert
            variant="error"
            message={getErrorMessage(listErr, 'Could not load side actions.')}
          />
        )}
        {standingsError?.error && (
          <Alert
            variant="error"
            message={getErrorMessage(standingsError.error, 'Could not load standings.')}
          />
        )}

        {!listLoading && !standingsLoading && byAction.length === 0 && (
          <p className="text-sm text-text-muted">No side-action results for this bowler yet.</p>
        )}

        {byAction.map(({ sa, lines }) => (
          <section key={sa.id} className="space-y-2">
            <h3 className="text-sm font-semibold text-text">
              {sa.name}{' '}
              <span className="font-normal text-text-muted">· {typeLabel(sa.side_action_type)}</span>
            </h3>
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface-light overflow-hidden">
              {lines.map((line, idx) => (
                <li
                  key={`${line.sideActionId}-${idx}`}
                  className="px-3 py-2 text-sm text-text flex flex-col sm:flex-row sm:justify-between gap-1"
                >
                  <span>{line.detail}</span>
                  {line.moneyLabel ? (
                    <span className="text-text-muted tabular-nums">{line.moneyLabel}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
};

export default BowlerLiveSideActionsSheet;
