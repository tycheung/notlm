import React, { useState } from 'react';
import EditableCard from '../../common/EditableCard';
import { EventComplete } from '../../../types/event';

interface EventRulesCardProps {
  eventComplete: EventComplete;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
}

const EventRulesCard: React.FC<EventRulesCardProps> = ({
  eventComplete,
  isAuthorizedToEdit,
  onSave
}) => {

  const EditContent: React.FC<{ setSaveData: (data: any) => void; initialRules: string }> = ({ setSaveData, initialRules }) => {

    const [rules, setRules] = useState(initialRules);

    

    React.useEffect(() => {

      setSaveData({ rules });

    }, [rules, setSaveData]);

    

    return (

      <div>

        <label className="block text-sm font-medium text-text mb-2">

          Rules

        </label>

        <textarea

          value={rules}

          onChange={(e) => setRules(e.target.value)}

          rows={6}

          className="w-full rounded-md border border-border bg-surface-light px-3 py-2 text-text shadow-sm focus:border-primary focus:outline-none focus:ring-primary"

          placeholder="Enter event rules..."

        />

      </div>

    );

  };

  

  return (

    <EditableCard 

      title="Event Rules"

      canEdit={isAuthorizedToEdit}

      onSave={onSave}

      editContent={(setSaveData) => <EditContent setSaveData={setSaveData} initialRules={eventComplete.rules || ''} />}

    >

      <div className="max-w-none">

        <p className="whitespace-pre-line text-text">

          {eventComplete.rules || 'No specific rules provided for this event.'}

        </p>

      </div>

    </EditableCard>

  );

};

export default EventRulesCard; 