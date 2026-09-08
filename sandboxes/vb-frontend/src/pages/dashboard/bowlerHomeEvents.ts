export const NOT_ASSIGNED = 'not assigned';

export type BowlerHomeRegistrationStatus = 'pending' | 'approved' | 'withdrawn';

export type BowlerHomeEvent = {
  id: number;
  name: string;
  tournament_id: number;
  tournament_name: string;
  start_date: string;
  end_date: string;
  registration_status: BowlerHomeRegistrationStatus | string;
  squad_label: string;
  squad_start?: string | null;
  lane_label: string;
  pair_label: string;
};

export type BowlerHomeEvents = {
  in_progress: BowlerHomeEvent[];
  upcoming: BowlerHomeEvent[];
  completed: BowlerHomeEvent[];
};

export function isAcceptedRegistration(status: string | undefined): boolean {
  return status === 'approved';
}

export function uniqueTournamentCount(rows: BowlerHomeEvent[]): number {
  return new Set(rows.map((row) => row.tournament_id)).size;
}
