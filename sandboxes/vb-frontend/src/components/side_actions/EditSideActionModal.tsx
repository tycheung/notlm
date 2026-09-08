import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import SideActionForm from './SideActionForm';
import Alert from '../common/Alert';
import { SideActionsAPI } from '../../api/side-actions';
import { CreateSideActionRequest, SideAction, UpdateSideActionRequest } from '../../types/side_action';
import Loading from '../common/Loading';
import {
  clearSideActionDraft,
  loadSideActionDraft,
} from '../../utils/sideActionDraftStorage';
import { getErrorMessage } from '../../api/apiErrors';
import { normalizePatchPayload } from '../../api/payloadNormalization';
import type { EventHandicapDefaults } from './EventSideActionsPanel';

interface EditSideActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sideActionId: number;
  eventId?: number;
  eventGameCount?: number;
  eventHandicap?: EventHandicapDefaults;
  allowTeamEntry?: boolean;
}

const EditSideActionModal: React.FC<EditSideActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sideActionId,
  eventId,
  eventGameCount,
  eventHandicap,
  allowTeamEntry = true,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sideAction, setSideAction] = useState<SideAction | null>(null);
  const requestVersionRef = useRef(0);

  // Fetch side action details when modal opens
  useEffect(() => {
    if (!isOpen || !sideActionId) return;
    const requestVersion = ++requestVersionRef.current;
    setSideAction(null);
    setError(null);
    setLoading(true);
    void SideActionsAPI.getSideAction(sideActionId)
      .then((data) => {
        if (requestVersion === requestVersionRef.current) setSideAction(data);
      })
      .catch((err: unknown) => {
        if (requestVersion === requestVersionRef.current) {
          setError(getErrorMessage(err, 'Failed to load side action details'));
        }
      })
      .finally(() => {
        if (requestVersion === requestVersionRef.current) setLoading(false);
      });
    return () => {
      requestVersionRef.current += 1;
    };
  }, [isOpen, sideActionId]);

  const handleSubmit = async (formData: CreateSideActionRequest) => {
    try {
      // Convert CreateSideActionRequest to UpdateSideActionRequest
      const normalizedCustomPayout = formData.custom_payout_structure?.trim() || null;
      const usesCustomPayout = !!normalizedCustomPayout;
      const normalizedHouseCutType = formData.house_cut_type;
      // Flat $ → house_cut_amount. Per-entry $ → house_cut_percentage (brackets convention).
      const normalizedHouseCutPercentage =
        normalizedHouseCutType === 'amount'
          ? 0
          : (formData.house_cut_percentage ?? formData.house_cut_amount ?? 0);
      const normalizedHouseCutAmount =
        normalizedHouseCutType === 'amount'
          ? (formData.house_cut_amount ?? 0)
          : normalizedHouseCutType === 'dollars_per_entry'
            ? null
            : (formData.house_cut_amount ?? null);
      const updateData: UpdateSideActionRequest = {
        name: formData.name,
        description: formData.description,
        entry_fee: formData.entry_fee,
        max_participants: formData.max_participants,
        house_cut_percentage: normalizedHouseCutPercentage,
        house_cut_amount: normalizedHouseCutAmount,
        house_cut_type: normalizedHouseCutType,
        game_numbers: formData.game_numbers,
        squad_scope_mode: formData.squad_scope_mode,
        selected_squad_ids: formData.selected_squad_ids,
        pool_overrides: formData.pool_overrides,
        check_in_required: formData.check_in_required,
        type_config: formData.type_config,
        prize_distribution: usesCustomPayout ? {} : (formData.prize_distribution ?? {}),
        prize_type: formData.prize_type,
        custom_payout_structure: normalizedCustomPayout
      };
      
      await SideActionsAPI.updateSideAction(sideActionId, normalizePatchPayload(updateData));
      if (sideAction) {
        clearSideActionDraft(sideAction.tournament_id, sideAction.event_id, sideActionId);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update side action'));
      throw err; // Re-throw to let form component know there was an error
    }
  };

  const restoredDraft =
    isOpen && sideAction
      ? loadSideActionDraft(sideAction.tournament_id, sideAction.event_id, sideActionId)
      : null;

  if (loading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Side Action"
        size="large"
        closeOnOutsideClick={false}
      >
        <Loading />
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Side Action: ${sideAction?.name || ''}`}
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
      
      {sideAction?.id === sideActionId && (
        <SideActionForm
          tournamentId={sideAction.tournament_id}
          eventId={eventId ?? sideAction.event_id}
          eventGameCount={eventGameCount}
          entryCount={sideAction.current_entries ?? 0}
          onSubmit={handleSubmit}
          restoredDraft={restoredDraft}
          draftPersistence={{ mode: 'edit', sideActionId }}
          initialData={{
            name: sideAction.name,
            tournament_id: sideAction.tournament_id,
            event_id: sideAction.event_id,
            side_action_type: sideAction.side_action_type,
            description: sideAction.description,
            entry_fee: sideAction.entry_fee,
            max_participants: sideAction.max_participants,
            house_cut_percentage: sideAction.house_cut_percentage,
            house_cut_amount: sideAction.house_cut_amount,
            house_cut_type: sideAction.house_cut_type,
            prize_type: sideAction.prize_type,
            game_numbers: sideAction.game_numbers,
            squad_scope_mode: sideAction.squad_scope_mode,
            selected_squad_ids: sideAction.pools
              .filter((pool) => pool.is_enabled)
              .map((pool) => pool.squad_id),
            pool_overrides: {},
            check_in_required: sideAction.check_in_required,
            type_config: sideAction.type_config,
            prize_distribution: sideAction.prize_distribution || {},
            custom_payout_structure: sideAction.custom_payout_structure
          }}
          isUpdate={true}
          fixedSideActionType={sideAction.side_action_type}
          eventHandicap={eventHandicap}
          allowTeamEntry={allowTeamEntry}
        />
      )}
    </Modal>
  );
};

export default EditSideActionModal; 
