import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import Alert from '../../common/Alert';
import TableSearchInput from '../../common/TableSearchInput';
import SortableHeaderCell from '../../common/SortableHeaderCell';
import { SortDirection, toggleSortDirection } from '../../common/tableSort';
import { useRoundLiveScores } from '../../../hooks/useRoundLiveScores';
import { roundRelationshipApi } from '../../../services/roundRelationshipApi';
import { getCompetitionMethodDisplayLabel } from '../../../utils/competitionMethodDisplay';
import { formatDateTimeNaive } from '../../../utils/dateUtils';
import { normalizeLiveAsOf } from '../../../utils/liveScoresCdn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type {
  EventRoundLiveScoresSnapshot,
  RoundLiveGameRow,
  RoundLiveMatchBlock,
  RoundLiveMemberRow,
  RoundLiveParticipantRow,
  RoundLiveSquad,
  RoundLiveTeamRow,
} from '../../../types/event';
import BowlerLiveSideActionsSheet, {
  type BowlerLiveSelection,
} from '../../side_actions/BowlerLiveSideActionsSheet';
import MatchDiagramShell from '../../match-play-diagram/shared/MatchDiagramShell';
import type { MatchBlockParticipant } from '../../match-play-diagram/shared/MatchBlock';

interface RoundLiveScoresModalProps {
  eventId: number;
  /** When set, tapping a bowler opens their live side-action outcomes. */
  tournamentId?: number;
  roundId: number | null;
  isOpen: boolean;
  onClose: () => void;
  /** When false, live SSE cannot authenticate; show director guidance. Undefined while event loads. */
  eventPublished?: boolean;
  /** Render scores inline (no modal chrome) for bowler Results standings. */
  embedded?: boolean;
  /**
   * When true (handicap event), standings sort/total use handicap totals.
   * When false (scratch event), use scratch pinfall.
   */
  useHandicapScoring?: boolean;
}

type LiveSortColumn = 'name' | 'total' | 'average';

function gameNumbersForCount(gameCount: number): number[] {
  return Array.from({ length: Math.max(0, gameCount) }, (_, i) => i + 1);
}

function getGameByNumber(games: RoundLiveGameRow[], num: number): RoundLiveGameRow | undefined {
  return games.find((g) => g.game_number === num);
}

function displayHandicapFromGames(games: RoundLiveGameRow[]): string {
  const h = games.map((g) => g.handicap).find((x) => x != null);
  return h != null ? String(h) : '—';
}

function averageScratchNumeric(games: RoundLiveGameRow[]): number {
  const withScore = games.filter((g) => g.score != null);
  if (!withScore.length) return -1;
  const sum = withScore.reduce((s, g) => s + (g.score as number), 0);
  return Math.round(sum / withScore.length);
}

function averageScratchDisplay(games: RoundLiveGameRow[]): string {
  const n = averageScratchNumeric(games);
  return n < 0 ? '—' : String(n);
}

function scratchTotalNumeric(games: RoundLiveGameRow[]): number {
  const hasAny = games.some((g) => g.score != null);
  if (!hasAny) return -1;
  return games.reduce((sum, g) => sum + (g.score ?? 0), 0);
}

function handicapOrScratchTotalNumeric(
  games: RoundLiveGameRow[],
  rowTotalScore: number | undefined,
  useHandicap: boolean,
  rowPinfall?: number
): number {
  const hasAny = games.some((g) => g.score != null || g.total_score != null);
  if (!hasAny) return -1;
  if (useHandicap) {
    return rowTotalScore ?? 0;
  }
  if (rowPinfall != null) return rowPinfall;
  return scratchTotalNumeric(games);
}

function totalNumericParticipant(
  p: RoundLiveParticipantRow,
  useHandicap: boolean
): number {
  return handicapOrScratchTotalNumeric(
    p.games,
    p.total_score,
    useHandicap,
    p.total_pinfall
  );
}

function totalNumericMember(m: RoundLiveMemberRow, useHandicap: boolean): number {
  return handicapOrScratchTotalNumeric(
    m.games,
    m.total_score,
    useHandicap,
    m.total_pinfall
  );
}

function formatParticipantTotal(
  p: RoundLiveParticipantRow,
  useHandicap: boolean
): string {
  const n = totalNumericParticipant(p, useHandicap);
  return n < 0 ? '—' : String(n);
}

function formatMemberTotal(m: RoundLiveMemberRow, useHandicap: boolean): string {
  const n = totalNumericMember(m, useHandicap);
  return n < 0 ? '—' : String(n);
}

function formatGameCell(g: RoundLiveGameRow | undefined, useHandicap: boolean): string {
  if (!g) return '—';
  if (useHandicap) {
    if (g.total_score != null) return String(g.total_score);
    if (g.score != null) return String(g.score);
    return '—';
  }
  if (g.score != null) return String(g.score);
  return '—';
}

