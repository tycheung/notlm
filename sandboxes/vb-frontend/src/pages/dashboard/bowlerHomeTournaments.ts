import type { TournamentRead } from '../../types/tournament';
import { getTournamentStatus } from '../../utils/tournamentStatus';

export type BowlerHomeTournament = TournamentRead & {
  is_organizer?: boolean;
};

function startDateValue(tournament: BowlerHomeTournament): number {
  if (!tournament.start_date) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(tournament.start_date);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function endDateValue(tournament: BowlerHomeTournament): number {
  if (!tournament.end_date) return 0;
  const parsed = Date.parse(tournament.end_date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function enteredTournamentsForBowlerHome(
  rows: BowlerHomeTournament[]
): BowlerHomeTournament[] {
  return rows.filter((row) => row.is_organizer !== true);
}

export function splitBowlerHomeTournaments(rows: BowlerHomeTournament[]): {
  upcoming: BowlerHomeTournament[];
  completed: BowlerHomeTournament[];
} {
  const upcoming: BowlerHomeTournament[] = [];
  const completed: BowlerHomeTournament[] = [];
  for (const row of enteredTournamentsForBowlerHome(rows)) {
    const status = getTournamentStatus(row);
    if (status === 'completed') {
      completed.push(row);
    } else if (status !== 'cancelled') {
      upcoming.push(row);
    }
  }
  upcoming.sort((a, b) => startDateValue(a) - startDateValue(b));
  completed.sort((a, b) => endDateValue(b) - endDateValue(a));
  return { upcoming, completed };
}
