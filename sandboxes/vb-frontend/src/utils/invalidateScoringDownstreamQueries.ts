import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate queries affected by score or round game-count changes
 * (advancement pools, championship/payout, roster, and game rows).
 */
export async function invalidateScoringDownstreamQueries(
  queryClient: QueryClient,
  eventId: number,
  options?: { roundId?: number | null; selectedRoundId?: number | null }
): Promise<void> {
  const { roundId, selectedRoundId } = options ?? {};
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] }),
    queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] }),
    queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] }),
    queryClient.invalidateQueries({ queryKey: ['eventRounds'] }),
    queryClient.invalidateQueries({ queryKey: ['squadGames'] }),
    queryClient.invalidateQueries({ queryKey: ['roundGames'] }),
    queryClient.invalidateQueries({ queryKey: ['roundParticipants'] }),
    queryClient.invalidateQueries({ queryKey: ['roundMatchSeries'] }),
    queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] }),
    queryClient.invalidateQueries({ queryKey: ['eventChampionshipResults', eventId] }),
    queryClient.invalidateQueries({ queryKey: ['advancementPoolByRelationship'] }),
    queryClient.invalidateQueries({ queryKey: ['orderedTargetRoundEntrants'] }),
    queryClient.invalidateQueries({ queryKey: ['highGameStandings'] }),
    queryClient.invalidateQueries({ queryKey: ['highSetStandings'] }),
    queryClient.invalidateQueries({ queryKey: ['eliminatorStandings'] }),
    ...(roundId != null && roundId > 0
      ? [queryClient.invalidateQueries({ queryKey: ['roundWithGames', roundId] })]
      : []),
    ...(selectedRoundId != null && selectedRoundId > 0
      ? [
          queryClient.invalidateQueries({
            queryKey: ['allPoolParticipants', selectedRoundId],
          }),
          queryClient.invalidateQueries({
            queryKey: ['orderedTargetRoundEntrants', selectedRoundId],
          }),
        ]
      : []),
  ]);
}
