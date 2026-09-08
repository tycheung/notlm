import { useQuery } from '@tanstack/react-query';
import { RoundMatchSeriesAPI } from '../api/round-match-series';
import { RoundsAPI } from '../api/rounds';
import SquadsAPI from '../api/squads';
import { TeamsAPI } from '../api/teams';

/** Shared matchup queries for Format Editor (RR + H2H panels). */
export function useFormatEditorMatchupQueries(
  eventId: number,
  roundId: number,
  isTeamEvent: boolean
) {
  const enabledRound = Number.isFinite(roundId) && roundId > 0;

  const seriesQuery = useQuery({
    queryKey: ['roundMatchSeries', roundId],
    queryFn: () => RoundMatchSeriesAPI.list(roundId),
    enabled: enabledRound,
  });

  const readinessQuery = useQuery({
    queryKey: ['matchStructureReadiness', roundId],
    queryFn: () => RoundMatchSeriesAPI.getStructureReadiness(roundId),
    enabled: enabledRound,
    staleTime: 15_000,
  });

  const participantsQuery = useQuery({
    queryKey: ['roundParticipants', roundId],
    queryFn: () => RoundsAPI.getRoundParticipants(roundId),
    enabled: !isTeamEvent && enabledRound,
  });

  const teamsQuery = useQuery({
    queryKey: ['eventTeams', eventId],
    queryFn: () => TeamsAPI.getEventTeams(eventId),
    enabled: isTeamEvent && Number.isFinite(eventId) && eventId > 0,
  });

  const squadRosterQuery = useQuery({
    queryKey: ['roundSquadParticipants', roundId],
    queryFn: () => SquadsAPI.getRoundParticipants(roundId),
    enabled: !isTeamEvent && enabledRound,
    staleTime: 15_000,
  });

  const squadTeamsQuery = useQuery({
    queryKey: ['roundSquadTeams', roundId],
    queryFn: () => SquadsAPI.getRoundTeams(roundId),
    enabled: isTeamEvent && enabledRound,
    staleTime: 15_000,
  });

  return {
    seriesQuery,
    readinessQuery,
    participantsQuery,
    teamsQuery,
    squadRosterQuery,
    squadTeamsQuery,
  };
}
