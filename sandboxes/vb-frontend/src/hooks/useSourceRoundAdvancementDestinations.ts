import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AdvancementPoolAPI } from '../api/advancement-pool';
import { EventsAPI } from '../api/events';
import type { FinalNodeRead } from '../types/event';
import type { EventTeamWithMembers } from '../types/event_team';
import {
  buildAdvancementDestinationMap,
  type AdvancementDestinationMap,
} from '../utils/advancementDestinations';

export interface UseSourceRoundAdvancementDestinationsArgs {
  eventId: number | null | undefined;
  selectedRoundId: number | null | undefined;
  outgoingRelationships: Array<{
    id: number;
    source_round_id?: number;
    target_round_id?: number | null;
    final_node_id?: number | null;
  }>;
  rounds?: Array<{
    id: number;
    friendly_name?: string | null;
    round_number?: number | null;
    name?: string;
  }>;
  finalNodes?: FinalNodeRead[];
  teams?: EventTeamWithMembers[];
  enabled?: boolean;
}

export function useSourceRoundAdvancementDestinations({
  eventId,
  selectedRoundId,
  outgoingRelationships,
  rounds = [],
  finalNodes = [],
  teams = [],
  enabled = true,
}: UseSourceRoundAdvancementDestinationsArgs): {
  destinationMap: AdvancementDestinationMap;
  isLoading: boolean;
} {
  const poolRelationships = useMemo(
    () =>
      (outgoingRelationships || []).filter(
        (r) => r?.target_round_id != null && Number(r.target_round_id) > 0
      ),
    [outgoingRelationships]
  );

  const poolQueries = useQueries({
    queries: poolRelationships.map((rel) => ({
      queryKey: ['advancementPoolByRelationship', rel.id],
      queryFn: () => AdvancementPoolAPI.getPoolByRelationship(Number(rel.id)),
      enabled: Boolean(enabled && selectedRoundId && rel.id),
    })),
  });

  const { data: championshipResults, isLoading: loadingChampionship } = useQuery({
    queryKey: ['eventChampionshipResults', eventId],
    queryFn: () => EventsAPI.getEventChampionshipResults(eventId as number),
    enabled: Boolean(enabled && eventId),
  });

  const poolByRelationshipId = useMemo(() => {
    const out: Record<number, import('../api/advancement-pool').AdvancementPoolRead[]> = {};
    poolRelationships.forEach((rel, idx) => {
      out[Number(rel.id)] = poolQueries[idx]?.data ?? [];
    });
    return out;
  }, [poolRelationships, poolQueries]);

  const destinationMap = useMemo(() => {
    if (!selectedRoundId) return new Map();
    return buildAdvancementDestinationMap({
      selectedRoundId,
      outgoingRelationships: outgoingRelationships || [],
      poolByRelationshipId,
      championshipResults: championshipResults ?? null,
      rounds,
      finalNodes,
      teams,
    });
  }, [
    selectedRoundId,
    outgoingRelationships,
    poolByRelationshipId,
    championshipResults,
    rounds,
    finalNodes,
    teams,
  ]);

  const isLoading =
    loadingChampionship || poolQueries.some((q) => q.isLoading);

  return { destinationMap, isLoading };
}
