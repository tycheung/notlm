import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdvancementPoolAPI } from '../api/advancement-pool';
import { EventParticipantWithUser } from '../types/event';
import { getCurrentTimezoneNaiveISOString } from '../utils/dateUtils';

interface UseAdvancementPoolProps {
  selectedRoundId: number | null;
  participants: EventParticipantWithUser[];
  squadParticipants: { [squadId: number]: any[] };
  roundRelationships: any[];
}

interface UseAdvancementPoolReturn {
  allPoolParticipants: any[];
  unassignedParticipants: EventParticipantWithUser[];
  loadingPoolParticipants: boolean;
  /** True when the selected round has at least one relationship feeding into it */
  hasIncomingRelationships: boolean;
  isInitialRound: boolean;
}

export const useAdvancementPool = ({
  selectedRoundId,
  participants,
  squadParticipants,
  roundRelationships
}: UseAdvancementPoolProps): UseAdvancementPoolReturn => {
  // Relationships whose target is the selected round (flow graph / bracket edges into this round)
  const relsTargetingSelectedRound = useMemo(() => {
    if (!selectedRoundId || !roundRelationships || !Array.isArray(roundRelationships)) return false;
    return roundRelationships.some(
      (rel: any) => Number(rel?.target_round_id) === Number(selectedRoundId)
    );
  }, [selectedRoundId, roundRelationships]);

  // Always fetch pool rows for the selected round when one is selected. Gating on
  // relationships alone skipped GET /advancement-pool/round/{id} when the relationship
  // list was empty/stale/filtered even though the DB had pool rows.
  const { data: allPoolParticipants, isLoading: loadingPoolParticipants } = useQuery({
    queryKey: ['allPoolParticipants', selectedRoundId],
    queryFn: () => selectedRoundId ? AdvancementPoolAPI.getPoolParticipants(selectedRoundId) : Promise.resolve([]),
    enabled: !!selectedRoundId,
  });

  /** True when this round receives advancers (graph edge into round, or pool rows exist). */
  const isBracketRound = useMemo(() => {
    if (!selectedRoundId) return false;
    if (relsTargetingSelectedRound) return true;
    return Array.isArray(allPoolParticipants) && allPoolParticipants.length > 0;
  }, [selectedRoundId, relsTargetingSelectedRound, allPoolParticipants]);

  const poolFetchSettled = !!selectedRoundId && !loadingPoolParticipants;

  /**
   * Qualifying / first round: no bracket signal and pool GET has finished empty.
   * While pool is loading we stay "not initial" so we do not flash the full registrant list
   * on rounds that are actually bracket targets.
   */
  const isInitialRound = useMemo(() => {
    if (!selectedRoundId) return false;
    if (!poolFetchSettled) return false;
    return !isBracketRound;
  }, [selectedRoundId, poolFetchSettled, isBracketRound]);

  const hasIncomingRelationships = isBracketRound;

  // Calculate unassigned participants based on round type
  const unassignedParticipants = useMemo(() => {
    if (!selectedRoundId) return [];

    // Get all participants currently assigned to squads in this round
    const assignedParticipantIds = new Set<number>();
    Object.values(squadParticipants || {}).forEach(squadParticipantList => {
      if (Array.isArray(squadParticipantList)) {
        squadParticipantList.forEach((squadParticipant: any) => {
          if (squadParticipant.event_participant_id) {
            assignedParticipantIds.add(squadParticipant.event_participant_id);
          }
        });
      }
    });

    const participantByEventParticipantId = new Map<number, EventParticipantWithUser>(
      (participants || []).map((p: EventParticipantWithUser) => [p.id, p])
    );

    if (isInitialRound) {
      // For initial rounds: use event participants that are not assigned to squads
      return (participants || []).filter(participant => 
        participant && 
        participant.id && 
        !assignedParticipantIds.has(participant.id)
      );
    } else {
      // For bracket rounds: use advancement pool participants tied to incoming edges
      if (!allPoolParticipants || !Array.isArray(allPoolParticipants)) {
        return [];
      }

      const poolForRound = allPoolParticipants.filter(
        (p: any) => p && Number(p.target_round_id) === Number(selectedRoundId)
      );

      let incomingRelationships = (roundRelationships || []).filter(
        (rel: any) => rel && Number(rel.target_round_id) === Number(selectedRoundId)
      );

      // Pool rows exist but the relationship list did not include this edge (stale graph fetch, etc.)
      if (incomingRelationships.length === 0 && poolForRound.length > 0) {
        const relIds = Array.from(
          new Set(
            poolForRound
              .map((p: any) => Number(p.advancement_relationship_id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          )
        );
        incomingRelationships = relIds.map((rid) => {
          const fromGraph = (roundRelationships || []).find((r: any) => Number(r?.id) === rid);
          return (
            fromGraph || {
              id: rid,
              target_round_id: selectedRoundId,
              description: undefined,
              advancement_filter: undefined,
              advancement_type: undefined,
            }
          );
        });
      }

      const unassigned: EventParticipantWithUser[] = [];
      const seenEventParticipantIds = new Set<number>();

      const effectiveRelationships =
        incomingRelationships.length > 0
          ? incomingRelationships
          : [{ id: null, target_round_id: selectedRoundId }];

      effectiveRelationships.forEach((relationship: any) => {
        if (!relationship) return;

        const poolParticipantsForRelationship = relationship.id
          ? poolForRound.filter(
              (poolParticipant: any) =>
                poolParticipant &&
                Number(poolParticipant.advancement_relationship_id) === Number(relationship.id)
            )
          : poolForRound;
        
        // Debug logging for pool participants removed to prevent console spam
        
        poolParticipantsForRelationship.forEach((poolParticipant: any) => {
          if (!poolParticipant) return;
          
          // Debug logging for individual pool participant
          if (
            poolParticipant.event_participant_id &&
            !assignedParticipantIds.has(poolParticipant.event_participant_id) &&
            !seenEventParticipantIds.has(Number(poolParticipant.event_participant_id))
          ) {
            seenEventParticipantIds.add(Number(poolParticipant.event_participant_id));
            // Convert pool participant to EventParticipantWithUser format
            const matchedParticipant = participantByEventParticipantId.get(Number(poolParticipant.event_participant_id));

            const checked_in = matchedParticipant?.checked_in ?? false;
            const checked_in_at = matchedParticipant?.checked_in_at ?? null;
            const payment_status = matchedParticipant?.payment_status ?? false;
            const paid_amount = matchedParticipant?.paid_amount ?? null;
            const entry_fee_paid = payment_status;

            const convertedParticipant: EventParticipantWithUser & {
              is_pool_participant: boolean;
              pool_entry_id: number;
              advancement_position: number;
              advancement_criteria_type: string;
              advancement_criteria_value: number;
              source_round_id: number;
              target_round_id: number;
              advancement_relationship_id: number;
              source_round_friendly_name?: string;
              source_round_number?: number;
              relationship_description?: string;
              relationship_advancement_filter?: string;
              relationship_advancement_type?: string;
            } = {
              id: poolParticipant.event_participant_id,
              event_id: poolParticipant.event_id,
              user_id: poolParticipant.user_id,
              user_name: poolParticipant.user
                ? `${poolParticipant.user.first_name} ${poolParticipant.user.last_name}`
                : 'Unknown User',
              user_email: poolParticipant.user?.email || '',
              status: matchedParticipant?.status || 'approved',
              entry_number: matchedParticipant?.entry_number || 1,
              entry_fee_paid: entry_fee_paid,
              payment_status: payment_status,
              checked_in: checked_in,
              checked_in_at: checked_in_at,
              paid_amount,
              registered_at:
                matchedParticipant?.registered_at ||
                poolParticipant.created_at ||
                getCurrentTimezoneNaiveISOString(),
              // Mark as pool participant for special handling
              is_pool_participant: true,
              pool_entry_id: poolParticipant.id,
              advancement_position: poolParticipant.advancement_position,
              advancement_criteria_type: poolParticipant.advancement_criteria_type,
              advancement_criteria_value: poolParticipant.advancement_criteria_value,
              // Add pool-specific data
              source_round_id: poolParticipant.source_round_id,
              target_round_id: poolParticipant.target_round_id,
              advancement_relationship_id: poolParticipant.advancement_relationship_id,
              // Add source round information for display
              source_round_friendly_name: poolParticipant.source_round?.friendly_name || `Round ${poolParticipant.source_round?.round_number || 'Unknown'}`,
              source_round_number: poolParticipant.source_round?.round_number,
              // Add relationship information for debugging
              relationship_description: relationship.description,
              relationship_advancement_filter: relationship.advancement_filter,
              relationship_advancement_type: relationship.advancement_type
            };
            
            unassigned.push(convertedParticipant);
          }
        });
      });

      return unassigned.sort(
        (a: any, b: any) =>
          Number(a?.advancement_position ?? Number.MAX_SAFE_INTEGER) -
          Number(b?.advancement_position ?? Number.MAX_SAFE_INTEGER)
      );
    }
  }, [selectedRoundId, allPoolParticipants, participants, squadParticipants, roundRelationships, isInitialRound]);

  return {
    allPoolParticipants: allPoolParticipants || [],
    unassignedParticipants,
    loadingPoolParticipants,
    hasIncomingRelationships,
    isInitialRound
  };
};
