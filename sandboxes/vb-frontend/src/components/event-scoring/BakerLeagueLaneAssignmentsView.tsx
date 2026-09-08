import React, { useMemo, useState } from 'react';
import type { GameRead } from '../../types/game';
import type { RoundParticipant } from '../../types/round';
import type { LanePair } from '../../features/lanes/types';
import {
  buildBakerLeagueLaneRows,
  sortBakerLeagueLaneRows,
  type BakerLeagueLaneSort,
  type BakerLeagueLaneTeam,
} from '../../utils/bakerLeagueLaneAssignments';

interface SquadCategory {
  id: string;
  name: string;
  participants: BakerLeagueLaneTeam[];
}

interface BakerLeagueLaneAssignmentsViewProps {
  squadCategories: SquadCategory[];
  allGames: GameRead[];
  gameCount: number;
  scheduledGames?: number | null;
  laneLabelLookup?: Map<string, string>;
  roundParticipants?: RoundParticipant[];
  previewLanesByTeamId?: Map<number, Array<number | null>>;
  positionRoundGame?: number | null;
  positionRoundLanePlacement?: string | null;
  pairsInPlay?: LanePair[] | null;
  roundId?: number | null;
  emptyHint?: string | null;
}

const BakerLeagueLaneAssignmentsView: React.FC<BakerLeagueLaneAssignmentsViewProps> = ({
  squadCategories,
  allGames,
  gameCount,
  scheduledGames,
  laneLabelLookup,
  roundParticipants,
  previewLanesByTeamId,
  positionRoundGame,
  positionRoundLanePlacement,
  pairsInPlay,
  roundId,
  emptyHint,
}) => {
  const [sortBy, setSortBy] = useState<BakerLeagueLaneSort>('standings');
  const [sortGame, setSortGame] = useState(1);

  const teams = useMemo(
    () =>
      squadCategories
        .filter((category) => category.id !== 'unassigned')
        .flatMap((category) => category.participants),
    [squadCategories]
  );

  const baseRows = useMemo(
    () =>
      buildBakerLeagueLaneRows({
        teams,
        allGames,
        gameCount,
        scheduledGames,
        laneLabelLookup,
        roundParticipants,
        previewLanesByTeamId,
        positionRoundGame,
        positionRoundLanePlacement,
        pairsInPlay,
        roundId,
      }),
    [
      teams,
      allGames,
      gameCount,
      scheduledGames,
      laneLabelLookup,
      roundParticipants,
      previewLanesByTeamId,
      positionRoundGame,
      positionRoundLanePlacement,
      pairsInPlay,
      roundId,
    ]
  );

  const totalGames = baseRows[0]?.lanesByGame.length ?? Math.max(0, scheduledGames ?? gameCount);

  const effectiveSortGame = Math.min(Math.max(1, sortGame), Math.max(1, totalGames));

  const rows = useMemo(
    () => sortBakerLeagueLaneRows(baseRows, sortBy, effectiveSortGame),
    [baseRows, sortBy, effectiveSortGame]
  );

  const hasAnyLane = rows.some((row) => row.lanesByGame.some((lane) => lane != null));

  const sortByLaneForGame = (gameNumber: number) => {
    setSortGame(gameNumber);
    setSortBy('lane');
  };

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-surface-light px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">Lane Assignments</h3>
            <p className="mt-1 text-xs text-text-muted">
              Read-only lane per team per game from opening seats + league movement.
              Click a game column header to sort by that game&apos;s lane.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <label className="flex items-center gap-2">
              <span>Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as BakerLeagueLaneSort)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text"
              >
                <option value="standings">Standings</option>
                <option value="team">Team Number</option>
                <option value="lane">Lane</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span>Lane game</span>
              <select
                value={effectiveSortGame}
                onChange={(e) => {
                  setSortGame(Number(e.target.value));
                  setSortBy('lane');
                }}
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text"
              >
                {Array.from({ length: Math.max(1, totalGames) }, (_, idx) => idx + 1).map(
                  (gn) => (
                    <option key={gn} value={gn}>
                      Game {gn}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-primary">
            <tr>
              <th className="sticky left-0 z-10 bg-primary px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text">
                Pl
              </th>
              <th className="sticky left-10 z-10 bg-primary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text">
                Team
              </th>
              {Array.from({ length: totalGames }, (_, idx) => idx + 1).map((gameNumber) => {
                const isSortGame =
                  sortBy === 'lane' && gameNumber === effectiveSortGame;
                const isPosition =
                  positionRoundGame != null &&
                  Number(positionRoundGame) === gameNumber;
                return (
                  <th
                    key={gameNumber}
                    className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text ${
                      isSortGame ? 'bg-primary-light/40' : ''
                    }`}
                  >
                    <button
                      type="button"
                      title={`Sort by lane for game ${gameNumber}`}
                      onClick={() => sortByLaneForGame(gameNumber)}
                      className={`rounded px-1.5 py-0.5 transition-colors hover:bg-surface/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface ${
                        isSortGame ? 'bg-surface/25 text-text' : ''
                      }`}
                    >
                      G{gameNumber}
                      {isPosition ? '*' : ''}
                      {isSortGame ? ' ↓' : ''}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(1, totalGames) + 2}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No teams to show.
                </td>
              </tr>
            ) : !hasAnyLane ? (
              <tr>
                <td
                  colSpan={Math.max(1, totalGames) + 2}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  {emptyHint ||
                    'No lane seats yet. Assign teams on the Lane Assignments tab (and Apply to lane assignments from Format if using league movement), then return here.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.teamId} className="hover:bg-surface-light/40">
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-center text-sm tabular-nums text-text-muted">
                    {row.standingPlace ?? '—'}
                  </td>
                  <td className="sticky left-10 z-10 whitespace-nowrap bg-surface px-4 py-2.5 text-sm text-text">
                    <span className="font-medium">{row.teamLabel}</span>
                    {row.teamNumber != null ? (
                      <span className="ml-2 text-xs text-text-muted">#{row.teamNumber}</span>
                    ) : null}
                  </td>
                  {row.lanesByGame.map((lane, idx) => (
                    <td
                      key={`${row.teamId}-${idx + 1}`}
                      className={`px-3 py-2.5 text-center text-sm tabular-nums ${
                        sortBy === 'lane' && idx + 1 === effectiveSortGame
                          ? 'bg-accent/10 font-semibold text-text'
                          : 'text-text-muted'
                      }`}
                    >
                      {lane ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BakerLeagueLaneAssignmentsView;
