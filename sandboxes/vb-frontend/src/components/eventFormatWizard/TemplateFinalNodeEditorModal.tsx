import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { GUIDE_IDS } from '../../features/director-guide/guideIds';

export interface TemplateFinalNodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Record<string, unknown> | null;
  isNew: boolean;
  onSave: (next: Record<string, unknown>) => void;
  onDelete?: () => void;
}

const TemplateFinalNodeEditorModal: React.FC<TemplateFinalNodeEditorModalProps> = ({
  isOpen,
  onClose,
  draft,
  isNew,
  onSave,
  onDelete,
}) => {
  const [local, setLocal] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLocal(null);
      return;
    }
    if (draft) {
      const copy = JSON.parse(JSON.stringify(draft)) as Record<string, unknown>;
      setLocal(copy);
      return;
    }
    if (isNew) {
      setLocal({
        ref: `final_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        name: 'Championship',
        display_order: 0,
        is_active: true,
        placement_count: 0,
      });
      return;
    }
    setLocal(null);
  }, [isOpen, draft, isNew]);

  if (!local) return null;

  const handleSave = () => {
    onSave({ ...local });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Add exit node (template)' : 'Edit exit node (template)'}
      size="large"
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            {!isNew && onDelete && (
              <Button type="button" variant="danger" onClick={onDelete}>
                Remove exit node
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="lightbackground" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="darkbackground" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <Input
          label="Name"
          data-guide-id={GUIDE_IDS.FORMAT_FINAL_NAME}
          value={String(local.name ?? '')}
          onChange={(e) => setLocal({ ...local, name: e.target.value })}
          fullWidth
        />
        <Input
          label="Placement count (how many paid / ranked)"
          type="number"
          min={0}
          data-guide-id={GUIDE_IDS.FORMAT_FINAL_PLACEMENT}
          value={String(local.placement_count ?? 0)}
          onChange={(e) =>
            setLocal({
              ...local,
              placement_count: Math.max(0, parseInt(e.target.value, 10) || 0),
            })
          }
          fullWidth
        />
      </div>
    </Modal>
  );
};

export default TemplateFinalNodeEditorModal;
