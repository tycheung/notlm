import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EventsAPI } from '../api/events';
import { SquadsAPI } from '../api/squads';
import { roundRelationshipApi } from '../services/roundRelationshipApi';
import { EventParticipantWithUser } from '../types/event';
import { SquadRead } from '../types/squad';

interface UseSquadManagementProps {
  eventId: number;
  selectedRoundId: number | null;
}

interface UseSquadManagementReturn {
  /** Squads for the selected round only (or all event squads when no round is selected). */
  squads: SquadRead[];
  /** Every squad on the event; use for round relevance, lock status by round, etc. */
  allEventSquads: SquadRead[];
  participants: EventParticipantWithUser[];
  roundRelationships: any[];
  outgoingRelationships: any[];
  loadingSquads: boolean;
  loadingParticipants: boolean;
  squadsError: any;
  expandedCategories: { [categoryId: string]: boolean };
  toggleCategory: (categoryId: string) => void;
  updateExpandedState: (squadParticipants: { [squadId: number]: any[] }, unassignedParticipants?: any[]) => void;
}

export const useSquadManagement = ({
  eventId,
  selectedRoundId
}: UseSquadManagementProps): UseSquadManagementReturn => {
  const [expandedCategories, setExpandedCategories] = useState<{ [categoryId: string]: boolean }>({});

  // Fetch squads for this event
  const { data, isLoading: loadingSquads, error: squadsError } = useQuery({
    queryKey: ['eventSquads', eventId],
    queryFn: () => SquadsAPI.getAllEventSquads(eventId),
    enabled: !!eventId,
  });
  const allEventSquads = data ?? [];

  const squads = useMemo(
    () =>
      selectedRoundId
        ? (allEventSquads || []).filter((squad) => squad.round_id === selectedRoundId)
        : (allEventSquads || []),
    [selectedRoundId, allEventSquads]
  );

  // Initialize expanded categories when squads change
  useEffect(() => {
    if (squads.length > 0 && Object.keys(expandedCategories).length === 0) {
      const initialExpanded: { [categoryId: string]: boolean } = {};
      // Add unassigned category - will be set based on whether it has participants
      initialExpanded['unassigned'] = false; // Will be updated when we know participant count
      // Add all squads - will be set based on whether they have participants
      squads.forEach(squad => {
        initialExpanded[squad.id.toString()] = false; // Will be updated when we know participant count
      });
      setExpandedCategories(initialExpanded);
    }
  }, [squads, expandedCategories]);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  }, []);

  // Update expanded state based on participant counts
  const updateExpandedState = useCallback((
    squadParticipants: { [squadId: number]: any[] },
    unassignedParticipants?: any[]
  ) => {
    setExpandedCategories(prev => {
      let changed = false;
      const newState = { ...prev };
      
      // Update unassigned category
      if (unassignedParticipants !== undefined) {
        const next = unassignedParticipants.length > 0;
        if (newState['unassigned'] !== next) {
          newState['unassigned'] = next;
          changed = true;
        }
      }
      
      // Update squad categories (stay expanded when locked so a brief empty refetch does not hide rosters)
      squads.forEach(squad => {
        const participantCount = squadParticipants[squad.id]?.length || 0;
        const key = squad.id.toString();
        const next = participantCount > 0 || Boolean(squad.locked_in);
        if (newState[key] !== next) {
          newState[key] = next;
          changed = true;
        }
      });
      
      return changed ? newState : prev;
    });
  }, [squads]);

  // Fetch event participants
  const { data: participantsData, isLoading: loadingParticipants } = useQuery({
    queryKey: ['eventParticipants', eventId],
    queryFn: () => EventsAPI.getEventParticipants(eventId, 'approved'),
    enabled: !!eventId,
  });
  const participants = useMemo(
    () => participantsData?.filter(p => p.status !== 'withdrawn') ?? [],
    [participantsData]
  );

  // Fetch round relationships for this event
  const { data: roundRelationships } = useQuery({
    queryKey: ['roundRelationships', eventId],
    queryFn: () =>
      roundRelationshipApi.getAllRoundRelationshipsForEvent(eventId, { active_only: true }),
    enabled: !!eventId,
  });

  // Get outgoing relationships for the selected round (advancement criteria OUT of this round)
  const outgoingRelationships = useMemo(() => {
    if (!selectedRoundId || !roundRelationships) return [];
    return roundRelationships
      .filter((rel: any) => rel.source_round_id === selectedRoundId)
      .sort(
        (a: any, b: any) =>
          Number(a.execution_order ?? 0) - Number(b.execution_order ?? 0)
      );
  }, [selectedRoundId, roundRelationships]);

  return {
    squads,
    allEventSquads,
    participants,
    roundRelationships: roundRelationships || [],
    outgoingRelationships,
    loadingSquads,
    loadingParticipants,
    squadsError,
    expandedCategories,
    toggleCategory,
    updateExpandedState
  };
};
