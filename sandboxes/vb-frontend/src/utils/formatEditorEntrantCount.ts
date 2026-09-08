import type { RoundParticipant } from '../types/round';
import type { RoundParticipantsResponse, RoundTeamsResponse } from '../types/squad';

/** Count individual bowlers assigned to squads in a round. */
export function countSquadRosterParticipants(
  roster: RoundParticipantsResponse | undefined | null
): number {
  if (!roster?.squads?.length) return 0;
  return roster.squads.reduce((sum, squad) => sum + (squad.participants?.length ?? 0), 0);
}

/** Count teams assigned to squads in a round (team events). */
export function countSquadRosterTeams(roster: RoundTeamsResponse | undefined | null): number {
  if (!roster?.squads?.length) return 0;
  return roster.squads.reduce((sum, squad) => sum + (squad.teams?.length ?? 0), 0);
}

/**
 * Entrant count for Format Editor pod/bracket generation.
 * Bracket rounds: prefer squad assignments, then advancement pool size — not standings
 * (which stay empty until the round is scored).
 */
export function resolveFormatEditorEntrantCount(args: {
  isTeamEvent: boolean;
  isInitialRound: boolean;
  standingsParticipants: RoundParticipant[];
  eventTeamsCount: number;
  squadRosterParticipants: number;
  squadRosterTeams: number;
  poolCount: number;
}): number {
  const {
    isTeamEvent,
    isInitialRound,
    standingsParticipants,
    eventTeamsCount,
    squadRosterParticipants,
    squadRosterTeams,
    poolCount,
  } = args;

  if (isTeamEvent) {
    if (isInitialRound) {
      return Math.max(eventTeamsCount, squadRosterTeams);
    }
    if (squadRosterTeams > 0) return squadRosterTeams;
    return poolCount;
  }

  const standingsCount = standingsParticipants.length;
  if (isInitialRound) {
    return Math.max(standingsCount, squadRosterParticipants);
  }

  if (squadRosterParticipants > 0) return squadRosterParticipants;
  return poolCount;
}
