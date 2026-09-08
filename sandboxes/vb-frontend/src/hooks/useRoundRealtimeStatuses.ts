import { useQuery } from '@tanstack/react-query';
import { RoundsAPI, RoundRealTimeStatus } from '../api/rounds';

function fallbackStatus(roundId: number): RoundRealTimeStatus {
  return {
    round_id: roundId,
    status: 'NOT STARTED',
    total_games: 0,
    scored_games: 0,
    pending_games: 0,
    all_scored: false,
    total_expected_games: 0,
    completed_games: 0,
    in_progress_games: 0
  };
}

/**
 * Fetches GET /rounds/{id}/real-time-status for each round (backend completion snapshot).
 * Shared by Squads & Games (useRoundManagement) and Event Info flow preview.
 */
export function useRoundRealtimeStatuses(
  eventId: number | undefined,
  rounds: { id: number; status?: string }[] | undefined
) {
  const roundIdsKey = rounds?.length
    ? [...rounds.map((r) => r.id)].sort((a, b) => a - b).join(',')
    : '';

  return useQuery({
    queryKey: ['roundRealTimeStatus', eventId, roundIdsKey],
    queryFn: async () => {
      if (!eventId || !rounds?.length) return {};
      const statuses = await Promise.all(
        rounds.map(async (round) => {
          try {
            const status = await RoundsAPI.getRoundRealTimeStatus(round.id);
            return [round.id, status] as const;
          } catch (error) {
            console.error(`Failed to get real-time status for round ${round.id}:`, error);
            return [round.id, fallbackStatus(round.id)] as const;
          }
        })
      );
      return Object.fromEntries(statuses);
    },
    enabled: !!eventId && !!rounds?.length,
    refetchInterval: 10000,
    staleTime: 2000
  });
}
