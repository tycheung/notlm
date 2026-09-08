export type TdHomePendingSignup = {
  event_id: number;
  tournament_id: number;
  pending_count: number;
};

export function eventParticipantsHref(eventPath: string): string {
  return `${eventPath}?tab=participants`;
}

export function pendingCountForEvent(
  rows: TdHomePendingSignup[],
  eventId: number
): number {
  return rows.find((row) => row.event_id === eventId)?.pending_count ?? 0;
}

export function pendingCountForTournament(
  rows: TdHomePendingSignup[],
  tournamentId: number
): number {
  return rows
    .filter((row) => row.tournament_id === tournamentId)
    .reduce((sum, row) => sum + (row.pending_count || 0), 0);
}

export function pendingHrefForTournament(
  rows: TdHomePendingSignup[],
  tournamentId: number,
  eventPath: (eventId: number) => string,
  actionsNeededPath: string
): string | null {
  const matches = rows.filter((row) => row.tournament_id === tournamentId && row.pending_count > 0);
  if (matches.length === 0) return null;
  if (matches.length === 1) {
    return eventParticipantsHref(eventPath(matches[0].event_id));
  }
  return actionsNeededPath;
}

export function pendingTotalsForHome(
  rows: TdHomePendingSignup[],
  loaded: boolean,
  tournaments: Array<{ id: number; pending_registrations?: number | null }>
): { byTournamentId: Record<number, number>; total: number } {
  const byTournamentId: Record<number, number> = {};
  if (loaded) {
    for (const tournament of tournaments) {
      byTournamentId[tournament.id] = pendingCountForTournament(rows, tournament.id);
    }
    return {
      byTournamentId,
      total: rows.reduce((sum, row) => sum + (row.pending_count || 0), 0),
    };
  }
  let total = 0;
  for (const tournament of tournaments) {
    const count = tournament.pending_registrations ?? 0;
    byTournamentId[tournament.id] = count;
    total += count;
  }
  return { byTournamentId, total };
}
