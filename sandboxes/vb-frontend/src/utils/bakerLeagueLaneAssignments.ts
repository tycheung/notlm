import type { GameRead } from '../types/game';
import type { RoundParticipant } from '../types/round';
import {
  positionRoundLaneForPlace,
  resolvePositionRoundLanePlacement,
  stableRngSeedForRound,
} from '../features/lanes/positionRoundLanes';
import type { LanePair } from '../features/lanes/types';

export interface BakerLeagueLaneTeam {
  id: number;
  team_number?: number | null;
  team_name?: string | null;
  display_name?: string | null;
  name?: string | null;
  members?: Array<{
    squad_participant_id?: number | null;
    event_participant_id?: number | null;
    id?: number;
  }>;
}

export interface BakerLeagueLaneRow {
  teamId: number;
  teamNumber: number | null;
  teamLabel: string;
  /** Current standings place when available. */
  standingPlace: number | null;
  /** 1-based game → lane number (null = unassigned). */
  lanesByGame: Array<number | null>;
}

export type BakerLeagueLaneSort = 'team' | 'lane' | 'standings';

function teamLabel(team: BakerLeagueLaneTeam): string {
  return (
    team.team_name ||
    team.display_name ||
    team.name ||
    (team.team_number ? `Team ${team.team_number}` : `Team ${team.id}`)
  );
}

function laneFromTeamGames(
  games: GameRead[],
  teamId: number,
  gameNumber: number
): number | null {
  const teamShells = games
    .filter(
      (g) =>
        Number(g.team_id) === teamId &&
        Number(g.game_number) === gameNumber &&
        g.is_team_game === true
    )
    .sort((a, b) => Number(b.id) - Number(a.id));
  for (const g of teamShells) {
    if (g.assigned_lane != null && Number(g.assigned_lane) > 0) {
      return Number(g.assigned_lane);
    }
  }
  const anyTeamGame = games
    .filter(
      (g) => Number(g.team_id) === teamId && Number(g.game_number) === gameNumber
    )
    .sort((a, b) => Number(b.id) - Number(a.id));
  for (const g of anyTeamGame) {
    if (g.assigned_lane != null && Number(g.assigned_lane) > 0) {
      return Number(g.assigned_lane);
    }
  }
  return null;
}

