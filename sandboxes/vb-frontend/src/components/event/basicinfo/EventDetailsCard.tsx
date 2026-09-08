import React, { useState } from 'react';
import EditableCard from '../../common/EditableCard';
import Input from '../../common/Input';
import DateTimeField from '../../common/DateTimeField';
import { EventComplete } from '../../../types/event';
import {
  formatDateTimeNaive,
  naiveDateTimeToMinuteKey,
  toSameDayEndOfDayNaiveDateTime,
} from '../../../utils/dateUtils';

interface EventDetailsCardProps {
  eventComplete: EventComplete;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
}

const EventDetailsCard: React.FC<EventDetailsCardProps> = ({
  eventComplete,
  isAuthorizedToEdit,
  onSave
}) => {

  const EditContent: React.FC<{ setSaveData: (data: any) => void; initialFormData: any }> = ({ setSaveData, initialFormData }) => {

    const [formData, setFormData] = useState(initialFormData);
    const startDateLocked = Boolean(eventComplete.scoring_started_at);

    

    React.useEffect(() => {

      const saveData: any = {};

      const originalStartDate = naiveDateTimeToMinuteKey(
        eventComplete.start_date ?? ''
      );
      const originalEndDate = naiveDateTimeToMinuteKey(
        eventComplete.end_date ?? ''
      );
      if (naiveDateTimeToMinuteKey(formData.start_date) !== originalStartDate) {
        saveData.start_date = formData.start_date
          ? `${naiveDateTimeToMinuteKey(formData.start_date)}:00`
          : formData.start_date;
      }

      if (naiveDateTimeToMinuteKey(formData.end_date) !== originalEndDate) {
        saveData.end_date = formData.end_date
          ? `${naiveDateTimeToMinuteKey(formData.end_date)}:00`
          : formData.end_date;
      }

      if (formData.max_entries !== (eventComplete.max_entries || '')) {

        saveData.max_entries = formData.max_entries ? parseInt(formData.max_entries as string) : null;

      }

      if (formData.entry_fee !== (eventComplete.entry_fee || '')) {

        saveData.entry_fee = formData.entry_fee ? parseFloat(formData.entry_fee as string) : null;

      }

      

      setSaveData(saveData);

    }, [formData, setSaveData, eventComplete]);

    

    const handleInputChange = (field: string, value: any) => {
      setFormData((prev: Record<string, any>) => {
        if (field === 'start_date' && !prev.end_date && value) {
          return {
            ...prev,
            start_date: value,
            end_date: toSameDayEndOfDayNaiveDateTime(String(value)),
          };
        }
        return { ...prev, [field]: value };
      });

    };

    

    return (

      <div className="space-y-4">
            <DateTimeField
              label="Start Date & Time"
              id="event_start_date"
              value={formData.start_date || null}
              onChange={(v) => handleInputChange('start_date', v ?? '')}
              required
              fullWidth
              disabled={startDateLocked}
              helperText={
                startDateLocked
                  ? 'Start date is locked after scoring has started.'
                  : undefined
              }
            />

            <DateTimeField
              label="End Date & Time"
              id="event_end_date"
              value={formData.end_date || null}
              onChange={(v) => handleInputChange('end_date', v ?? '')}
              required
              fullWidth
            />
            
            <div>
              <Input
                label={eventComplete.event_format === 'teams' ? "Maximum Teams" : "Maximum Entries"}
                type="number"
                min={1}
                value={formData.max_entries}
                onChange={(e) => handleInputChange('max_entries', e.target.value)}
                placeholder={eventComplete.event_format === 'teams' ? "Leave blank for unlimited teams" : "Leave blank for unlimited entries"}
              />
              {eventComplete.event_format === 'teams' && eventComplete.team_size && (
                <p className="text-sm text-text-muted mt-1">
                  Planning target: up to{' '}
                  {eventComplete.max_entries ? eventComplete.max_entries * eventComplete.team_size : 'unlimited'} total bowlers
                  {' '}(not enforced)
                </p>
              )}
            </div>
            
            <div>
              <Input
                label="Entry Fee ($)"
                type="number"
                min={0}
                step={0.01}
                value={formData.entry_fee}
                onChange={(e) => handleInputChange('entry_fee', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
    );
  };

  

  const initialFormData = {

    start_date: eventComplete.start_date
      ? eventComplete.start_date.slice(0, 19)
      : '',

    end_date: eventComplete.end_date ? eventComplete.end_date.slice(0, 19) : '',

    max_entries: eventComplete.max_entries || '',

    entry_fee: eventComplete.entry_fee || ''

  };

  

  return (

    <EditableCard 

      title="Event Details"

      canEdit={isAuthorizedToEdit}

      onSave={onSave}

      editContent={(setSaveData) => <EditContent setSaveData={setSaveData} initialFormData={initialFormData} />}

    >

      <div className="space-y-3 text-text">
        <p>
          <span className="font-medium text-text">Start Date & Time:</span>{' '}
          <span className="text-text-muted">{formatDateTimeNaive(eventComplete.start_date)}</span>
          {eventComplete.scoring_started_at ? (
            <span className="ml-2 text-xs text-text-muted">(locked after scoring started)</span>
          ) : null}
        </p>
        <p>
          <span className="font-medium text-text">End Date & Time:</span>{' '}
          <span className="text-text-muted">{formatDateTimeNaive(eventComplete.end_date)}</span>
        </p>
        <p>
          <span className="font-medium text-text">Current Entries:</span>{' '}
          <span className="text-text-muted">{eventComplete.current_entries}</span>
        </p>
        <p>
          <span className="font-medium text-text">
            {eventComplete.event_format === 'teams' ? 'Maximum Teams:' : 'Maximum Entries:'}
          </span>{' '}
          <span className="text-text-muted">
            {eventComplete.max_entries
              ? eventComplete.max_entries
              : 'Maximum of 500 (tournament default)'}
          </span>
          {eventComplete.event_format === 'teams' && eventComplete.team_size && (
            <span className="ml-2 text-sm text-text-muted">
              (
              {eventComplete.max_entries
                ? eventComplete.max_entries * eventComplete.team_size
                : 500}{' '}
              total bowlers planning target, informational only)
            </span>
          )}
        </p>
        <p>
          <span className="font-medium text-text">Entry Fee:</span>{' '}
          <span className="text-text-muted">${eventComplete.entry_fee?.toFixed(2) || 'Free'}</span>
        </p>
      </div>
    </EditableCard>
  );
};

export default EventDetailsCard; 