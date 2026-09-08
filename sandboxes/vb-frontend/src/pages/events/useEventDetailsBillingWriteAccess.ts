import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  canEditFullTournament,
  canEditSaEvent,
  TdAccessAPI,
  type TdBillingSummary,
} from '../../api/tdAccess';
import { isSaOnlyTournament } from '../../utils/saOnly';
import type { TournamentRead } from '../../types/tournament';
import { mapDirectorAccessToUiFlags } from '../../utils/directorAccessUi';
import type { EventDirectorAccess } from '../../types/director_delegation';

/**
 * Account + license gates for EventDetails write tabs (billing + pass window).
 */
export function useEventDetailsBillingWriteAccess(opts: {
  tournamentId: number;
  tournament: TournamentRead | null | undefined;
  billing: TdBillingSummary | null | undefined;
  isAdmin: boolean;
  enabled: boolean;
  directorAccess: EventDirectorAccess | null | undefined;
}) {
  const saOnly = isSaOnlyTournament(opts.tournament);
  const { data: tournamentAccess } = useQuery({
    queryKey: ['tournamentAccess', opts.tournamentId],
    queryFn: () => TdAccessAPI.getTournamentAccess(opts.tournamentId),
    enabled: opts.enabled && opts.tournamentId > 0,
  });

  const accountCanEditShell = saOnly
    ? canEditSaEvent(opts.billing)
    : canEditFullTournament(opts.billing);
  const licenseAllowsWrite =
    !tournamentAccess?.gating_enabled ||
    !!tournamentAccess?.runnable ||
    !!tournamentAccess?.can_extend_with_pass;
  const billingAllowsWrite =
    opts.isAdmin || (accountCanEditShell && licenseAllowsWrite);
  const scoringRunnable =
    !tournamentAccess?.gating_enabled || !!tournamentAccess?.runnable;

  const flags = useMemo(
    () => mapDirectorAccessToUiFlags(opts.directorAccess ?? undefined, opts.isAdmin),
    [opts.directorAccess, opts.isAdmin]
  );

  return {
    ...flags,
    canEditEventInfo: flags.canEditEventInfo && billingAllowsWrite,
    canEditEventFormat: flags.canEditEventFormat && billingAllowsWrite,
    canParticipants: flags.canParticipants && billingAllowsWrite,
    canSquads: flags.canSquads && billingAllowsWrite,
    canLanes: flags.canLanes && billingAllowsWrite,
    canGameScoring:
      flags.canGameScoring && billingAllowsWrite && scoringRunnable,
    billingAllowsWrite,
    saOnly,
  };
}
