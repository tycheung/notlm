import React, { useState } from 'react';
import EditableCard from '../../common/EditableCard';
import Input from '../../common/Input';
import Select from '../../common/Select';
import { EventComplete } from '../../../types/event';

interface HandicapInformationCardProps {
  eventComplete: EventComplete;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
}

const HandicapInformationCard: React.FC<HandicapInformationCardProps> = ({
  eventComplete,
  isAuthorizedToEdit,
  onSave
}) => {
  const EditContent: React.FC<{
    setSaveData: (data: any) => void;
    initialBaseScore: number;
    initialPercentage: number;
  }> = ({ setSaveData, initialBaseScore, initialPercentage }) => {
    const [formData, setFormData] = useState({
      handicap_base_score: initialBaseScore,
      handicap_percentage: initialPercentage,
    });

    const isScratch = formData.handicap_percentage === 0;

    React.useEffect(() => {
      const saveData: any = {};

      if (formData.handicap_base_score !== eventComplete.handicap_base_score) {
        saveData.handicap_base_score = formData.handicap_base_score;
      }

      if (formData.handicap_percentage !== eventComplete.handicap_percentage) {
        saveData.handicap_percentage = formData.handicap_percentage;
      }

      setSaveData(saveData);
    }, [formData, setSaveData]);

    const handleInputChange = (field: string, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleModeChange = (mode: string) => {
      if (mode === 'scratch') {
        setFormData((prev) => ({ ...prev, handicap_percentage: 0 }));
        return;
      }
      setFormData((prev) => ({
        ...prev,
        handicap_percentage:
          prev.handicap_percentage > 0 ? prev.handicap_percentage : 90,
        handicap_base_score: prev.handicap_base_score || 200,
      }));
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Event Scoring
          </label>
          <Select
            value={isScratch ? 'scratch' : 'handicap'}
            onChange={handleModeChange}
            options={[
              { value: 'handicap', label: 'Handicap' },
              { value: 'scratch', label: 'Scratch' },
            ]}
          />
          <p className="mt-1 text-sm text-text-muted">
            Side actions can still use handicap or scratch in their own setup.
          </p>
        </div>

        {!isScratch && (
          <>
            <div>
              <Input
                label="Base Score"
                type="number"
                min={100}
                max={300}
                value={formData.handicap_base_score}
                onChange={(e) =>
                  handleInputChange('handicap_base_score', parseInt(e.target.value))
                }
                fullWidth
              />
              <p className="mt-1 text-sm text-text-muted">
                Typical values: 200-220 for most leagues
              </p>
            </div>

            <div>
              <Input
                label="Handicap Percentage"
                type="number"
                min={1}
                max={100}
                value={formData.handicap_percentage}
                onChange={(e) =>
                  handleInputChange('handicap_percentage', parseInt(e.target.value))
                }
                fullWidth
              />
              <p className="mt-1 text-sm text-text-muted">
                Common values: 80-90% (90% is most common)
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  const isScratch = (eventComplete.handicap_percentage ?? 0) === 0;

  return (
    <EditableCard
      title="Event Handicap Information"
      canEdit={isAuthorizedToEdit}
      onSave={onSave}
      editContent={(setSaveData) => (
        <EditContent
          setSaveData={setSaveData}
          initialBaseScore={eventComplete.handicap_base_score ?? 200}
          initialPercentage={eventComplete.handicap_percentage ?? 90}
        />
      )}
    >
      <div className="space-y-3 text-text">
        {isScratch ? (
          <p>
            <span className="font-medium text-text">Scoring:</span>{' '}
            <span className="text-text-muted">Scratch</span>
          </p>
        ) : (
          <>
            <p>
              <span className="font-medium text-text">Base Score:</span>{' '}
              <span className="text-text-muted">{eventComplete.handicap_base_score}</span>
            </p>
            <p>
              <span className="font-medium text-text">Percentage:</span>{' '}
              <span className="text-text-muted">{eventComplete.handicap_percentage}%</span>
            </p>
          </>
        )}
      </div>
    </EditableCard>
  );
};

export default HandicapInformationCard;
