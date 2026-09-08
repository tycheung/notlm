import React from 'react';
import { DragDropItem } from '../common/DragDropCategorizedTable';
import { EventParticipantWithUser } from '../../types/event';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';

interface ParticipantItemProps {
  item: DragDropItem;
  isDragging?: boolean;
  pendingAssignmentChanges: { [participantId: number]: any };
  onStageReEntryRemoval: (participantKey: number, participant: EventParticipantWithUser) => void;
  onUndoRemoval: (participantKey: number) => void;

  listeners?: DraggableSyntheticListeners;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({
  item,
  isDragging = false,
  pendingAssignmentChanges,
  onStageReEntryRemoval,
  onUndoRemoval,
  
  listeners
}) => {
  if (!item.data) return <div>Invalid Item</div>;
  
  const participant = item.data as EventParticipantWithUser & { squadParticipantId?: number };
  if (!participant) return <div>Invalid Participant</div>;
  
  // For re-entries, use squad_participant_id as the key; for regular entries, use event_participant_id
  // This ensures re-entries are treated as separate entities with their own game shells
  const participantKey = participant.is_reentry && participant.squadParticipantId 
    ? participant.squadParticipantId  // Re-entries use their squad participant ID as the key
    : participant.id;                 // Regular entries use event participant ID
  
  const hasPendingChange = pendingAssignmentChanges[participantKey];
  // Check for re-entries in both pending changes and actual participant data
  // For saved re-entries, check participant.is_reentry; for pending re-entries, check hasPendingChange.is_reentry
  const isReEntry = hasPendingChange?.is_reentry || participant.is_reentry || false;
  const isPendingRemoval = hasPendingChange?.isRemoval || false;
  
  // Debug logging for re-entry detection
  
  /** Pool origin may be on the participant or only on staged pending metadata after drag. */
  const isPoolParticipant =
    Boolean((participant as any).is_pool_participant) ||
    Boolean(hasPendingChange?.isPoolParticipant) ||
    Boolean(hasPendingChange?.poolEntryId);
  const advancementPosition = (participant as any).advancement_position;
  const advancementCriteriaType = (participant as any).advancement_criteria_type;
  const advancementCriteriaValue = (participant as any).advancement_criteria_value;
  const sourceRoundFriendlyName = (participant as any).source_round_friendly_name;
  const sourceRoundNumber = (participant as any).source_round_number;
  
  // Format the advancement criteria value for display
  const formatAdvancementValue = (type: string, value: number) => {
    if (type === 'highest_average' || type === 'highest_handicap_average') {
      return value.toFixed(1);
    } else {
      return Math.round(value).toString();
    }
  };
  
  const formattedAdvancementValue = advancementCriteriaType && advancementCriteriaValue 
    ? formatAdvancementValue(advancementCriteriaType, advancementCriteriaValue)
    : advancementCriteriaValue;
  
  const handleStageReEntryRemoval = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!participant || !participant.id) return;
    
    
    if (hasPendingChange?.is_reentry && !hasPendingChange.fromSquadId) {
      // Unsaved pending re-entry: remove from pending changes
      onUndoRemoval(participantKey);
    } else if (isReEntry) {
      // Saved re-entry: stage for removal
      onStageReEntryRemoval(participantKey, participant);
    } else {
    }
  };
  
  const handleUndoRemoval = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!participant || !participant.id) return;
    
    onUndoRemoval(participantKey);
  };
  
  /** Dark-theme chips only — light Tailwind bg-*-100 reads as white box + light text on this UI. */
  const statusChipClasses = (() => {
    if (isPendingRemoval) return 'line-through text-red-500 cursor-pointer';
    if (isPoolParticipant) {
      return [
        'px-2 py-1 rounded border text-text bg-surface-light border-violet-500/50',
        hasPendingChange && 'ring-1 ring-sky-400/50',
        isDragging && 'font-semibold',
      ]
        .filter(Boolean)
        .join(' ');
    }
    if (hasPendingChange) {
      return [
        'px-2 py-1 rounded border text-text bg-surface-light border-sky-500/50 ring-1 ring-sky-400/40',
        isDragging && 'font-semibold',
      ]
        .filter(Boolean)
        .join(' ');
    }
    if (isReEntry) {
      return [
        'px-2 py-1 rounded border text-text bg-surface-light border-emerald-500/50',
        isDragging && 'font-semibold',
      ]
        .filter(Boolean)
        .join(' ');
    }
    return [isDragging && 'font-semibold'].filter(Boolean).join(' ');
  })();

  return (
    <div className="flex items-center justify-between" {...listeners}>
      <div className="flex items-center">
        <span className={statusChipClasses}
          onClick={isPendingRemoval ? handleUndoRemoval : undefined}
        >
          {participant.user_name}
          {hasPendingChange && !isPendingRemoval && (
            <span className="ml-1 text-xs text-sky-400 font-medium">*</span>
          )}
          {isReEntry && !isPendingRemoval && (
            <span className="ml-1 text-xs text-emerald-400 font-medium">
              (RE-ENTRY{participant.round_entry_number && participant.round_entry_number > 1 ? ` #${participant.round_entry_number}` : ''})
            </span>
          )}
          {participant.duplicate_entry && !isPendingRemoval && (
            <span className="ml-1 text-xs text-amber-400 font-medium">
              (DUPLICATE{participant.duplicate_entry_count ? ` x${participant.duplicate_entry_count}` : ''})
            </span>
          )}
          {isPoolParticipant && !isPendingRemoval && (
            <span className="ml-1 text-xs text-violet-400 font-medium">
              ({sourceRoundFriendlyName || `Round ${sourceRoundNumber || 'Unknown'}`})
            </span>
          )}
          {isPendingRemoval && (
            <span className="ml-1 text-xs text-red-600 font-medium">(Pending Removal - Click to Undo)</span>
          )}
        </span>
        {isReEntry && !isPendingRemoval && (
          <button
            onClick={handleStageReEntryRemoval}
            className="ml-2 text-red-500 hover:text-red-700 text-sm font-bold bg-transparent border-transparent hover:bg-transparent hover:border-transparent focus:bg-transparent focus:border-transparent"
            title="Remove re-entry"
          >
            ×
          </button>
        )}
        {/* Debug info for delete button */}
      </div>
    </div>
  );
};

export default ParticipantItem;
