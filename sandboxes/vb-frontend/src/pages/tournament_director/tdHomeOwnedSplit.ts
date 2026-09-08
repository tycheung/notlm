import type { TournamentRead } from '../../types/tournament';
import { isTournamentCompleted } from '../../utils/tournamentStatus';

const RECENT_FINISHED_LIMIT = 3;

function endDateValue(tournament: TournamentRead): number {
  if (!tournament.end_date) return 0;
  const parsed = Date.parse(tournament.end_date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function splitOwnedTournamentsForHome(tournaments: TournamentRead[]): {
  liveOrUpcoming: TournamentRead[];
  recentFinished: TournamentRead[];
} {
  const liveOrUpcoming: TournamentRead[] = [];
  const finished: TournamentRead[] = [];
  for (const tournament of tournaments) {
    if (isTournamentCompleted(tournament)) {
      finished.push(tournament);
    } else {
      liveOrUpcoming.push(tournament);
    }
  }
  finished.sort((a, b) => endDateValue(b) - endDateValue(a));
  return {
    liveOrUpcoming,
    recentFinished: finished.slice(0, RECENT_FINISHED_LIMIT),
  };
}
