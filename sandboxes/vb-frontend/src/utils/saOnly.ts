import type { TournamentRead } from '../types/tournament';

export function isSaOnlyTournament(
  tournament?: { is_sa_only?: boolean } | null
): boolean {
  return Boolean(tournament?.is_sa_only);
}

export function partitionSaOnlyTournaments(tournaments: TournamentRead[]): {
  saOnly: TournamentRead[];
  full: TournamentRead[];
} {
  return {
    saOnly: tournaments.filter((t) => t.is_sa_only),
    full: tournaments.filter((t) => !t.is_sa_only),
  };
}

export function saOnlyTournamentIdSet(tournaments: TournamentRead[]): Set<number> {
  return new Set(tournaments.filter((t) => t.is_sa_only).map((t) => t.id));
}
