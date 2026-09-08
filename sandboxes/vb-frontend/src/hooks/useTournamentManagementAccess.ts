import { useQuery } from '@tanstack/react-query';
import { DirectorsAPI } from '../api/directors';
import { TournamentsAPI } from '../api/tournaments';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/user';
import {
  canEditFullTournament,
  canEditSaEvent,
  canWriteDirectorOps,
} from '../api/tdAccess';
import { isSaOnlyTournament } from '../utils/saOnly';

/**
 * Tournament-scoped powers for UI: organizer, admin, co-owner / delegated create-events / master.
 * Non-TD assistants with grants can manage delegated tournaments (no create tournament account-wide).
 */
export function useTournamentManagementAccess(tournamentId: number) {
  const { user } = useAuth();
  const tid = tournamentId > 0 ? tournamentId : 0;
  const accountCanWrite = canWriteDirectorOps(user?.billing);

  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ['tournament', tid],
    queryFn: () => TournamentsAPI.getTournament(tid),
    enabled: !!tid,
  });

  const saOnly = isSaOnlyTournament(tournament);
  const accountCanEditShell = saOnly
    ? canEditSaEvent(user?.billing)
    : canEditFullTournament(user?.billing);

  const canFetchMyAccess =
    !!tid &&
    !!user &&
    (user.role === Role.TD ||
      user.role === Role.SA ||
      user.role === Role.BOWLER ||
      user.role === Role.ADMIN);

  const { data: myAccess, isLoading: myAccessLoading } = useQuery({
    queryKey: ['myTournamentAccess', tid],
    queryFn: () => DirectorsAPI.getMyTournamentAccess(tid),
    enabled: canFetchMyAccess && user?.role !== Role.ADMIN,
  });

  const isAdmin = user?.role === Role.ADMIN;
  const isOrganizer = !!(user && tournament && tournament.organizer_id === user.id);
  const isTournamentMaster =
    isAdmin || isOrganizer || !!myAccess?.is_tournament_master;
  const canCreateEvents =
    accountCanEditShell &&
    !saOnly &&
    (isAdmin ||
      isOrganizer ||
      !!(myAccess?.can_create_events || myAccess?.is_tournament_master));

  const isLoading =
    (!!tid && tournamentLoading) || (!!tid && canFetchMyAccess && myAccessLoading);

  return {
    tournament,
    isTournamentMaster,
    canCreateEvents,
    isOrganizer,
    isLoading,
    accountCanWrite,
    accountCanEditShell,
  };
}
