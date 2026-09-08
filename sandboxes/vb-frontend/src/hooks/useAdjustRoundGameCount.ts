import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RoundsAPI } from '../api/rounds';
import { invalidateScoringDownstreamQueries } from '../utils/invalidateScoringDownstreamQueries';

export type AdjustRoundGameCountVariables = {
  delta: 1 | -1;
  confirm_delete_scored?: boolean;
};

/**
 * Optimistic +/- for round game_count on eventComplete; reconciles on settle.
 * After apply-format, rely on invalidation/refetch — do not keep stale optimistic counts.
 */
export function useAdjustRoundGameCount(
  eventId: number,
  roundId: number | null,
  selectedRoundId: number | null = roundId
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: AdjustRoundGameCountVariables) => {
      if (!roundId) {
        throw new Error('No round selected');
      }
      return RoundsAPI.adjustRoundGameCount(roundId, vars);
    },
    onMutate: async (vars) => {
      if (!roundId) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: ['eventComplete', eventId] });
      const previous = queryClient.getQueryData(['eventComplete', eventId]);
      queryClient.setQueryData(['eventComplete', eventId], (current: any) => {
        if (!current?.rounds) return current;
        return {
          ...current,
          rounds: current.rounds.map((r: { id: number; game_count?: number }) =>
            r.id === roundId
              ? {
                  ...r,
                  game_count: Math.max(1, (r.game_count ?? 0) + vars.delta),
                }
              : r
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['eventComplete', eventId], context.previous);
      }
    },
    onSettled: async () => {
      await invalidateScoringDownstreamQueries(queryClient, eventId, {
        roundId,
        selectedRoundId,
      });
    },
  });
}
