import type { GameRead } from '../types/game';
import type { RoundParticipant } from '../types/round';
import { getLeagueSchedule, availableLeagueTeamCounts } from '../features/lanes/usbcSchedules';

export interface BakerLeagueReconcileTeam {
  id: number;
  team_number?: number | null;
  team_name?: string | null;
  display_name?: string | null;
  name?: string | null;
}

export interface BakerLeagueReconcileCell {
  gameNumber: number;
  score: number | null;
  opponentTeamId: number | null;
  opponentLabel: string | null;
  result: 'W' | 'L' | 'T' | null;
}

export interface BakerLeagueReconcileRow {
  teamId: number;
  teamNumber: number | null;
  teamLabel: string;
  cells: BakerLeagueReconcileCell[];
  wins: number;
  losses: number;
  ties: number;
  bonusPins: number;
  totalPinfall: number;
  totalWithBonus: number;
}

export type BakerLeagueReconcileSort = 'place' | 'team_number';

function nearestLeagueTeamCount(teamCount: number): number {
  let n = Math.max(2, Math.trunc(teamCount));
  if (n % 2 === 1) n += 1;
  const supported = availableLeagueTeamCounts();
  if (supported.includes(n)) return n;
  for (const candidate of supported) {
    if (candidate >= n) return candidate;
  }
  return supported[supported.length - 1] ?? n;
}

function teamLabel(team: BakerLeagueReconcileTeam): string {
  return (
    team.team_name ||
    team.display_name ||
    team.name ||
    (team.team_number ? `Team ${team.team_number}` : `Team ${team.id}`)
  );
}

function scoreForTeamGame(games: GameRead[], teamId: number, gameNumber: number): number | null {
  const scored = games
    .filter(
      (g) =>
        g.team_id === teamId &&
        g.game_number === gameNumber &&
        g.is_team_game === true &&
        g.score != null
    )
    .sort((a, b) => Number(b.id) - Number(a.id));
  return scored.length > 0 ? Number(scored[0].score) : null;
}

