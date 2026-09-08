import type { GameRead, GameUpdate } from '../../types/game';
import type { SquadRead } from '../../types/squad';
import type { TeamMember } from '../../types/team';
import {
  buildHandicapEventSettings,
  normalizeAverage,
  type TeamMemberSeriesInput,
} from '../../utils/scoringTotals';
import { getIndividualTempGameId } from '../../utils/gameTempIds';

export type SquadCategoryLike = {
  id: string;
  participants: Array<{ id: number }>;
};

export function teamTempGameId(teamId: number, gameNumber: number): string {
  return `temp-team-${teamId}-${gameNumber}`;
}

export function lookupBonusPins(
  byTeam: Map<number, number> | Record<number, number> | undefined,
  teamId: number
): number {
  if (!byTeam) return 0;
  if (byTeam instanceof Map) return Number(byTeam.get(teamId) || 0);
  return Number((byTeam as Record<number, number>)[teamId] || 0);
}

/** Normalize InlineEditableCell batch values for GameUpdate.score */
export function toScoreFieldValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

export function formatQualifyingAverage(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

export function calculateTeamQualifyingTotal(members: TeamMember[] | undefined): number | null {
  const vals = (members || [])
    .map((m) => m.qualifying_average)
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (vals.length === 0) return null;
  return vals.reduce((sum, v) => sum + v, 0);
}

/** Games use EventParticipant.id; roster may expose EventTeamMember.id as member.id */
export function getScoringParticipantId(member: TeamMember): number {
  return member.event_participant_id ?? member.id;
}

export function resolveRoundAndSquadForTeam(
  teamId: number,
  squadCategories: SquadCategoryLike[],
  squads: SquadRead[],
  allGames: GameRead[],
  teamGame?: GameRead
): { roundId: number | null; squadId: number | null } {
  let squadId: number | null = teamGame?.squad_id ?? null;

  if (!squadId) {
    const category = squadCategories.find((c) =>
      c.participants.some((t) => t.id === teamId)
    );
    if (category && category.id !== 'unassigned') {
      const parsed = parseInt(category.id, 10);
      if (!Number.isNaN(parsed)) {
        squadId = parsed;
      }
    }
  }

  let roundId: number | null = teamGame?.round_id ?? null;
  if (!roundId && squadId) {
    const squad = squads.find((s) => s.id === squadId);
    roundId = squad?.round_id ?? null;
    if (!roundId) {
      const squadGame = allGames.find((g) => g.squad_id === squadId && g.round_id);
      roundId = squadGame?.round_id ?? null;
    }
  }

  return { roundId, squadId };
}

/** Dual scrollbars so wide Baker/team sheets stay usable on small screens. */
export { default as DualHorizontalScrollTable } from '../common/DualHorizontalScrollTable';

export function getTeamCaptain(team: {
  members?: Array<{ is_captain?: boolean; [key: string]: unknown }>;
}): { is_captain?: boolean; [key: string]: unknown } | null {
  if (!team.members || team.members.length === 0) return null;
  return team.members.find((member) => member.is_captain) || team.members[0];
}

export function getTeamCaptainName(team: {
  members?: Array<{
    is_captain?: boolean;
    user_name?: string;
    name?: string;
    user?: { name?: string };
  }>;
}): string {
  const captain = getTeamCaptain(team);
  if (!captain) return '';
  return (
    (captain.user_name as string | undefined) ||
    (captain.name as string | undefined) ||
    captain.user?.name ||
    'Unknown'
  );
}

type SeriesMemberLike = {
  id: number;
  event_participant_id?: number | null;
  squad_participant_id?: number;
  qualifying_average?: number | null;
  handicap?: number | null;
};

export function buildTeamMemberSeriesInput(
  member: SeriesMemberLike,
  args: {
    handicapSettings: ReturnType<typeof buildHandicapEventSettings>;
    getParticipantGames: (participantId: number) => GameRead[];
    getGameIdForParticipantAndGameNumber: (
      participantId: number,
      gameNumber: number
    ) => number | string | null | undefined;
    getPendingGameValue: (
      gameId: number | string,
      field: keyof GameUpdate
    ) => number | null | undefined;
  }
): TeamMemberSeriesInput {
  const pid = getScoringParticipantId(member as never);
  const rawHandicap = member.handicap;
  const participantHandicap =
    rawHandicap === null || rawHandicap === undefined ? null : normalizeAverage(rawHandicap);
  return {
    games: args.getParticipantGames(pid),
    qualifyingAverage: normalizeAverage(member.qualifying_average),
    participantHandicap,
    handicapSettings: args.handicapSettings,
    getMergeForGame: (_game, gameNum) => {
      const gameId = args.getGameIdForParticipantAndGameNumber(pid, gameNum);
      const tempId = getIndividualTempGameId({
        event_participant_id: pid,
        game_number: gameNum,
        squad_participant_id: member.squad_participant_id,
      });
      return { gameId, tempId, getPendingGameValue: args.getPendingGameValue };
    },
  };
}
