import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Label from '../../common/Label';
import Input from '../../common/Input';
import Alert from '../../common/Alert';
import ConfirmDialog from '../../common/ConfirmDialog';
import { FinalNodeRead } from '../../../types/event';
import { EventsAPI } from '../../../api/events';
import { getErrorMessage } from '../../../api/apiErrors';

export interface FinalNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  node?: FinalNodeRead | null;
  onSaved: () => void;
  onDeleted?: () => void;
}

const FinalNodeModal: React.FC<FinalNodeModalProps> = ({
  isOpen,
  onClose,
  eventId,
  node,
  onSaved,
  onDeleted,
}) => {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteConfirmMessage = useMemo(() => {
    if (!node) return '';
    return `Are you sure you want to delete "${node.name}"? Connected exit relationships will be removed.`;
  }, [node]);

  const resetFromNode = useCallback(() => {
    if (node) {
      setName(node.name);
    } else {
      setName('');
    }
    setError(null);
  }, [node]);

  useEffect(() => {
    if (isOpen) {
      resetFromNode();
    }
  }, [isOpen, resetFromNode, node?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      if (node) {
        await EventsAPI.updateFinalNode(eventId, node.id, {
          name: trimmed,
        });
      } else {
        await EventsAPI.createFinalNode(eventId, {
          event_id: eventId,
          name: trimmed,
          is_active: true,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save exit node.'));
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async () => {
    if (!node) return;
    setDeleting(true);
    setError(null);
    try {
      await EventsAPI.deleteFinalNode(eventId, node.id);
      setShowDeleteConfirm(false);
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete exit node.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={node ? 'Edit exit node' : 'Add exit node'}
        size="large"
        closeOnOutsideClick={false}
      >
        {error && (
          <Alert variant="error" message={error} onDismiss={() => setError(null)} className="mb-4" />
        )}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <Label required>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
          </div>
          <p className="text-sm text-text-muted">
            Payout and advancement sizing are managed from relationships and payout configuration screens.
          </p>

          <div
            className={
              node
                ? 'flex justify-between gap-2 pt-6 border-t border-border'
                : 'flex justify-end gap-2 pt-4 border-t border-border'
            }
          >
            <div>
              {node && (
                <Button
                  type="button"
                  variant="darkbackground"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving || deleting}
                >
                  Delete exit node
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="lightbackground" onClick={onClose} disabled={saving || deleting}>
                Cancel
              </Button>
              <Button type="submit" variant="darkbackground" disabled={saving || deleting}>
                {saving ? 'Saving…' : node ? 'Save changes' : 'Create exit node'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        onConfirm={() => void performDelete()}
        title="Delete exit node?"
        message={node ? deleteConfirmMessage : ''}
        confirmText={deleting ? 'Deleting…' : 'Delete'}
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </>
  );
};

export default FinalNodeModal;
