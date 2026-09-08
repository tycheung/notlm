import { useState, useCallback } from 'react';
import { EventParticipantWithUser } from '../types/event';
import { DragDropResult } from '../components/common/DragDropCategorizedTable';

/** Unassigned is represented as null, undefined, or the category id "unassigned". */
export function normalizeSquadCategoryId(v: string | null | undefined): string | null {
  if (v === null || v === undefined || v === 'unassigned') return null;
  return v;
}

interface PendingAssignmentChanges {
  [participantId: number]: {
    fromSquadId: string | null; // null for unassigned, string for squad id
    toSquadId: string | null; // null for unassigned, string for squad id
    participant: EventParticipantWithUser;
    is_reentry: boolean; // Added for re-entry tracking
    originalId?: number; // For re-entries, the original participant ID
    isRemoval?: boolean; // Flag for pending removal
    squadParticipantId?: number; // For re-entries, the specific squad_participant_id
    // Pool participant fields
    isPoolParticipant?: boolean; // Flag for pool participants
    poolEntryId?: number; // ID of the advancement pool entry
  };
}

interface UseAssignmentChangesProps {
  squadParticipants: { [squadId: number]: any[] };
  squads: any[];
  selectedRoundId: number | null;
  unassignedParticipants: EventParticipantWithUser[];
  participants: EventParticipantWithUser[]; // Add full participants array for re-entries
}

interface UseAssignmentChangesReturn {
  pendingAssignmentChanges: PendingAssignmentChanges;
  handleDragDropAssignment: (result: DragDropResult) => void;
  handleReEntryModalOpen: (squadId: number) => void;
  handleReEnterParticipants: (selectedParticipantIds: number[], targetSquadId: number) => void;
  getOriginalSquadAssignment: (participantId: number) => string | null;
  getCurrentSquadAssignment: (participantId: number) => string | null;
  clearAssignmentChanges: () => void;
  handleStageReEntryRemoval: (participantKey: number, participant: EventParticipantWithUser) => void;
  handleUndoRemoval: (participantKey: number) => void;
  setPendingAssignmentChanges: React.Dispatch<React.SetStateAction<PendingAssignmentChanges>>;
}

