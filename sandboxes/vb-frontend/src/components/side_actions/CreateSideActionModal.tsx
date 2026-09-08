import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import SideActionForm from './SideActionForm';
import Alert from '../common/Alert';
import { SideActionsAPI } from '../../api/side-actions';
import { CreateSideActionRequest, SideActionType } from '../../types/side_action';
import {
  clearSideActionDraft,
  loadSideActionDraft,
} from '../../utils/sideActionDraftStorage';
import { getErrorMessage } from '../../api/apiErrors';
import type { EventHandicapDefaults } from './EventSideActionsPanel';

interface CreateSideActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tournamentId: number;
  eventId?: number;
  eventGameCount?: number;
  /** When set, the type selector is hidden and this type is used. */
  fixedSideActionType?: SideActionType;
  modalTitle?: string;
  initialData?: Partial<CreateSideActionRequest>;
  eventHandicap?: EventHandicapDefaults;
  allowTeamEntry?: boolean;
}

const CreateSideActionModal: React.FC<CreateSideActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tournamentId,
  eventId,
  eventGameCount,
  fixedSideActionType,
  modalTitle = 'Create Side Action',
  initialData,
  eventHandicap,
  allowTeamEntry = true,
}) => {
  const [error, setError] = useState<string | null>(null);

  const restoredDraft =
    isOpen && eventId ? loadSideActionDraft(tournamentId, eventId, 'create') : null;

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen, tournamentId]);

  const handleSubmit = async (formData: CreateSideActionRequest) => {
    if (!formData.name?.trim()) {
      setError('Side action name is required.');
      return;
    }
    setError(null);
    try {
      await SideActionsAPI.createSideAction(formData);
      clearSideActionDraft(tournamentId, formData.event_id, 'create');
      onSuccess();
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Failed to create side action');
      setError(message);
      throw err;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="large"
      closeOnOutsideClick={false}
    >
      {error && (
        <Alert
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}
      
      <SideActionForm
        tournamentId={tournamentId}
        eventId={eventId}
        eventGameCount={eventGameCount}
        onSubmit={handleSubmit}
        restoredDraft={restoredDraft}
        draftPersistence={{ mode: 'create' }}
        fixedSideActionType={fixedSideActionType}
        initialData={
          eventId
            ? { ...initialData, event_id: eventId }
            : initialData
        }
        eventHandicap={eventHandicap}
        allowTeamEntry={allowTeamEntry}
      />
    </Modal>
  );
};

export default CreateSideActionModal; 
