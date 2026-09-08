import type { QueryClient } from '@tanstack/react-query';

/** Shared event-relationship query key (flow diagram + Event Details / squads). */
export const tournamentFlowRelationshipsQueryKey = (eventId: number) =>
  ['roundRelationships', eventId] as const;

/**
 * Invalidate React Query caches that mirror event flow structure (rounds, relationships,
 * final nodes, prize distribution, event aggregate). Call after server-side structure
 * replace (e.g. format apply) so UI does not merge stale final nodes with fresh edges.
 */
export function invalidateEventFlowStructureQueries(
  queryClient: QueryClient,
  eventId: number
): void {
  void queryClient.invalidateQueries({ queryKey: ['eventRounds', eventId] });
  void queryClient.invalidateQueries({ queryKey: tournamentFlowRelationshipsQueryKey(eventId) });
  void queryClient.invalidateQueries({ queryKey: ['eventFinalNodes', eventId] });
  void queryClient.invalidateQueries({ queryKey: ['eventPrizeDistribution', eventId] });
  void queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
}
