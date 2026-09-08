import React from 'react';
import ConfirmDialog from '../common/ConfirmDialog';

interface SquadUnlockConfirmDialogProps {
  squadId: number | null;
  onClose: () => void;
  onConfirmUnlock: (squadId: number) => void;
}

const SquadUnlockConfirmDialog: React.FC<SquadUnlockConfirmDialogProps> = ({
  squadId,
  onClose,
  onConfirmUnlock,
}) => (
  <ConfirmDialog
    isOpen={squadId != null}
    onClose={onClose}
    onConfirm={() => {
      if (squadId != null) {
        onConfirmUnlock(squadId);
      }
      onClose();
    }}
    title="Unlock this squad?"
    message="This deletes all game shells and scores for this squad only. Other squads in the round are not affected."
    confirmText="Unlock squad"
    cancelText="Cancel"
    confirmVariant="danger"
  />
);

export default SquadUnlockConfirmDialog;