function buildPositionRoundPairs(
  standings: RoundParticipant[] | undefined,
  seededTeams: Array<{ seed: number; teamId: number }>
): Array<[number, number]> {
  if (!standings?.length) return [];
  const positions = new Map<number, number>();
  for (const row of standings) {
    const teamId = Number(row.team_id);
    const pos = Number(row.position);
    if (teamId > 0 && pos > 0) positions.set(teamId, pos);
  }
  const ordered = [...seededTeams]
    .map(({ teamId }) => ({ teamId, pos: positions.get(teamId) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.pos - b.pos || a.teamId - b.teamId)
    .map((item) => item.teamId);
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i + 1 < ordered.length; i += 2) {
    pairs.push([ordered[i], ordered[i + 1]]);
  }
  return pairs;
}

export function buildBakerLeagueReconcileRows(args: {
  teams: BakerLeagueReconcileTeam[];
  allGames: GameRead[];
  gameCount: number;
  scheduledGames?: number | null;
  positionRoundGame?: number | null;
  roundParticipants?: RoundParticipant[];
  bonusPinsByTeamId?: Map<number, number> | Record<number, number>;
}): BakerLeagueReconcileRow[] {
  const teams = args.teams
    .filter((team) => Number(team.id) > 0)
    .map((team) => ({
      id: Number(team.id),
      teamNumber:
        team.team_number == null || Number.isNaN(Number(team.team_number))
          ? null
          : Number(team.team_number),
      label: teamLabel(team),
    }))
    .sort((a, b) => (a.teamNumber ?? Number.MAX_SAFE_INTEGER) - (b.teamNumber ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);

  const seedMap = new Map<number, number>();
  for (const team of teams) {
    if (team.teamNumber != null && team.teamNumber > 0) {
      seedMap.set(team.teamNumber, team.id);
    }
  }
  const seededTeams = [...seedMap.entries()]
    .map(([seed, teamId]) => ({ seed, teamId }))
    .sort((a, b) => a.seed - b.seed);

  const maxSeed = seededTeams.reduce((max, item) => Math.max(max, item.seed), 0);
  const tableSize = nearestLeagueTeamCount(maxSeed || teams.length || 2);
  const schedule = getLeagueSchedule(tableSize);
  const scoreCache = new Map<string, number | null>();
  const getScore = (teamId: number, gameNumber: number) => {
    const key = `${teamId}:${gameNumber}`;
    if (!scoreCache.has(key)) {
      scoreCache.set(key, scoreForTeamGame(args.allGames, teamId, gameNumber));
    }
    return scoreCache.get(key) ?? null;
  };
  const labels = new Map(teams.map((team) => [team.id, team.label]));
  const rows = new Map<number, BakerLeagueReconcileRow>();
  for (const team of teams) {
    const bonusPins =
      args.bonusPinsByTeamId instanceof Map
        ? Number(args.bonusPinsByTeamId.get(team.id) || 0)
        : Number((args.bonusPinsByTeamId as Record<number, number> | undefined)?.[team.id] || 0);
    rows.set(team.id, {
      teamId: team.id,
      teamNumber: team.teamNumber,
      teamLabel: team.label,
      cells: [],
      wins: 0,
      losses: 0,
      ties: 0,
      bonusPins,
      totalPinfall: 0,
      totalWithBonus: 0,
    });
  }

  const totalGames = Math.max(0, Math.min(args.gameCount, Number(args.scheduledGames || args.gameCount || 0)));
  for (let gameNumber = 1; gameNumber <= totalGames; gameNumber += 1) {
    const isPositionRound =
      args.positionRoundGame != null && Number(args.positionRoundGame) === gameNumber;
    const pairs: Array<[number, number]> = isPositionRound
      ? buildPositionRoundPairs(args.roundParticipants, seededTeams)
      : schedule[(gameNumber - 1) % schedule.length]
          .filter(([a, b]) => seedMap.has(a) && seedMap.has(b))
          .map(([a, b]) => [seedMap.get(a) as number, seedMap.get(b) as number]);

    const seenTeamIds = new Set<number>();
    for (const [teamA, teamB] of pairs) {
      seenTeamIds.add(teamA);
      seenTeamIds.add(teamB);
      const scoreA = getScore(teamA, gameNumber);
      const scoreB = getScore(teamB, gameNumber);
      let resultA: BakerLeagueReconcileCell['result'] = null;
      let resultB: BakerLeagueReconcileCell['result'] = null;
      if (scoreA != null && scoreB != null) {
        if (scoreA > scoreB) {
          resultA = 'W';
          resultB = 'L';
        } else if (scoreB > scoreA) {
          resultA = 'L';
          resultB = 'W';
        } else {
          resultA = 'T';
          resultB = 'T';
        }
      }
      const rowA = rows.get(teamA);
      const rowB = rows.get(teamB);
      if (rowA) {
        rowA.cells.push({
          gameNumber,
          score: scoreA,
          opponentTeamId: teamB,
          opponentLabel: labels.get(teamB) ?? null,
          result: resultA,
        });
        if (resultA === 'W') rowA.wins += 1;
        else if (resultA === 'L') rowA.losses += 1;
        else if (resultA === 'T') rowA.ties += 1;
      }
      if (rowB) {
        rowB.cells.push({
          gameNumber,
          score: scoreB,
          opponentTeamId: teamA,
          opponentLabel: labels.get(teamA) ?? null,
          result: resultB,
        });
        if (resultB === 'W') rowB.wins += 1;
        else if (resultB === 'L') rowB.losses += 1;
        else if (resultB === 'T') rowB.ties += 1;
      }
    }

    for (const team of teams) {
      if (seenTeamIds.has(team.id)) continue;
      rows.get(team.id)?.cells.push({
        gameNumber,
        score: getScore(team.id, gameNumber),
        opponentTeamId: null,
        opponentLabel: null,
        result: null,
      });
    }
  }

  for (const row of rows.values()) {
    row.totalPinfall = row.cells.reduce((sum, cell) => sum + (cell.score ?? 0), 0);
    row.totalWithBonus = row.totalPinfall + row.bonusPins;
  }

  return [...rows.values()].sort(
    (a, b) =>
      (a.teamNumber ?? Number.MAX_SAFE_INTEGER) - (b.teamNumber ?? Number.MAX_SAFE_INTEGER) ||
      a.teamLabel.localeCompare(b.teamLabel)
  );
}

export function sortBakerLeagueReconcileRows(
  rows: BakerLeagueReconcileRow[],
  sortBy: BakerLeagueReconcileSort
): BakerLeagueReconcileRow[] {
  if (sortBy === 'team_number') {
    return [...rows].sort(
      (a, b) =>
        (a.teamNumber ?? Number.MAX_SAFE_INTEGER) - (b.teamNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.teamLabel.localeCompare(b.teamLabel)
    );
  }

  return [...rows].sort((a, b) => {
    return (
      b.totalWithBonus - a.totalWithBonus ||
      b.totalPinfall - a.totalPinfall ||
      (a.teamNumber ?? Number.MAX_SAFE_INTEGER) - (b.teamNumber ?? Number.MAX_SAFE_INTEGER) ||
      a.teamLabel.localeCompare(b.teamLabel)
    );
  });
}