function dylgGameClassName(g: RoundLiveGameRow | undefined): string {
  if (!g) return '';
  if (g.dylg_dropped) return 'line-through text-text-muted opacity-70';
  if (g.dylg_candidate) return 'font-semibold text-amber-800';
  return '';
}

function GameScoreCell({
  g,
  useHandicap,
}: {
  g: RoundLiveGameRow | undefined;
  useHandicap: boolean;
}) {
  const extra = dylgGameClassName(g);
  return <span className={extra || undefined}>{formatGameCell(g, useHandicap)}</span>;
}

/** Missing numeric scores (-1) sort after real values in both directions. */
function compareNumericScore(a: number, b: number, dir: SortDirection): number {
  const missA = a < 0;
  const missB = b < 0;
  if (missA && missB) return 0;
  if (missA) return 1;
  if (missB) return -1;
  const m = dir === 'asc' ? 1 : -1;
  return m * (a - b);
}

function sortAriaSort(column: LiveSortColumn, active: LiveSortColumn, dir: SortDirection): 'none' | 'ascending' | 'descending' {
  return active === column ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
}

function filterParticipantsBySearch(participants: RoundLiveParticipantRow[], q: string): RoundLiveParticipantRow[] {
  if (!q.trim()) return participants;
  const ql = q.trim().toLowerCase();
  return participants.filter((p) => p.display_name.toLowerCase().includes(ql));
}

function sortParticipants(
  participants: RoundLiveParticipantRow[],
  col: LiveSortColumn,
  dir: SortDirection,
  useHandicap: boolean
): RoundLiveParticipantRow[] {
  const copy = [...participants];
  copy.sort((a, b) => {
    if (col === 'name') {
      const c = a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
      return dir === 'asc' ? c : -c;
    }
    if (col === 'total') {
      const ta = totalNumericParticipant(a, useHandicap);
      const tb = totalNumericParticipant(b, useHandicap);
      const primary = compareNumericScore(ta, tb, dir);
      if (primary !== 0) return primary;
      return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
    }
    if (col === 'average') {
      const aa = averageScratchNumeric(a.games);
      const ab = averageScratchNumeric(b.games);
      const primary = compareNumericScore(aa, ab, dir);
      if (primary !== 0) return primary;
      return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
    }
    return 0;
  });
  return copy;
}

function teamTotalNumeric(team: RoundLiveTeamRow, useHandicap: boolean): number {
  const base = handicapOrScratchTotalNumeric(
    team.games,
    team.total_score,
    useHandicap,
    team.total_pinfall
  );
  if (base < 0) return -1;
  if (team.total_with_bonus != null && Number.isFinite(Number(team.total_with_bonus))) {
    return Number(team.total_with_bonus);
  }
  return base + Number(team.bonus_pins || 0);
}

function formatTeamRecord(team: RoundLiveTeamRow): string {
  const w = Number(team.match_wins || 0);
  const l = Number(team.match_losses || 0);
  const t = Number(team.match_ties || 0);
  if (team.series_record && String(team.series_record).trim()) {
    return String(team.series_record);
  }
  return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
}

function teamAverageNumeric(team: RoundLiveTeamRow): number {
  return averageScratchNumeric(team.games);
}

function filterMembersForTeam(team: RoundLiveTeamRow, q: string): RoundLiveMemberRow[] {
  const members = team.members ?? [];
  if (!q.trim()) return members;
  const ql = q.trim().toLowerCase();
  if (team.label.toLowerCase().includes(ql)) return members;
  return members.filter((m) => m.display_name.toLowerCase().includes(ql));
}

function teamMatchesSearch(team: RoundLiveTeamRow, q: string): boolean {
  if (!q.trim()) return true;
  const ql = q.trim().toLowerCase();
  if (team.label.toLowerCase().includes(ql)) return true;
  return (team.members ?? []).some((m) => m.display_name.toLowerCase().includes(ql));
}

function displayNumericGameTotal(g: RoundLiveGameRow): string {
  if (g.total_score != null) return String(g.total_score);
  if (g.score != null) return String(g.score);
  return '—';
}

function matchBlockMatchesSearch(block: RoundLiveMatchBlock, q: string): boolean {
  if (!q.trim()) return true;
  const ql = q.trim().toLowerCase();
  if ((block.label || '').toLowerCase().includes(ql)) return true;
  return (block.sides ?? []).some((s) => s.display_name.toLowerCase().includes(ql));
}

/** Prefer round.game_count, but never clip below the highest game_number in the payload. */
function effectiveGameCount(data: EventRoundLiveScoresSnapshot | null | undefined): number {
  const declared = data?.round?.game_count ?? 0;
  let maxSeen = 0;
  for (const squad of data?.squads ?? []) {
    for (const p of squad.participants ?? []) {
      for (const g of p.games ?? []) {
        maxSeen = Math.max(maxSeen, Number(g.game_number) || 0);
      }
    }
    for (const t of squad.teams ?? []) {
      for (const g of t.games ?? []) {
        maxSeen = Math.max(maxSeen, Number(g.game_number) || 0);
      }
    }
  }
  return Math.max(declared, maxSeen);
}

