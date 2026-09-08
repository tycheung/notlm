import React, { useState, ReactNode, useRef } from 'react';
import { cardOuterBase, cardVariantDefault } from './cardSurface';
import Button from './Button';
import SectionTitle from './SectionTitle';
import EditIcon from '@mui/icons-material/Edit';
import { getErrorMessage } from '../../api/apiErrors';
import Alert from './Alert';

interface EditableCardProps {
  title: string;
  canEdit?: boolean;
  onSave?: (data: Record<string, any>) => Promise<any>;
  children: ReactNode;
  editContent?: (setSaveData: (data: Record<string, any>) => void) => ReactNode;
  className?: string;
  headerActions?: ReactNode;
}

const EditableCard: React.FC<EditableCardProps> = ({
  title,
  canEdit = false,
  onSave,
  children,
  editContent,
  className,
  headerActions
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveDataRef = useRef<Record<string, any>>({});

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
    saveDataRef.current = {};
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    saveDataRef.current = {};
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    // Check validation if _isValid flag is present
    if (saveDataRef.current._isValid === false) {
      setError('Please fix validation errors before saving');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Remove the validation flag before saving
      const { _isValid, ...saveData } = saveDataRef.current;
      await onSave(saveData);
      setIsEditing(false);
      saveDataRef.current = {};
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save changes'));
    } finally {
      setIsSaving(false);
    }
  };

  const setSaveData = (data: Record<string, any>) => {
    saveDataRef.current = { ...saveDataRef.current, ...data };
  };

  // Check if save should be disabled due to validation
  const isSaveDisabled = isSaving || saveDataRef.current._isValid === false;

  return (
    <div
      className={`${cardOuterBase} ${cardVariantDefault} ${className || ''}`}
    >
      {/* Custom header with edit functionality */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <SectionTitle size="medium">{title}</SectionTitle>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {headerActions}
            {canEdit && !isEditing && (
              <Button
                variant="icon"
                size="small"
                onClick={handleEditClick}
                className="ml-2 p-1"
                title="Edit"
              >
                <EditIcon className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Card body */}
      <div className="px-6 py-4">
        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}
        
        {isEditing ? (
          <div>
            {editContent ? editContent(setSaveData) : children}
            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
              <Button
                variant="lightbackground"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="darkbackground"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isSaveDisabled}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default EditableCard; 