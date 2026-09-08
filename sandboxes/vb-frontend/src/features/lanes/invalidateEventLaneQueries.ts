import type { QueryClient } from '@tanstack/react-query';

export async function invalidateEventLaneQueries(
  queryClient: QueryClient,
  eventId: number,
  options?: { roundId?: number | null }
): Promise<void> {
  const { roundId } = options ?? {};
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['eventLaneBoard', eventId] }),
    queryClient.invalidateQueries({ queryKey: ['eventLaneManagement', eventId] }),
    ...(roundId != null && roundId > 0
      ? [
          queryClient.invalidateQueries({
            queryKey: ['eventLaneScoreSheet', eventId, roundId],
          }),
        ]
      : [
          queryClient.invalidateQueries({
            queryKey: ['eventLaneScoreSheet', eventId],
          }),
        ]),
  ]);
}
