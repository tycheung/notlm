import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';

export interface ParticipantAssignUsbcModalProps {
  target: { name: string } | null;
  onClose: () => void;
  onSubmit: (usbcId: string) => Promise<void>;
  error: string | null;
  submitting: boolean;
}

/**
 * Replace a temporary USBC placeholder with a real membership ID.
 */
const ParticipantAssignUsbcModal: React.FC<ParticipantAssignUsbcModalProps> = ({
  target,
  onClose,
  onSubmit,
  error,
  submitting,
}) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (target) setValue('');
  }, [target]);

  return (
    <Modal
      isOpen={!!target}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Assign real USBC ID"
    >
      {target && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Replace the temporary ID for <strong>{target.name}</strong> with their USBC number.
          </p>
          {error && (
            <div className="p-3 text-sm text-red-700 bg-danger/15 rounded border border-red-200">
              {error}
            </div>
          )}
          <Input
            label="USBC ID"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fullWidth
            autoComplete="off"
            placeholder="e.g. from membership card"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="lightbackground"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="darkbackground"
              onClick={() => void onSubmit(value)}
              isLoading={submitting}
              disabled={submitting}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ParticipantAssignUsbcModal;
