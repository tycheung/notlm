import React, { useState } from 'react';
import { SquadCreate, SquadUpdate, SquadRead, SquadStatus } from '../../types/squad';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import Label from '../common/Label';
import DateTimeField from '../common/DateTimeField';
import ErrorMessage from '../common/ErrorMessage';
import { addHours } from 'date-fns';
import {
  parseNaiveDateTimeToDate,
  toTimezoneNaiveISO,
} from '../../utils/dateUtils';
import { getErrorMessage } from '../../api/apiErrors';

interface SquadFormProps {
  initialData?: SquadRead;
  roundId: number;
  onSubmit: (data: SquadCreate | SquadUpdate) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  isEdit?: boolean;
}

const SquadForm: React.FC<SquadFormProps> = ({
  initialData,
  roundId,
  onSubmit,
  isSubmitting,
  onCancel,
  isEdit = false
}) => {
  const { user } = useAuth();
  
  // Create a default start time 1 hour from now, rounded to nearest 30 minutes
  const createDefaultStartTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 30 : 0;
    const hoursToAdd = minutes < 30 ? 0 : 1;
    
    const startTime = new Date(now);
    startTime.setMinutes(roundedMinutes);
    startTime.setSeconds(0);
    startTime.setMilliseconds(0);
    
    return addHours(startTime, hoursToAdd);
  };
  

  
  // Default values for the form
  const [formValues, setFormValues] = useState<SquadCreate | SquadUpdate>({
    name: initialData?.name || '',
    round_id: roundId,
            start_datetime: initialData?.start_datetime || toTimezoneNaiveISO(createDefaultStartTime()), // Remove timezone part

    max_participants: 1,
    game_count: initialData?.game_count || 3,
    status: initialData?.status || SquadStatus.SCHEDULED,
    start_lane: initialData?.start_lane || null,
    end_lane: initialData?.end_lane || null,
    notes: initialData?.notes || '',
    allows_reentry: initialData?.allows_reentry || false,
    created_by: isEdit ? undefined : (user?.id !== undefined ? user.id : undefined),
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  

  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Special handling for checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormValues(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      const numberValue = value === '' ? null : Number(value);
      

      
      setFormValues(prev => ({ ...prev, [name]: numberValue }));
      return;
    }
    
    // Handle all other inputs
    setFormValues(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Basic validation
    if (!formValues.name) {
      setFormError('Squad name is required');
      return;
    }
    
    if (!formValues.start_datetime) {
      setFormError('Start time is required');
      return;
    }
    
    if (formValues.start_lane && formValues.end_lane && formValues.start_lane > formValues.end_lane) {
      setFormError('Start lane cannot be greater than end lane');
      return;
    }
    
    // Validate that end_datetime is after start_datetime
    if (formValues.end_datetime && formValues.start_datetime) {
      const startTime = parseNaiveDateTimeToDate(String(formValues.start_datetime));
      const endTime = parseNaiveDateTimeToDate(String(formValues.end_datetime));
      if (!startTime || !endTime || endTime <= startTime) {
        setFormError('End time must be after start time');
        return;
      }
    }
    
    try {
      await onSubmit({
        ...formValues,
        max_participants: 1,
      });
    } catch (err: unknown) {
      console.error('Error submitting squad:', err);
      setFormError(getErrorMessage(err, 'Failed to save squad'));
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {formError && (
        <ErrorMessage
          message={formError}
          title="Squad Configuration Error"
          onDismiss={() => setFormError(null)}
          className="mb-6"
        />
      )}
      
      <Card title="Squad Details" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="col-span-2">
            <Input
              label="Squad Name"
              name="name"
              value={formValues.name}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g., Morning Squad, Squad A, 9:00 AM"
            />
          </div>
          
          <DateTimeField
            label="Start Time"
            id="squad_form_start_datetime"
            value={
              formValues.start_datetime
                ? String(formValues.start_datetime).slice(0, 19)
                : null
            }
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                start_datetime: v ?? '',
              }))
            }
            required
            fullWidth
          />

          <DateTimeField
            label="End Time (Estimated)"
            id="squad_form_end_datetime"
            value={
              formValues.end_datetime
                ? String(formValues.end_datetime).slice(0, 19)
                : null
            }
            onChange={(v) =>
              setFormValues((prev) => ({
                ...prev,
                end_datetime: v || null,
              }))
            }
            fullWidth
          />
          
          {/* Game Count */}
          <div>
            <Input
              label="Games in Squad"
              name="game_count"
              type="number"
              min={1}
              value={formValues.game_count}
              onChange={handleChange}
              required
              fullWidth
            />
          </div>
          
          {/* Lane Assignments */}
          <div>
            <Input
              label="Start Lane"
              name="start_lane"
              type="number"
              min={1}
              value={formValues.start_lane === null ? '' : formValues.start_lane}
              onChange={handleChange}
              fullWidth
              placeholder="Optional"
            />
          </div>
          
          <div>
            <Input
              label="End Lane"
              name="end_lane"
              type="number"
              min={1}
              value={formValues.end_lane === null ? '' : formValues.end_lane}
              onChange={handleChange}
              fullWidth
              placeholder="Optional"
            />
          </div>
          
          {/* Status - only show for edit mode */}
          {isEdit && (
            <div className="col-span-2">
              <Label>
                Status
              </Label>
              <select
                name="status"
                value={formValues.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value={SquadStatus.SCHEDULED}>Scheduled</option>
                <option value={SquadStatus.IN_PROGRESS}>In Progress</option>
                <option value={SquadStatus.COMPLETED}>Completed</option>
                <option value={SquadStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>
          )}
          
          {/* Re-entry option */}
          <div className="col-span-2">
            <div className="flex items-center">
              <Label className="flex items-center text-sm mb-0 cursor-pointer">
                <input
                  type="checkbox"
                  id="allows_reentry"
                  name="allows_reentry"
                  checked={formValues.allows_reentry}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
                />
                Allow Re-entry (enables bowlers to bowl multiple times in this squad)
              </Label>
            </div>
          </div>
          
          {/* Notes */}
          <div className="col-span-2">
            <Label>
              Notes
            </Label>
            <textarea
              name="notes"
              rows={4}
              value={formValues.notes || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Optional notes about this squad"
            ></textarea>
          </div>
        </div>
      </Card>
      
      <div className="mt-8 flex justify-end space-x-4">
        <Button
          variant="lightbackground"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="darkbackground"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isEdit ? 'Update Squad' : 'Create Squad'}
        </Button>
      </div>
    </form>
  );
};

export default SquadForm; 