function laneFromMemberLookup(
  team: BakerLeagueLaneTeam,
  gameNumber: number,
  laneLabelLookup?: Map<string, string>
): number | null {
  if (!laneLabelLookup) return null;
  for (const member of team.members || []) {
    const spId = member.squad_participant_id;
    if (spId == null) continue;
    const label = laneLabelLookup.get(`${spId}:${gameNumber}`);
    if (!label) continue;
    const parsed = Number.parseInt(String(label).replace(/[^\d].*$/, ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function standingPlaceByTeamId(
  roundParticipants?: RoundParticipant[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of roundParticipants || []) {
    const teamId = Number(row.team_id);
    const place = Number(row.position);
    if (teamId > 0 && place > 0) map.set(teamId, place);
  }
  return map;
}

function laneFromPositionRoundPlace(args: {
  place: number;
  teamCount: number;
  placement?: string | null;
  pairsInPlay?: LanePair[] | null;
  roundId?: number | null;
  gameNumber: number;
}): number | null {
  try {
    const fromPairs =
      args.pairsInPlay && args.pairsInPlay.length > 0
        ? args.pairsInPlay.length * 2
        : args.teamCount;
    const evenCount = fromPairs % 2 === 0 ? fromPairs : Math.max(2, fromPairs - 1);
    const { lane } = positionRoundLaneForPlace(args.place, {
      teamCount: evenCount,
      placement: resolvePositionRoundLanePlacement(args.placement),
      pairsInPlay: args.pairsInPlay ?? undefined,
      rngSeed:
        args.roundId != null
          ? stableRngSeedForRound(Number(args.roundId), args.gameNumber)
          : null,
    });
    return lane;
  } catch {
    return null;
  }
}

export function buildBakerLeagueLaneRows(args: {
  teams: BakerLeagueLaneTeam[];
  allGames: GameRead[];
  gameCount: number;
  scheduledGames?: number | null;
  laneLabelLookup?: Map<string, string>;
  roundParticipants?: RoundParticipant[];
  /** Movement preview lanes keyed by team id (1-based games as array). */
  previewLanesByTeamId?: Map<number, Array<number | null>>;
  positionRoundGame?: number | null;
  positionRoundLanePlacement?: string | null;
  pairsInPlay?: LanePair[] | null;
  roundId?: number | null;
}): BakerLeagueLaneRow[] {
  const totalGames = Math.max(
    1,
    Math.trunc(args.scheduledGames ?? 0) || Math.trunc(args.gameCount) || 1
  );
  const places = standingPlaceByTeamId(args.roundParticipants);
  const teamCount = Math.max(2, args.teams.length);

  return args.teams.map((team) => {
    const standingPlace = places.get(team.id) ?? null;
    const preview = args.previewLanesByTeamId?.get(team.id);
    const lanesByGame: Array<number | null> = [];
    for (let gameNumber = 1; gameNumber <= totalGames; gameNumber += 1) {
      const stamped = laneFromTeamGames(args.allGames, team.id, gameNumber);
      const fromPreview = preview?.[gameNumber - 1] ?? null;
      const isPosition =
        args.positionRoundGame != null &&
        Number(args.positionRoundGame) === gameNumber;
      const fromPosition =
        isPosition && standingPlace != null
          ? laneFromPositionRoundPlace({
              place: standingPlace,
              teamCount,
              placement: args.positionRoundLanePlacement,
              pairsInPlay: args.pairsInPlay,
              roundId: args.roundId,
              gameNumber,
            })
          : null;
      const fromMember = laneFromMemberLookup(
        team,
        gameNumber,
        args.laneLabelLookup
      );
      lanesByGame.push(stamped ?? fromPreview ?? fromPosition ?? fromMember);
    }
    return {
      teamId: team.id,
      teamNumber: team.team_number ?? null,
      teamLabel: teamLabel(team),
      standingPlace,
      lanesByGame,
    };
  });
}

export function sortBakerLeagueLaneRows(
  rows: BakerLeagueLaneRow[],
  sortBy: BakerLeagueLaneSort,
  /** 1-based game used when sorting by lane. */
  sortGame = 1
): BakerLeagueLaneRow[] {
  const gameIdx = Math.max(0, Math.trunc(sortGame) - 1);
  if (sortBy === 'lane') {
    return [...rows].sort((a, b) => {
      const laneA = a.lanesByGame[gameIdx];
      const laneB = b.lanesByGame[gameIdx];
      const aKey = laneA == null ? Number.MAX_SAFE_INTEGER : laneA;
      const bKey = laneB == null ? Number.MAX_SAFE_INTEGER : laneB;
      return (
        aKey - bKey ||
        (a.standingPlace ?? Number.MAX_SAFE_INTEGER) -
          (b.standingPlace ?? Number.MAX_SAFE_INTEGER) ||
        (a.teamNumber ?? Number.MAX_SAFE_INTEGER) -
          (b.teamNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.teamLabel.localeCompare(b.teamLabel)
      );
    });
  }
  if (sortBy === 'standings') {
    return [...rows].sort(
      (a, b) =>
        (a.standingPlace ?? Number.MAX_SAFE_INTEGER) -
          (b.standingPlace ?? Number.MAX_SAFE_INTEGER) ||
        (a.teamNumber ?? Number.MAX_SAFE_INTEGER) -
          (b.teamNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.teamLabel.localeCompare(b.teamLabel)
    );
  }
  return [...rows].sort(
    (a, b) =>
      (a.teamNumber ?? Number.MAX_SAFE_INTEGER) -
        (b.teamNumber ?? Number.MAX_SAFE_INTEGER) ||
      a.teamLabel.localeCompare(b.teamLabel)
  );
}

/** Prefer stamped shell lane, then movement preview, then position-round place lane. */
export function resolveDisplayLaneForTeamGame(args: {
  teamId: number;
  gameNumber: number;
  teamGame?: { assigned_lane?: number | null; lane_label?: string | null } | null;
  previewLanesByTeamId?: Map<number, Array<number | null>>;
  standingPlace?: number | null;
  positionRoundGame?: number | null;
  positionRoundLanePlacement?: string | null;
  pairsInPlay?: LanePair[] | null;
  roundId?: number | null;
  teamCount?: number;
}): number | null {
  if (args.teamGame?.assigned_lane != null && Number(args.teamGame.assigned_lane) > 0) {
    return Number(args.teamGame.assigned_lane);
  }
  const fromPreview =
    args.previewLanesByTeamId?.get(args.teamId)?.[Math.max(0, args.gameNumber - 1)] ??
    null;
  if (fromPreview != null && Number(fromPreview) > 0) {
    return Number(fromPreview);
  }
  const isPosition =
    args.positionRoundGame != null &&
    Number(args.positionRoundGame) === Number(args.gameNumber);
  if (isPosition && args.standingPlace != null && args.standingPlace > 0) {
    return laneFromPositionRoundPlace({
      place: args.standingPlace,
      teamCount: Math.max(2, args.teamCount ?? 2),
      placement: args.positionRoundLanePlacement,
      pairsInPlay: args.pairsInPlay,
      roundId: args.roundId,
      gameNumber: args.gameNumber,
    });
  }
  return null;
}

/** Map movement-preview `team:{id}` rows into teamId → lanesByGame. */
export function previewLanesByTeamIdFromPreview(preview: {
  byTeam: Array<{ key: string; lanesByGame: Array<number | null> }>;
}): Map<number, Array<number | null>> {
  const map = new Map<number, Array<number | null>>();
  for (const row of preview.byTeam) {
    if (!row.key.startsWith('team:')) continue;
    const teamId = Number(row.key.slice('team:'.length));
    if (teamId > 0) map.set(teamId, row.lanesByGame);
  }
  return map;
}