function MatchPlayLiveSection({
  matches,
  searchQuery,
}: {
  matches: RoundLiveMatchBlock[];
  searchQuery: string;
}) {
  const filtered = matches.filter((m) => matchBlockMatchesSearch(m, searchQuery));
  if (!filtered.length) {
    return (
      <p className="text-sm text-text-muted text-center py-4">
        No matches match your search.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text border-b border-border pb-1">
        Match play
      </h3>
      {filtered.map((m) => {
        const side0 = m.sides.find((s) => s.side === 0);
        const side1 = m.sides.find((s) => s.side === 1);
        const title = m.label?.trim() || `Match ${m.id}`;
        const done = m.status === 'complete' || m.winner_side != null;
        return (
          <div
            key={m.id}
            className="rounded-lg border border-border bg-surface-light p-4 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text">{title}</p>
                <p className="text-xs text-text-muted">
                  {Number(m.race_to_wins) === 1 && Number(m.max_games) > 1
                    ? `${m.max_games}-game total`
                    : `Race to ${m.race_to_wins} · Up to ${m.max_games} games`}
                  {m.bracket_template ? ` · ${m.bracket_template}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums">
                  {m.wins_side_0}–{m.wins_side_1}
                </p>
                <p className="text-xs text-text-muted capitalize">
                  {m.status}
                  {done && m.winner_side != null && (
                    <span className="ml-1">
                      · Winner: {m.winner_side === 0 ? side0?.display_name : side1?.display_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="min-w-[120px]">
                <span className="text-text-muted text-xs block">Side 0</span>
                <span className="font-medium">{side0?.display_name ?? '—'}</span>
              </div>
              <div className="min-w-[120px]">
                <span className="text-text-muted text-xs block">Side 1</span>
                <span className="font-medium">{side1?.display_name ?? '—'}</span>
              </div>
            </div>
            {(m.games_by_index?.length ?? 0) > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border">
                      <th className="py-1 pr-2">Game</th>
                      <th className="py-1 pr-2">{side0?.display_name ?? 'Side 0'}</th>
                      <th className="py-1">{side1?.display_name ?? 'Side 1'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.games_by_index.map((row) => {
                      const g0 = row.games[0];
                      const g1 = row.games[1];
                      return (
                        <tr key={row.match_game_index} className="border-b border-border/60">
                          <td className="py-1.5 pr-2 font-medium">{row.match_game_index}</td>
                          <td className="py-1.5 pr-2 tabular-nums">
                            {g0 ? displayNumericGameTotal(g0) : '—'}
                          </td>
                          <td className="py-1.5 tabular-nums">
                            {g1 ? displayNumericGameTotal(g1) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function sideScoresForLiveMatch(
  match: RoundLiveMatchBlock,
  side: 0 | 1
): MatchBlockParticipant['scores'] {
  const rows = match.games_by_index ?? [];
  if (!rows.length) {
    return [{ gameIndex: 0, score: null, gameId: null, disabled: true }];
  }
  return rows.map((row, idx) => {
    const g = row.games[side];
    const score =
      g?.score != null ? Number(g.score) : g?.total_score != null ? Number(g.total_score) : null;
    return {
      gameIndex: idx,
      score: Number.isFinite(score as number) ? (score as number) : null,
      gameId: null,
      disabled: true,
    };
  });
}

function StepladderLiveSection({
  matches,
  searchQuery,
}: {
  matches: RoundLiveMatchBlock[];
  searchQuery: string;
}) {
  const filtered = matches.filter((m) => matchBlockMatchesSearch(m, searchQuery));
  if (!filtered.length) {
    return (
      <p className="text-sm text-text-muted text-center py-4">
        No stepladder matches match your search.
      </p>
    );
  }

  const allComplete = filtered.every(
    (m) => String(m.status).toLowerCase() === 'complete' || m.winner_side != null
  );
  const last = filtered[filtered.length - 1];
  const champSide =
    last?.winner_side != null
      ? last.sides.find((s) => s.side === last.winner_side)
      : null;

  const columns = filtered.map((m, idx) => {
    const side0 = m.sides.find((s) => s.side === 0);
    const side1 = m.sides.find((s) => s.side === 1);
    const done = String(m.status).toLowerCase() === 'complete' || m.winner_side != null;
    const header = done
      ? `${m.label?.trim() || `Match ${idx + 1}`} · Complete`
      : m.label?.trim() || `Match ${idx + 1}`;
    const participants: [MatchBlockParticipant, MatchBlockParticipant] = [
      {
        side: 0,
        name: side0?.display_name,
        isWinner: m.winner_side === 0,
        isTbd: !side0?.display_name,
        scores: sideScoresForLiveMatch(m, 0),
      },
      {
        side: 1,
        name: side1?.display_name,
        isWinner: m.winner_side === 1,
        isTbd: !side1?.display_name,
        scores: sideScoresForLiveMatch(m, 1),
      },
    ];
    return {
      key: `sl-${m.id}`,
      header,
      matches: [
        {
          key: String(m.id),
          label: null,
          status: m.status,
          winsLabel: `${m.wins_side_0}–${m.wins_side_1}`,
          participants,
        },
      ],
    };
  });

  return (
    <div className="space-y-3">
      <MatchDiagramShell
        title="Stepladder"
        statusPill={allComplete ? 'Complete' : 'In progress'}
        subtitle={
          allComplete
            ? champSide?.display_name
              ? `Champion: ${champSide.display_name}`
              : 'All ladder matches are complete.'
            : 'Climb matches left to right. Advancers are highlighted.'
        }
        columns={columns}
        minWidth={Math.max(640, columns.length * 240)}
      />
    </div>
  );
}

function sortMembers(
  members: RoundLiveMemberRow[],
  col: LiveSortColumn,
  dir: SortDirection,
  useHandicap: boolean
): RoundLiveMemberRow[] {
  const copy = [...members];
  copy.sort((a, b) => {
    if (col === 'name') {
      const c = a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
      return dir === 'asc' ? c : -c;
    }
    if (col === 'total') {
      const ta = totalNumericMember(a, useHandicap);
      const tb = totalNumericMember(b, useHandicap);
      const primary = compareNumericScore(ta, tb, dir);
      if (primary !== 0) return primary;
      return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
    }
    if (col === 'average') {
      const aa = averageScratchNumeric(a.games);
      const ab = averageScratchNumeric(b.games);
      const primary = compareNumericScore(aa, ab, dir);
      if (primary !== 0) return primary;
      return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
    }
    return 0;
  });
  return copy;
}

function sortTeams(
  teams: RoundLiveTeamRow[],
  col: LiveSortColumn,
  dir: SortDirection,
  useHandicap: boolean
): RoundLiveTeamRow[] {
  const copy = [...teams];
  copy.sort((a, b) => {
    if (col === 'name') {
      const c = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
      return dir === 'asc' ? c : -c;
    }
    if (col === 'total') {
      const ta = teamTotalNumeric(a, useHandicap);
      const tb = teamTotalNumeric(b, useHandicap);
      const primary = compareNumericScore(ta, tb, dir);
      if (primary !== 0) return primary;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    }
    if (col === 'average') {
      const aa = teamAverageNumeric(a);
      const ab = teamAverageNumeric(b);
      const primary = compareNumericScore(aa, ab, dir);
      if (primary !== 0) return primary;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    }
    return 0;
  });
  return copy;
}

function LiveParticipantTable({
  participants,
  gameCount,
  sortColumn,
  sortDirection,
  onSortToggle,
  onBowlerClick,
  useHandicap,
}: {
  participants: RoundLiveParticipantRow[];
  gameCount: number;
  sortColumn: LiveSortColumn;
  sortDirection: SortDirection;
  onSortToggle: (c: LiveSortColumn) => void;
  onBowlerClick?: (bowler: BowlerLiveSelection) => void;
  useHandicap: boolean;
}) {
  const nums = gameNumbersForCount(gameCount);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-surface-light">
          <tr>
            <th
              scope="col"
              aria-sort={sortAriaSort('name', sortColumn, sortDirection)}
              className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
            >
              <SortableHeaderCell
                label="Participant"
                columnKey="name"
                activeColumn={sortColumn}
                direction={sortDirection}
                onToggle={onSortToggle}
                className="text-xs font-medium text-text-muted"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
              Handicap
            </th>
            {nums.map((n) => (
              <th
                key={n}
                className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider"
              >
                Game {n}
              </th>
            ))}
            <th
              scope="col"
              aria-sort={sortAriaSort('total', sortColumn, sortDirection)}
              className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider"
            >
              <SortableHeaderCell
                label="Total"
                columnKey="total"
                activeColumn={sortColumn}
                direction={sortDirection}
                onToggle={onSortToggle}
                className="text-xs font-medium text-text-muted justify-center w-full"
              />
            </th>
            <th
              scope="col"
              aria-sort={sortAriaSort('average', sortColumn, sortDirection)}
              className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider"
            >
              <SortableHeaderCell
                label="Average"
                columnKey="average"
                activeColumn={sortColumn}
                direction={sortDirection}
                onToggle={onSortToggle}
                className="text-xs font-medium text-text-muted justify-center w-full"
              />
            </th>
          </tr>
        </thead>
        <tbody className="bg-surface divide-y divide-border">
          {participants.map((p) => (
            <tr key={p.participant_id}>
              <td className="px-4 py-3 whitespace-nowrap">
                {onBowlerClick && p.user_id ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline text-left"
                    onClick={() =>
                      onBowlerClick({
                        userId: p.user_id as number,
                        displayName: p.display_name,
                      })
                    }
                  >
                    {p.display_name}
                  </button>
                ) : (
                  <span className="text-sm font-medium text-text">{p.display_name}</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-text">{displayHandicapFromGames(p.games)}</td>
              {nums.map((n) => (
                <td key={n} className="px-4 py-3 whitespace-nowrap text-center text-sm tabular-nums text-text">
                  <GameScoreCell
                    g={getGameByNumber(p.games, n)}
                    useHandicap={useHandicap}
                  />
                </td>
              ))}
              <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium tabular-nums text-text">
                {formatParticipantTotal(p, useHandicap)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center text-sm tabular-nums text-text">
                {averageScratchDisplay(p.games)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveMemberRow({
  member,
  gameCount,
  onBowlerClick,
  useHandicap,
  showMatchRecord,
  showBonus,
}: {
  member: RoundLiveMemberRow;
  gameCount: number;
  onBowlerClick?: (bowler: BowlerLiveSelection) => void;
  useHandicap: boolean;
  showMatchRecord?: boolean;
  showBonus?: boolean;
}) {
  const nums = gameNumbersForCount(gameCount);
  return (
    <tr className="bg-surface-light/80">
      <td className="px-4 py-2 pl-8 whitespace-nowrap border-l-2 border-border">
        {onBowlerClick && member.user_id ? (
          <button
            type="button"
            className="text-sm text-primary hover:underline text-left"
            onClick={() =>
              onBowlerClick({
                userId: member.user_id as number,
                displayName: member.display_name,
              })
            }
          >
            {member.display_name}
          </button>
        ) : (
          <span className="text-sm text-text-muted">{member.display_name}</span>
        )}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-text-muted">{displayHandicapFromGames(member.games)}</td>
      {showMatchRecord ? <td className="px-4 py-2 text-center text-sm text-text-muted">—</td> : null}
      {nums.map((n) => (
        <td key={n} className="px-4 py-2 whitespace-nowrap text-center text-sm tabular-nums text-text-muted">
          <GameScoreCell
            g={getGameByNumber(member.games, n)}
            useHandicap={useHandicap}
          />
        </td>
      ))}
      {showBonus ? <td className="px-4 py-2 text-center text-sm text-text-muted">—</td> : null}
      <td className="px-4 py-2 whitespace-nowrap text-center text-sm tabular-nums text-text-muted">
        {formatMemberTotal(member, useHandicap)}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-center text-sm tabular-nums text-text-muted">
        {averageScratchDisplay(member.games)}
      </td>
    </tr>
  );
}

function LiveTeamBlock({
  team,
  gameCount,
  members,
  onBowlerClick,
  useHandicap,
  isBaker,
  showMatchRecord,
  showBonus,
}: {
  team: RoundLiveTeamRow;
  gameCount: number;
  members: RoundLiveMemberRow[];
  onBowlerClick?: (bowler: BowlerLiveSelection) => void;
  useHandicap: boolean;
  isBaker?: boolean;
  showMatchRecord?: boolean;
  showBonus?: boolean;
}) {
  const nums = gameNumbersForCount(gameCount);
  const teamTotal = teamTotalNumeric(team, useHandicap);
  const pinfall =
    team.total_pinfall != null
      ? Number(team.total_pinfall)
      : scratchTotalNumeric(team.games);
  const metaColSpan = 2 + (showMatchRecord ? 1 : 0) + (showBonus ? 1 : 0);
  return (
    <>
      <tr className="bg-surface">
        <td className="px-4 py-3 whitespace-nowrap" colSpan={2}>
          <span className="text-sm font-semibold text-text">{team.label}</span>
          <span className="ml-2 text-xs text-text-muted">Team</span>
        </td>
        {showMatchRecord ? (
          <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium tabular-nums text-text">
            {formatTeamRecord(team)}
          </td>
        ) : null}
        {nums.map((n) => (
          <td key={n} className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium tabular-nums text-text">
            <GameScoreCell
              g={getGameByNumber(team.games, n)}
              useHandicap={useHandicap}
            />
          </td>
        ))}
        {showBonus ? (
          <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium tabular-nums text-text">
            {Number(team.bonus_pins || 0)}
          </td>
        ) : null}
        <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium tabular-nums text-text">
          {teamTotal < 0 ? '—' : String(teamTotal)}
          {showBonus && pinfall >= 0 && Number(team.bonus_pins || 0) > 0 ? (
            <span className="block text-[10px] font-normal text-text-muted">
              {pinfall} + {Number(team.bonus_pins || 0)}
            </span>
          ) : null}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-text-muted">
          {averageScratchDisplay(team.games)}
        </td>
      </tr>
      {isBaker && members.length > 0 ? (
        <tr className="bg-surface-light/80">
          <td
            className="px-4 py-2 pl-8 text-sm text-text-muted border-l-2 border-border"
            colSpan={metaColSpan + nums.length + 2}
          >
            {members.map((m, i) => (
              <span key={m.participant_id}>
                {i > 0 ? <span className="text-text-dim"> · </span> : null}
                {onBowlerClick && m.user_id ? (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() =>
                      onBowlerClick({
                        userId: m.user_id as number,
                        displayName: m.display_name,
                      })
                    }
                  >
                    {m.display_name}
                  </button>
                ) : (
                  m.display_name
                )}
              </span>
            ))}
          </td>
        </tr>
      ) : (
        members.map((m) => (
          <LiveMemberRow
            key={m.participant_id}
            member={m}
            gameCount={gameCount}
            onBowlerClick={onBowlerClick}
            useHandicap={useHandicap}
            showMatchRecord={showMatchRecord}
            showBonus={showBonus}
          />
        ))
      )}
    </>
  );
}

function LiveSquadSection({
  squad,
  gameCount,
  expanded,
  onToggle,
  searchQuery,
  sortColumn,
  sortDirection,
  onSortToggle,
  onBowlerClick,
  useHandicap,
  isBaker,
  showMatchRecord,
  showBonus,
}: {
  squad: RoundLiveSquad;
  gameCount: number;
  expanded: boolean;
  onToggle: () => void;
  searchQuery: string;
  sortColumn: LiveSortColumn;
  sortDirection: SortDirection;
  onSortToggle: (c: LiveSortColumn) => void;
  onBowlerClick?: (bowler: BowlerLiveSelection) => void;
  useHandicap: boolean;
  isBaker?: boolean;
  showMatchRecord?: boolean;
  showBonus?: boolean;
}) {
  const hasParticipants = squad.participants && squad.participants.length > 0;
  const hasTeams = squad.teams && squad.teams.length > 0;

  const participantRows = useMemo(() => {
    if (!hasParticipants) return [];
    const filtered = filterParticipantsBySearch(squad.participants!, searchQuery);
    return sortParticipants(filtered, sortColumn, sortDirection, useHandicap);
  }, [hasParticipants, squad.participants, searchQuery, sortColumn, sortDirection, useHandicap]);

  const teamBlocks = useMemo(() => {
    if (!hasTeams) return [];
    const q = searchQuery.trim();
    let teams = squad.teams!.filter((t) => teamMatchesSearch(t, q));
    teams = sortTeams(teams, sortColumn, sortDirection, useHandicap);
    return teams.map((team) => {
      const rawMembers = filterMembersForTeam(team, searchQuery);
      const members = sortMembers(rawMembers, sortColumn, sortDirection, useHandicap);
      return { team, members };
    });
  }, [hasTeams, squad.teams, searchQuery, sortColumn, sortDirection, useHandicap]);

  const teamTableHeader = (
    <thead className="bg-surface-light">
      <tr>
        <th
          scope="col"
          colSpan={2}
          aria-sort={sortAriaSort('name', sortColumn, sortDirection)}
          className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
        >
          <SortableHeaderCell
            label="Team / participant"
            columnKey="name"
            activeColumn={sortColumn}
            direction={sortDirection}
            onToggle={onSortToggle}
            className="text-xs font-medium text-text-muted"
          />
        </th>
        {showMatchRecord ? (
          <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
            W-L
          </th>
        ) : null}
        {gameNumbersForCount(gameCount).map((n) => (
          <th
            key={n}
            className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider"
          >
            Game {n}
          </th>
        ))}
        {showBonus ? (
          <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
            Bonus
          </th>
        ) : null}
        <th
          scope="col"
          aria-sort={sortAriaSort('total', sortColumn, sortDirection)}
          className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider"
        >
          <SortableHeaderCell
            label={showBonus ? 'T+B' : 'Total'}
            columnKey="total"
            activeColumn={sortColumn}
            direction={sortDirection}
            onToggle={onSortToggle}
            className="text-xs font-medium text-text-muted justify-center w-full"
          />
        </th>
        <th
          scope="col"
          aria-sort={sortAriaSort('average', sortColumn, sortDirection)}
          className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider"
        >
          <SortableHeaderCell
            label="Average"
            columnKey="average"
            activeColumn={sortColumn}
            direction={sortDirection}
            onToggle={onSortToggle}
            className="text-xs font-medium text-text-muted justify-center w-full"
          />
        </th>
      </tr>
    </thead>
  );

  return (
    <div className="bg-surface border border-border rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-border bg-surface-light">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onToggle}
            className="p-1 hover:bg-surface rounded border-0 bg-transparent"
            style={{ border: 'none', backgroundColor: 'transparent' }}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ExpandMoreIcon className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-text-muted" />
            )}
          </button>
          <h4 className="font-medium text-text">
            {squad.name}
            <span className="text-text-muted font-normal text-sm ml-2 capitalize">({squad.status})</span>
          </h4>
        </div>
      </div>
      {expanded && (
        <div className="overflow-x-auto">
          {hasParticipants && (
            <LiveParticipantTable
              participants={participantRows}
              gameCount={gameCount}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortToggle={onSortToggle}
              onBowlerClick={onBowlerClick}
              useHandicap={useHandicap}
            />
          )}
          {hasParticipants && participantRows.length === 0 && (
            <p className="text-sm text-text-muted px-4 py-6">No participants match your search.</p>
          )}
          {hasTeams && (
            <table className="min-w-full divide-y divide-border">
              {teamTableHeader}
              <tbody className="bg-surface divide-y divide-border">
                {teamBlocks.map(({ team, members }) => (
                  <LiveTeamBlock
                    key={team.team_id}
                    team={team}
                    gameCount={gameCount}
                    members={members}
                    onBowlerClick={onBowlerClick}
                    useHandicap={useHandicap}
                    isBaker={isBaker}
                    showMatchRecord={showMatchRecord}
                    showBonus={showBonus}
                  />
                ))}
              </tbody>
            </table>
          )}
          {hasTeams && teamBlocks.length === 0 && (
            <p className="text-sm text-text-muted px-4 py-6">No teams match your search.</p>
          )}
          {!hasParticipants && !hasTeams && (
            <p className="text-sm text-text-muted px-4 py-6">No scores for this squad yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

const STREAM_UNAVAILABLE_COPY =
  'Live updates require a public event. Make this event public to enable the live score stream; scores shown here may still refresh manually.';

const RoundLiveScoresModal: React.FC<RoundLiveScoresModalProps> = ({
  eventId,
  tournamentId,
  roundId,
  isOpen,
  onClose,
  eventPublished,
  embedded = false,
  useHandicapScoring = true,
}) => {
  const useHandicap = useHandicapScoring;
  const { data, isLoading, error, isConnected, refresh, mayBeDelayed } = useRoundLiveScores(
    eventId,
    roundId,
    isOpen && roundId != null,
    { eventPublished }
  );
  const { data: roundRelationships = [] } = useQuery({
    queryKey: ['roundRelationships', eventId],
    queryFn: () => roundRelationshipApi.getAllRoundRelationshipsForEvent(eventId),
    enabled: isOpen && eventId > 0,
  });

  const [expandedSquads, setExpandedSquads] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<LiveSortColumn>('total');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedBowler, setSelectedBowler] = useState<BowlerLiveSelection | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSortColumn('total');
      setSortDirection('desc');
      setSelectedBowler(null);
    }
  }, [isOpen]);

  useEffect(() => {
    // Keep standings-style default when switching rounds.
    setSortColumn('total');
    setSortDirection('desc');
    setSearchQuery('');
  }, [roundId]);

  useEffect(() => {
    if (!data?.squads?.length) return;
    setExpandedSquads((prev) => {
      const next = { ...prev };
      for (const s of data.squads) {
        if (next[s.id] === undefined) next[s.id] = true;
      }
      return next;
    });
  }, [data?.squads]);

  const handleSortToggle = useCallback((column: LiveSortColumn) => {
    setSortDirection((prevDirection) => toggleSortDirection(prevDirection, sortColumn === column));
    setSortColumn(column);
  }, [sortColumn]);

  const gameCount = effectiveGameCount(data);
  const snapshot: EventRoundLiveScoresSnapshot | null = data;

  const isStepladder =
    String(snapshot?.round?.competition_method || '')
      .toLowerCase()
      .replace(/[\s-]+/g, '_') === 'stepladder';

  /** Stepladder uses the climb diagram (same family as score entry), not flat match cards. */
  const showStepladderDiagram =
    isStepladder && (snapshot?.matches?.length ?? 0) > 0;

  /**
   * League Baker RR: hundreds of one-game cards are noise; team grid is the live board.
   * Stepladder is also baker+league but must show the climb diagram instead.
   */
  const showMatchPlayCards =
    snapshot?.competition_mode === 'match_play' &&
    (snapshot.matches?.length ?? 0) > 0 &&
    !showStepladderDiagram &&
    !(snapshot.is_baker && snapshot.schedule_mode === 'league');

  /** Squad pinfall grid is empty/misleading for stepladder (match results live on the climb). */
  const showSquadTable = !showStepladderDiagram;

  const showUnpublishedStreamHint =
    eventPublished === false && !isLoading && !isConnected;

  const streamStatusLabel = (() => {
    if (mayBeDelayed) return 'May be delayed';
    if (isConnected) return 'Live';
    if (eventPublished === false) return 'Live stream unavailable';
    return 'Reconnecting';
  })();

  const scoresAsOf = normalizeLiveAsOf(snapshot?.updated_at);

  const title = useMemo(() => {
    return (
      data?.round?.friendly_name?.trim() ||
      (data?.round ? `Round ${data.round.round_number}` : 'Round scores')
    );
  }, [data]);

  const canOpenBowlerSheet = Boolean(tournamentId && tournamentId > 0);

  const body = (
    <div
      className={
        embedded
          ? 'flex flex-col gap-3'
          : 'flex min-h-0 flex-1 flex-col gap-3'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!embedded && (
            <span className="text-sm font-medium text-text sm:hidden">{title}</span>
          )}
          {embedded && (
            <h3 className="text-base font-semibold text-primary mr-2">{title}</h3>
          )}
          <span
            className={`inline-flex rounded-full px-2 py-0.5 ${
              isConnected ? 'bg-success/20 text-green-800' : 'bg-pending/20 text-yellow-800'
            }`}
          >
            {streamStatusLabel}
          </span>
          {snapshot?.round?.status && (
            <span className="text-text-muted capitalize">Status: {snapshot.round.status}</span>
          )}
          {scoresAsOf && (
            <span className="text-text-muted">
              Scores as of {formatDateTimeNaive(scoresAsOf)}
            </span>
          )}
          {snapshot?.round?.competition_method && (
            <span className="text-text-muted">
              <span className="font-medium">Round type:</span>{' '}
              {getCompetitionMethodDisplayLabel(snapshot.round.competition_method, {
                roundId: snapshot.round.id,
                relationships: roundRelationships,
              })}
            </span>
          )}
          {snapshot?.event_format && (
            <span className="text-text-muted">
              <span className="font-medium">Entries:</span>{' '}
              <span className="capitalize">{snapshot.event_format}</span>
            </span>
          )}
        </div>
        <Button size="small" variant="lightbackground" type="button" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loading size="medium" />
        </div>
      )}

      {!isLoading && error && <Alert variant="error" message={error} />}

      {!isLoading && !error && showUnpublishedStreamHint && (
        <Alert variant="warning" message={STREAM_UNAVAILABLE_COPY} />
      )}

      {!isLoading && !error && snapshot && (
        <>
          <div className="shrink-0 max-w-md">
            <TableSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by participant or team name"
              debounceMs={300}
            />
          </div>
          <div
            className={
              embedded
                ? 'overflow-x-auto'
                : 'min-h-0 flex-1 overflow-y-auto overflow-x-auto pr-1 -mr-1 overscroll-contain pb-1'
            }
          >
            <div className="space-y-4">
              {showStepladderDiagram && (
                <StepladderLiveSection
                  matches={snapshot.matches!}
                  searchQuery={searchQuery}
                />
              )}
              {showMatchPlayCards && (
                  <MatchPlayLiveSection
                    matches={snapshot.matches!}
                    searchQuery={searchQuery}
                  />
                )}
              {showSquadTable &&
                snapshot.squads.map((squad: RoundLiveSquad) => (
                <LiveSquadSection
                  key={squad.id}
                  squad={squad}
                  gameCount={gameCount}
                  expanded={expandedSquads[squad.id] !== false}
                  onToggle={() =>
                    setExpandedSquads((prev) => ({
                      ...prev,
                      [squad.id]: !(prev[squad.id] !== false),
                    }))
                  }
                  searchQuery={searchQuery}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSortToggle={handleSortToggle}
                  onBowlerClick={
                    canOpenBowlerSheet ? (b) => setSelectedBowler(b) : undefined
                  }
                  useHandicap={useHandicap}
                  isBaker={Boolean(snapshot.is_baker)}
                  showMatchRecord={
                    Boolean(snapshot.is_baker) ||
                    snapshot.schedule_mode === 'league' ||
                    (snapshot.squads ?? []).some((s) =>
                      (s.teams ?? []).some(
                        (t) =>
                          Number(t.match_wins || 0) + Number(t.match_losses || 0) > 0
                      )
                    )
                  }
                  showBonus={Boolean(snapshot.includes_bonus)}
                />
              ))}

              {showSquadTable && snapshot.squads.length === 0 && !showStepladderDiagram && (
                <p className="text-sm text-text-muted text-center py-6">No squads in this round yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {embedded ? (
        isOpen && roundId != null ? body : null
      ) : (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={title}
          size="xlarge"
          className="max-h-[90vh] w-full max-w-6xl"
          contentClassName="px-5 py-5 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {body}
        </Modal>
      )}
      {canOpenBowlerSheet && tournamentId ? (
        <BowlerLiveSideActionsSheet
          isOpen={selectedBowler != null}
          onClose={() => setSelectedBowler(null)}
          tournamentId={tournamentId}
          eventId={eventId}
          bowler={selectedBowler}
        />
      ) : null}
    </>
  );
};

export default RoundLiveScoresModal;
