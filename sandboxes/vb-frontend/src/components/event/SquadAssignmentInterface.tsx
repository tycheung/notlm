import React from 'react';
import DragDropCategorizedTable, { 
  DragDropItem, 
  DragDropCategory, 
  DragDropResult 
} from '../common/DragDropCategorizedTable';
import ReEntryModal from './ReEntryModal';
import { EventParticipantWithUser } from '../../types/event';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

interface SquadAssignmentInterfaceProps {
  categories: DragDropCategory[];
  onDrop: (result: DragDropResult) => void;
  renderItem: (item: DragDropItem, isDragging?: boolean) => React.ReactNode;
  isLoading: boolean;
  onReEntryModalOpen: (squadId: number) => void;
  isReEntryAllowed: boolean;
  reEntryModalOpen: boolean;
  onReEntryModalClose: () => void;
  onReEnterParticipants: (selectedParticipantIds: number[]) => void;
  participants: EventParticipantWithUser[];
  isSquadReEntryAllowed: (squadId: number) => boolean;
  emptyMessage?: string;
  className?: string;
}

const SquadAssignmentInterface: React.FC<SquadAssignmentInterfaceProps> = ({
  categories,
  onDrop,
  renderItem,
  isLoading,
  onReEntryModalOpen,
  isReEntryAllowed,
  reEntryModalOpen,
  onReEntryModalClose,
  onReEnterParticipants,
  participants,
  isSquadReEntryAllowed,
  emptyMessage,
  className
}) => {
  // Render function for squad category headers with re-entry buttons
  const renderSquadHeader = (category: DragDropCategory) => {
    // Only show re-entry button for actual squads (not unassigned) and if re-entries are allowed
    if (category.id === 'unassigned') {
      return null;
    }
    
    const squadId = parseInt(category.id);
    if (isNaN(squadId)) return null;
    
    const reEntryAllowed = isSquadReEntryAllowed(squadId);
    
    if (!reEntryAllowed) {
      return null;
    }
    
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReEntryModalOpen(squadId);
          }}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 border border-blue-400"
          title="Add re-entry participants"
        >
          <PersonAddIcon className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div>
      <DragDropCategorizedTable
        categories={categories}
        onDrop={onDrop}
        renderItem={renderItem}
        renderCategoryHeader={renderSquadHeader}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        className={className}
      />
      
      {isReEntryAllowed && (
        <ReEntryModal
          isOpen={reEntryModalOpen}
          onClose={onReEntryModalClose}
          participants={participants}
          onReEnterParticipants={onReEnterParticipants}
        />
      )}
    </div>
  );
};

export default SquadAssignmentInterface;
