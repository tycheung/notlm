import React, { useState, useMemo } from 'react';
import { EventParticipantWithUser } from '../../types/event';
import Button from '../common/Button';
import TableSearchInput from '../common/TableSearchInput';
import CloseIcon from '@mui/icons-material/Close';

interface ReEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: EventParticipantWithUser[];
  onReEnterParticipants: (selectedParticipantIds: number[]) => void;
  isLoading?: boolean;
}

const ReEntryModal: React.FC<ReEntryModalProps> = ({
  isOpen,
  onClose,
  participants,
  onReEnterParticipants,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<number>>(new Set());

  // Filter participants based on search term
  const filteredParticipants = useMemo(() => {
    if (!searchTerm.trim()) return participants;
    
    return participants.filter(participant =>
      participant.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [participants, searchTerm]);

  const handleParticipantToggle = (participantId: number) => {
    setSelectedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedParticipants(new Set(filteredParticipants.map(p => p.id)));
  };

  const handleClearAll = () => {
    setSelectedParticipants(new Set());
  };

  const handleReEnter = () => {
    if (selectedParticipants.size > 0) {
      onReEnterParticipants(Array.from(selectedParticipants));
      setSelectedParticipants(new Set());
      setSearchTerm('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedParticipants(new Set());
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text">Re-enter Participants</h2>
          <Button
            variant="icon"
            size="small"
            onClick={handleClose}
            className="p-1"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-border">
          <TableSearchInput
            placeholder="Search participants by name or email..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-full"
          />
        </div>

        {/* Participant List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredParticipants.length === 0 ? (
            <div className="text-center text-text-muted py-8">
              {searchTerm ? 'No participants match your search.' : 'No participants available.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-surface-light"
                >
                  <input
                    type="checkbox"
                    id={`participant-${participant.id}`}
                    checked={selectedParticipants.has(participant.id)}
                    onChange={() => handleParticipantToggle(participant.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded"
                  />
                  <label
                    htmlFor={`participant-${participant.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium text-text">{participant.user_name}</div>
                    {participant.user_email && (
                      <div className="text-sm text-text-muted">{participant.user_email}</div>
                    )}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-surface-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-text-muted">
                {selectedParticipants.size} participant{selectedParticipants.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="lightbackground"
                  size="small"
                  onClick={handleSelectAll}
                  disabled={filteredParticipants.length === 0}
                >
                  Select All
                </Button>
                <Button
                  variant="lightbackground"
                  size="small"
                  onClick={handleClearAll}
                  disabled={selectedParticipants.size === 0}
                >
                  Clear All
                </Button>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="lightbackground"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="darkbackground"
                onClick={handleReEnter}
                disabled={selectedParticipants.size === 0 || isLoading}
              >
                {isLoading ? 'Re-entering...' : 'Re-enter Participants'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReEntryModal; 