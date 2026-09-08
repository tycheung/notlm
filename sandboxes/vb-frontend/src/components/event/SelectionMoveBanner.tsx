import React, { useState } from 'react';
import Button from '../common/Button';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface SelectionMoveBannerProps {
  selectedCount: number;
  isTeamEvent: boolean;
  availableSquads: Array<{ id: string; name: string }>;
  onMove: (targetSquadId: string) => void;
  onClearSelection: () => void;
}

const SelectionMoveBanner: React.FC<SelectionMoveBannerProps> = ({
  selectedCount,
  isTeamEvent,
  availableSquads,
  onMove,
  onClearSelection
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSquadId, setSelectedSquadId] = useState<string>('');

  const handleMove = () => {
    if (selectedSquadId) {
      onMove(selectedSquadId);
      setSelectedSquadId('');
      setIsDropdownOpen(false);
    } else {
    }
  };

  const handleSquadSelect = (squadId: string) => {
    setSelectedSquadId(squadId);
  };

  if (selectedCount === 0) {
    return null;
  }

  const itemType = isTeamEvent ? 'teams' : 'participants';
  const itemTypeSingular = isTeamEvent ? 'team' : 'participant';
  const itemTypePlural = isTeamEvent ? 'teams' : 'participants';

  return (
    <div className="bg-surface-light border border-border border-l-4 border-l-primary rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{selectedCount}</span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-text">
              {selectedCount} {selectedCount === 1 ? itemTypeSingular : itemTypePlural} selected
            </h3>
            <p className="text-sm text-text-muted">
              Choose a squad to move the selected {selectedCount === 1 ? itemTypeSingular : itemTypePlural} to
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="lightbackground"
            size="small"
            onClick={onClearSelection}
          >
            Clear Selection
          </Button>
          
          <div className="relative">
            <Button
              variant="darkbackground"
              size="small"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2"
            >
              <span>Move selected {selectedCount === 1 ? itemTypeSingular : itemTypePlural}</span>
              <ExpandMoreIcon className="h-4 w-4" />
            </Button>
            
            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-surface-light border border-border rounded-md shadow-lg z-10 overflow-hidden">
                <div className="py-1">
                  {availableSquads.map((squad) => (
                    <button
                      key={squad.id}
                      type="button"
                      onClick={() => handleSquadSelect(squad.id)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        selectedSquadId === squad.id
                          ? 'bg-primary/15 text-primary'
                          : 'text-text hover:bg-surface bg-surface-light'
                      }`}
                    >
                      {squad.name}
                    </button>
                  ))}
                </div>
                
                {selectedSquadId && (
                  <div className="border-t border-border p-2">
                    <Button
                      variant="darkbackground"
                      size="small"
                      onClick={handleMove}
                      className="w-full"
                    >
                      Move to {availableSquads.find(s => s.id === selectedSquadId)?.name}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectionMoveBanner;
