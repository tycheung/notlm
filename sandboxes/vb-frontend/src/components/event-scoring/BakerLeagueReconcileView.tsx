import React, { useMemo, useState } from 'react';
import type { GameRead } from '../../types/game';
import type { RoundParticipant } from '../../types/round';
import type { TeamScoringMode } from '../../hooks/useScoringTabMode';
import {
  buildBakerLeagueReconcileRows,
  sortBakerLeagueReconcileRows,
  type BakerLeagueReconcileSort,
  type BakerLeagueReconcileTeam,
} from '../../utils/bakerLeagueReconcile';

interface SquadCategory {
  id: string;
  name: string;
  participants: BakerLeagueReconcileTeam[];
}

interface BakerLeagueReconcileViewProps {
  squadCategories: SquadCategory[];
  allGames: GameRead[];
  gameCount: number;
  scheduledGames?: number | null;
  positionRoundGame?: number | null;
  roundParticipants?: RoundParticipant[];
  bonusPinsByTeamId?: Map<number, number> | Record<number, number>;
  teamScoringMode: TeamScoringMode;
}

const resultClass: Record<'W' | 'L' | 'T', string> = {
  W: 'text-green-400',
  L: 'text-red-400',
  T: 'text-amber-300',
};

const BakerLeagueReconcileView: React.FC<BakerLeagueReconcileViewProps> = ({
  squadCategories,
  allGames,
  gameCount,
  scheduledGames,
  positionRoundGame,
  roundParticipants,
  bonusPinsByTeamId,
  teamScoringMode,
}) => {
  const [sortBy, setSortBy] = useState<BakerLeagueReconcileSort>('place');

  const teams = useMemo(
    () =>
      squadCategories
        .filter((category) => category.id !== 'unassigned')
        .flatMap((category) => category.participants),
    [squadCategories]
  );

  const baseRows = useMemo(
    () =>
      buildBakerLeagueReconcileRows({
        teams,
        allGames,
        gameCount,
        scheduledGames,
        positionRoundGame,
        roundParticipants,
        bonusPinsByTeamId,
      }),
    [
      teams,
      allGames,
      gameCount,
      scheduledGames,
      positionRoundGame,
      roundParticipants,
      bonusPinsByTeamId,
    ]
  );

  const rows = useMemo(
    () => sortBakerLeagueReconcileRows(baseRows, sortBy),
    [baseRows, sortBy]
  );

  const totalGames = rows[0]?.cells.length ?? Math.max(0, scheduledGames ?? gameCount);

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-surface-light px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">League Reconcile</h3>
            <p className="mt-1 text-xs text-text-muted">
              Read-only matchup audit by game. Use Entry view to edit scores.
              {teamScoringMode !== 'team'
                ? ' Team outcomes always use the Baker team shell.'
                : ''}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as BakerLeagueReconcileSort)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text"
            >
              <option value="place">Place</option>
              <option value="team_number">Team Number</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-primary">
            <tr>
              <th className="sticky left-0 z-10 bg-primary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text">
                Team
              </th>
              {Array.from({ length: totalGames }, (_, idx) => idx + 1).map((gameNumber) => (
                <th
                  key={gameNumber}
                  className="min-w-[7rem] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text"
                >
                  Game {gameNumber}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text">
                Record
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text">
                Bonus
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text">
                Total Pinfall
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text">
                Pinfall + Bonus
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {rows.map((row) => (
              <tr key={row.teamId}>
                <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-4 py-3 align-top">
                  <div className="text-sm font-semibold text-text">{row.teamLabel}</div>
                  <div className="text-xs text-text-muted">
                    {row.teamNumber ? `Team ${row.teamNumber}` : `ID ${row.teamId}`}
                  </div>
                </td>
                {row.cells.map((cell) => (
                  <td key={`${row.teamId}-${cell.gameNumber}`} className="px-3 py-3 text-center align-top">
                    <div className="text-sm font-semibold tabular-nums text-text">
                      {cell.score ?? '—'}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        cell.result ? resultClass[cell.result] : 'text-text-muted'
                      }`}
                    >
                      {cell.result ?? '—'}
                    </div>
                    <div className="mt-1 text-[11px] text-text-muted">
                      {cell.opponentLabel ? `vs ${cell.opponentLabel}` : 'No matchup'}
                    </div>
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <div className="text-sm font-semibold tabular-nums text-text">
                    {row.wins}-{row.losses}
                    {row.ties > 0 ? `-${row.ties}` : ''}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <div className="text-sm font-semibold tabular-nums text-text">
                    {row.bonusPins || '—'}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <div className="text-sm font-semibold tabular-nums text-text">
                    {row.totalPinfall || '—'}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <div className="text-sm font-semibold tabular-nums text-text">
                    {row.totalWithBonus || '—'}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={totalGames + 5}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No assigned teams available for reconcile view yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BakerLeagueReconcileView;
