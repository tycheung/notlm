import React, { useState } from 'react';
import { DragDropItem } from '../common/DragDropCategorizedTable';
import { EventTeamWithMembers } from '../../types/event_team';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GroupIcon from '@mui/icons-material/Group';
import StarIcon from '@mui/icons-material/Star';
import StopIcon from '@mui/icons-material/Stop';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface TeamItemProps {
  item: DragDropItem;
  isDragging?: boolean;
  pendingAssignmentChanges: { [teamId: number]: any };
  onStageReEntryRemoval?: (teamKey: number, team: EventTeamWithMembers) => void;
  onUndoRemoval?: (teamKey: number) => void;
  listeners?: DraggableSyntheticListeners;
}

const TeamItem: React.FC<TeamItemProps> = ({
  item,
  isDragging = false,
  pendingAssignmentChanges,
  onStageReEntryRemoval,
  onUndoRemoval,
  listeners
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!item.data) return <div>Invalid Item</div>;
  
  const team = item.data as EventTeamWithMembers;
  if (!team) return <div>Invalid Team</div>;
  
  // Debug logging to see what team data we're getting
  
  const teamKey = team.id;
  const hasPendingChange = pendingAssignmentChanges[teamKey];
  const isReEntry = hasPendingChange?.is_reentry || team.is_reentry || false;
  const isPendingRemoval = hasPendingChange?.isRemoval || false;
  const expectedTeamSize =
    typeof team.expected_team_size === 'number' && team.expected_team_size > 0
      ? team.expected_team_size
      : null;
  const memberCount = team.member_count ?? team.members?.length ?? 0;
  const isIncomplete = expectedTeamSize != null ? memberCount < expectedTeamSize : false;
  const hasDuplicateMembers = (team.members || []).some(
    (member: any) => member?.duplicate_entry === true || (member?.duplicate_entry_count || 0) > 1
  );
  
  const handleToggleExpansion = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleStageReEntryRemoval = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!team || !team.id) return;
    
    if (onStageReEntryRemoval) {
      onStageReEntryRemoval(teamKey, team);
    }
  };
  
  const handleUndoRemoval = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!team || !team.id) return;
    
    if (onUndoRemoval) {
      onUndoRemoval(teamKey);
    }
  };
  
  return (
    <div className="w-full">
      {/* Team Header */}
      <div className="flex items-center justify-between" {...listeners}>
        <div className="flex items-center flex-1">
          <button
            onClick={handleToggleExpansion}
            className="mr-2 p-1 hover:bg-border rounded transition-colors"
            style={{ 
              backgroundColor: 'transparent', 
              border: 'none',
              outline: 'none',
              boxShadow: 'none'
            }}
            title={isExpanded ? "Collapse team" : "Expand team"}
          >
            {isExpanded ? (
              <ExpandLessIcon className="w-4 h-4 text-text-muted" />
            ) : (
              <ExpandMoreIcon className="w-4 h-4 text-text-muted" />
            )}
          </button>
          
          <GroupIcon className="w-4 h-4 text-sky-400 mr-2" />
          
          <span
            className={[
              isDragging && 'font-semibold',
              hasPendingChange &&
                !isPendingRemoval &&
                'px-2 py-1 rounded border text-text bg-surface-light border-sky-500/50 ring-1 ring-sky-400/40',
              isReEntry &&
                !isPendingRemoval &&
                !hasPendingChange &&
                'px-2 py-1 rounded border text-text bg-surface-light border-emerald-500/50',
              isPendingRemoval && 'line-through text-red-500 cursor-pointer',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={isPendingRemoval ? handleUndoRemoval : undefined}
          >
            {team.display_name || `Team ${team.team_number}`}
            {isIncomplete && (
              <span
                className="ml-2 inline-flex align-middle text-danger"
                title={`Incomplete team, ${memberCount}/${expectedTeamSize} members`}
              >
                <StopIcon className="w-4 h-4" />
              </span>
            )}
            {hasDuplicateMembers && (
              <span
                className="ml-1 inline-flex align-middle text-amber-500"
                title="Duplicate entries detected for one or more team members"
              >
                <WarningAmberIcon className="w-4 h-4" />
              </span>
            )}
            {hasPendingChange && !isPendingRemoval && (
              <span className="ml-1 text-xs text-sky-400 font-medium">*</span>
            )}
            {isReEntry && !isPendingRemoval && (
              <span className="ml-1 text-xs text-emerald-400 font-medium">
                (RE-ENTRY{team.entry_number && team.entry_number > 1 ? ` #${team.entry_number}` : ''})
              </span>
            )}
            {isPendingRemoval && (
              <span className="ml-1 text-xs text-red-600 font-medium">(Pending Removal - Click to Undo)</span>
            )}
          </span>
          
          {isReEntry && !isPendingRemoval && onStageReEntryRemoval && (
            <button
              onClick={handleStageReEntryRemoval}
              className="ml-2 text-red-500 hover:text-red-700 text-sm font-bold bg-transparent border-transparent hover:bg-transparent hover:border-transparent focus:bg-transparent focus:border-transparent"
              title="Remove re-entry"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="text-xs text-text-muted">
          {memberCount}
          {expectedTeamSize != null ? `/${expectedTeamSize}` : ''} member
          {memberCount !== 1 ? 's' : ''}
        </div>
      </div>
      
      {/* Team Members (Expanded View) */}
      {isExpanded && team.members && team.members.length > 0 && (
        <div className="ml-8 mt-2 space-y-1">
          {team.members.map((member, index) => {
            // Debug logging to see what data we're getting
            
            // Debug full member object
            
            return (
              <div key={member.id || index} className="flex items-center text-sm text-text-muted">
                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                  {member.is_captain ? (
                    <StarIcon className="w-3 h-3 text-yellow-500" title="Captain" />
                  ) : (
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  )}
                </div>
                <span className="flex-1">
                  {member.user_name || member.user_email || (member as { user?: { name?: string } }).user?.name || 'Unknown Member'}
                  {member.is_captain && (
                    <span className="ml-1 text-xs text-yellow-600 font-medium">(Captain)</span>
                  )}
                </span>
                <span className="text-xs text-text-dim">
                  Position {member.position}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamItem;
