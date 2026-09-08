import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { EventLanesAPI } from './api';
import { invalidateEventLaneQueries } from './invalidateEventLaneQueries';
import { eventLaneBoardQueryKey } from './useEventLaneBoard';
import type {
  ApplyLaneAssignmentsPayload,
  AutoBatchLaneAssignmentPayload,
  LaneEngineConfig,
  LanePair,
  StampLaneGamesPayload,
} from './types';

export function eventLaneManagementQueryKey(eventId: number) {
  return ['eventLaneManagement', eventId] as const;
}

export function eventLaneScoreSheetQueryKey(
  eventId: number,
  roundId: number,
  squadId?: number | null
) {
  return ['eventLaneScoreSheet', eventId, roundId, squadId ?? null] as const;
}

export function useEventLaneManagement(
  eventId: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: eventLaneManagementQueryKey(eventId),
    enabled: options?.enabled !== false && eventId > 0,
    queryFn: () => EventLanesAPI.getManagement(eventId),
  });
}

export function useLaneScoreSheet(
  eventId: number,
  roundId: number | null,
  squadId?: number | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: eventLaneScoreSheetQueryKey(eventId, roundId ?? 0, squadId),
    enabled:
      options?.enabled !== false &&
      eventId > 0 &&
      roundId != null &&
      roundId > 0,
    queryFn: () => EventLanesAPI.getScoreSheet(eventId, roundId!, squadId ?? undefined),
  });
}

export function useUpdateLaneEngine(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      payload: Partial<LaneEngineConfig> & {
        propagate_to_squads?: boolean;
        only_without_override?: boolean;
        inherit_tournament?: boolean;
        event_override?: Record<string, unknown>;
        reserved_lanes_expression?: string;
      }
    ) => EventLanesAPI.updateEngine(eventId, payload),
    onSuccess: async () => {
      await invalidateEventLaneQueries(queryClient, eventId);
    },
  });
}

export function useApplyLaneAssignments(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyLaneAssignmentsPayload) =>
      EventLanesAPI.applyAssignments(eventId, payload),
    onSuccess: async () => {
      await invalidateEventLaneQueries(queryClient, eventId);
    },
  });
}

export function useAutoBatchLanes(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AutoBatchLaneAssignmentPayload = {}) =>
      EventLanesAPI.autoBatch(eventId, payload),
    onSuccess: async (_data, variables) => {
      await invalidateEventLaneQueries(queryClient, eventId, {
        roundId: variables.round_id ?? null,
      });
    },
  });
}

export function useUpdateSquadPairs(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ squadId, pairs }: { squadId: number; pairs: LanePair[] }) =>
      EventLanesAPI.updateSquadPairs(eventId, squadId, pairs),
    onSuccess: async () => {
      await invalidateEventLaneQueries(queryClient, eventId);
    },
  });
}

export function useInheritSquadPairs(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (squadId: number) => EventLanesAPI.inheritSquadPairs(eventId, squadId),
    onSuccess: async () => {
      await invalidateEventLaneQueries(queryClient, eventId);
    },
  });
}

export function useStampLaneGames(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StampLaneGamesPayload = {}) =>
      EventLanesAPI.stampGames(eventId, payload),
    onSuccess: async (_data, variables) => {
      await invalidateEventLaneQueries(queryClient, eventId, {
        roundId: variables.round_id ?? null,
      });
    },
  });
}

export function useCopyLanesFromRound(eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      source_round_id: number;
      target_round_id: number;
      stamp?: boolean;
    }) => EventLanesAPI.copyFromRound(eventId, payload),
    onSuccess: async (_data, variables) => {
      await invalidateEventLaneQueries(queryClient, eventId, {
        roundId: variables.target_round_id,
      });
    },
  });
}

export { eventLaneBoardQueryKey };