export const useAssignmentChanges = ({
  squadParticipants,
  squads,
  selectedRoundId,
  unassignedParticipants,
  participants
}: UseAssignmentChangesProps): UseAssignmentChangesReturn => {
  const [pendingAssignmentChanges, setPendingAssignmentChanges] = useState<PendingAssignmentChanges>({});

  // Get the original squad assignment for a participant (before any pending changes)
  const getOriginalSquadAssignment = useCallback((participantId: number): string | null => {
    if (!participantId) return null;

    for (const squadIdKey of Object.keys(squadParticipants)) {
      const squadParticipantsList =
        squadParticipants[Number(squadIdKey)] ?? (squadParticipants as any)[squadIdKey] ?? [];
      const assigned = squadParticipantsList.some(
        (sp: any) => sp.event_participant_id === participantId
      );
      if (!assigned) continue;

      const squad = squads?.find(s => s.id.toString() === squadIdKey);
      if (selectedRoundId != null) {
        if (squad && squad.round_id !== selectedRoundId) continue;
      }
      return squadIdKey;
    }

    return null;
  }, [squadParticipants, squads, selectedRoundId]);

  // Get current squad assignment for a participant (considering pending changes)
  const getCurrentSquadAssignment = useCallback((participantId: number): string | null => {
    if (!participantId) return null;

    const pendingChange = pendingAssignmentChanges[participantId];
    if (pendingChange) {
      return normalizeSquadCategoryId(pendingChange.toSquadId);
    }

    return getOriginalSquadAssignment(participantId);
  }, [pendingAssignmentChanges, getOriginalSquadAssignment]);

  // Handle drag and drop assignment changes
  const handleDragDropAssignment = useCallback((result: DragDropResult) => {
    
    const participant = result.item.data as EventParticipantWithUser;
    if (!participant || !participant.id) {
      return;
    }
    
    // Check if this is a pool participant
    const isPoolParticipant = (participant as any).is_pool_participant;
    const poolEntryId = (participant as any).pool_entry_id;
    
    // Get the actual current squad assignment (ignoring pending changes for this calculation)
    const currentSquadId = getOriginalSquadAssignment(participant.id);
    const toSquadId = result.toCategoryId === 'unassigned' ? null : result.toCategoryId;
    const originalSquadId = getOriginalSquadAssignment(participant.id);
    const currentConsideringPending = getCurrentSquadAssignment(participant.id);

    const dest = normalizeSquadCategoryId(toSquadId);
    const currentCat = normalizeSquadCategoryId(currentConsideringPending);

    // Don't add change if it's the same as current assignment (compare normalized ids)
    if (currentCat === dest) {
      return;
    }

    const squadCategoryLocked = (catId: string | null | undefined): boolean => {
      if (catId == null || catId === 'unassigned') return false;
      const n = parseInt(String(catId), 10);
      if (!Number.isFinite(n)) return false;
      const sq = squads.find((s: any) => s.id === n);
      return Boolean(sq?.locked_in);
    };
    if (squadCategoryLocked(result.fromCategoryId) || squadCategoryLocked(result.toCategoryId)) {
      return;
    }

    // For pool participants, stage the change just like regular participants
    // Don't immediately call the backend API - let it be handled by Save Changes
    if (isPoolParticipant && poolEntryId) {
      // Stage the change in pendingAssignmentChanges
      setPendingAssignmentChanges(prev => ({
        ...prev,
        [participant.id]: {
          fromSquadId: currentSquadId, // Use the actual current squad assignment
          toSquadId,
          participant,
          is_reentry: false,
          // Include pool-specific data for later processing
          isPoolParticipant: true,
          poolEntryId: poolEntryId
        }
      }));
      return;
    }

    // If moving back to original position, remove from pending changes
    
    if (normalizeSquadCategoryId(toSquadId) === normalizeSquadCategoryId(originalSquadId)) {
      
      // Keep logs visible longer
      setTimeout(() => {
      }, 100);
      
      setPendingAssignmentChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[participant.id];
        
        // Keep this log visible longer
        setTimeout(() => {
        }, 200);
        
        return newChanges;
      });
      
      // Keep the main log visible longer
      setTimeout(() => {
      }, 300);
      
      return;
    }
    
    // Log what happened if undo condition was not met

    // Check if this participant already has a pending change
    const existingChange = pendingAssignmentChanges[participant.id];
    if (existingChange) {
      // If they're moving to a different position than their pending change, update it
      if (normalizeSquadCategoryId(existingChange.toSquadId) !== normalizeSquadCategoryId(toSquadId)) {
        setPendingAssignmentChanges(prev => ({
          ...prev,
          [participant.id]: {
            ...existingChange,
            toSquadId,
            fromSquadId: originalSquadId
          }
        }));
        return;
      } else {
        // Same destination, no change needed
        return;
      }
    }

    // Only track as pending change if it's different from original position
    setPendingAssignmentChanges(prev => ({
      ...prev,
      [participant.id]: {
        fromSquadId: originalSquadId, // Use original position as "from"
        toSquadId,
        participant,
        is_reentry: false, // Drag-drop is always 1-to-1, no cloning
        isPoolParticipant: isPoolParticipant || false,
        poolEntryId: poolEntryId
      }
    }));
  }, [
    squadParticipants,
    squads,
    unassignedParticipants,
    getOriginalSquadAssignment,
    getCurrentSquadAssignment,
    pendingAssignmentChanges,
  ]);

  // Handle re-entry removal staging
  const handleStageReEntryRemoval = useCallback((participantKey: number, participant: EventParticipantWithUser & { squadParticipantId?: number }) => {
    
    // For saved re-entries, we need to find the squad they're currently assigned to
    // Since participantKey is the squad_participant_id for re-entries, we need to find the squad
    let fromSquadId: string | null = null;
    
    // Search through all squads to find which one contains this squad participant
    for (const squad of squads || []) {
      const squadParticipantsList = squadParticipants[squad.id] || [];
      const foundParticipant = squadParticipantsList.find(sp => sp.id === participantKey);
      if (foundParticipant) {
        fromSquadId = squad.id.toString();
        break;
      }
    }
    
    if (!fromSquadId) {
      console.error('❌ Could not find squad for re-entry participant:', {
        participantKey,
        participantName: participant.user_name,
        squadParticipantId: participant.squadParticipantId
      });
      return;
    }

    const fromSquadNumeric = parseInt(fromSquadId, 10);
    const fromSquadRow = squads?.find((s) => s.id === fromSquadNumeric);
    if (fromSquadRow?.locked_in) {
      return;
    }
    
    
    // For saved re-entries, we need to stage them for removal
    // The participantKey should be the squad participant ID for re-entries
    setPendingAssignmentChanges(prev => ({
      ...prev,
      [participantKey]: {
        fromSquadId: fromSquadId,
        toSquadId: null, // Remove from squad
        participant: participant,
        is_reentry: true,
        originalId: participant.id,
        isRemoval: true,
        squadParticipantId: participant.squadParticipantId // This is crucial for backend deletion
      }
    }));
    
  }, [getCurrentSquadAssignment, squads, squadParticipants]);

  // Handle undo removal
  const handleUndoRemoval = useCallback((participantKey: number) => {
    setPendingAssignmentChanges(prev => {
      const newChanges = { ...prev };
      if (newChanges[participantKey]) {
        delete newChanges[participantKey].isRemoval;
        if (Object.keys(newChanges[participantKey]).length === 0) {
          delete newChanges[participantKey];
        }
      }
      return newChanges;
    });
  }, []);

  // Handle re-entry modal open
  const handleReEntryModalOpen = useCallback((_squadId: number) => {
    // This will be handled by the parent component
    // The hook just provides the interface
  }, []);

  // Handle re-enter participants
  const handleReEnterParticipants = useCallback((selectedParticipantIds: number[], targetSquadId: number) => {

    if (squads?.some((s) => s.id === targetSquadId && s.locked_in)) {
      return;
    }
    
    selectedParticipantIds.forEach((originalParticipantId) => {
      
      // Find the participant in the full participants array (like the old file did)
      const participant = participants.find(p => p && p.id === originalParticipantId);
      if (!participant || !participant.id) {
        return;
      }
      

      // Create a temporary negative ID for UI - this will be the NEW squad participant ID
      // (different from the original participant's squad participant ID)
      const tempSquadParticipantId = -Math.floor(Math.random() * 1000000) - 1;

      // Create a cloned participant for pending re-entry
      // The re-entry keeps the same event_participant_id but gets a new squad_participant_id
      const clonedParticipant: EventParticipantWithUser & { squadParticipantId?: number } = {
        ...participant,
        id: participant.id, // Keep the original event_participant_id
        is_reentry: true,
        squadParticipantId: tempSquadParticipantId // This is the NEW squad participant ID
      };


      // Add to pending changes using the NEW squad participant ID as the key
      setPendingAssignmentChanges(prev => {
        const newChanges = {
          ...prev,
          [tempSquadParticipantId]: {
            fromSquadId: null, // Re-entries start unassigned
            toSquadId: targetSquadId.toString(),
            participant: clonedParticipant,
            is_reentry: true,
            originalId: originalParticipantId, // Keep reference to original for backend processing
            // The key difference: this re-entry will create a NEW squad participant record
            // with its own game shells, separate from the original participant
          }
        };
        return newChanges;
      });
    });
  }, [participants, squads]);

  // Clear all assignment changes
  const clearAssignmentChanges = useCallback(() => {
    setPendingAssignmentChanges({});
  }, []);

  return {
    pendingAssignmentChanges,
    handleDragDropAssignment,
    handleReEntryModalOpen,
    handleReEnterParticipants,
    getOriginalSquadAssignment,
    getCurrentSquadAssignment,
    clearAssignmentChanges,
    handleStageReEntryRemoval,
    handleUndoRemoval,
    setPendingAssignmentChanges,
  };
};
