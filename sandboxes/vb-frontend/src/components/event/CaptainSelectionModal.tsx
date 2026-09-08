import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Label from '../common/Label';
import { EventParticipantWithUser } from '../../types/event_participant';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';

interface CaptainSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: EventParticipantWithUser[];
  currentCaptainId: number | null;
  teamName: string;
  onSelectCaptain: (newCaptainUserId: number) => void;
}

const CaptainSelectionModal: React.FC<CaptainSelectionModalProps> = ({
  isOpen,
  onClose,
  teamMembers,
  currentCaptainId,
  teamName,
  onSelectCaptain
}) => {
  const [selectedCaptainUserId, setSelectedCaptainUserId] = useState<number | null>(currentCaptainId);

  const handleSubmit = () => {
    if (selectedCaptainUserId && selectedCaptainUserId !== currentCaptainId) {
      onSelectCaptain(selectedCaptainUserId);
    }
    onClose();
  };

  const handleCancel = () => {
    setSelectedCaptainUserId(currentCaptainId);
    onClose();
  };

  // Reset selection when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedCaptainUserId(currentCaptainId);
    }
  }, [isOpen, currentCaptainId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Select Captain for ${teamName}`}
      size="medium"
    >
      <div className="space-y-4">
        <div className="text-sm text-text-muted mb-4">
          Choose a team member to be the new captain. The change is applied as soon as you confirm.
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-text-muted mb-3">
            Team Members
          </Label>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {teamMembers.map((member) => (
              <div
                key={member.user_id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedCaptainUserId === member.user_id
                    ? 'border-yellow-400 bg-pending/15'
                    : 'border-border hover:border-border hover:bg-surface-light'
                }`}
                onClick={() => setSelectedCaptainUserId(member.user_id)}
              >
                <div className="flex items-center flex-1">
                  {member.user_id === currentCaptainId ? (
                    <StarIcon className="w-5 h-5 text-yellow-600 mr-3" />
                  ) : (
                    <PersonIcon className="w-5 h-5 text-text-dim mr-3" />
                  )}
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text">
                      {member.user_name}
                      {member.user_id === currentCaptainId && (
                        <span className="ml-2 text-xs text-yellow-600 font-semibold">
                          (Current Captain)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted">
                      {member.user_email || 'No email'}
                    </div>
                  </div>
                  
                  {selectedCaptainUserId === member.user_id && (
                    <div className="ml-2">
                      <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-surface rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="lightbackground"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="darkbackground"
            onClick={handleSubmit}
            disabled={!selectedCaptainUserId || selectedCaptainUserId === currentCaptainId}
          >
            Select Captain
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CaptainSelectionModal; 