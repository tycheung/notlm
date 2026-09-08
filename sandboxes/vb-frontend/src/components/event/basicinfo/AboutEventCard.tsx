import React, { useState } from 'react';
import EditableCard from '../../common/EditableCard';
import { EventComplete } from '../../../types/event';

interface AboutEventCardProps {
  eventComplete: EventComplete;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
}

const AboutEventCard: React.FC<AboutEventCardProps> = ({
  eventComplete,
  isAuthorizedToEdit,
  onSave
}) => {

  const EditContent: React.FC<{ setSaveData: (data: any) => void; initialDescription: string }> = ({ setSaveData, initialDescription }) => {

    const [description, setDescription] = useState(initialDescription);

    

    React.useEffect(() => {

      setSaveData({ description });

    }, [description, setSaveData]);

    

    return (

      <div>

        <label className="block text-sm font-medium text-text mb-2">

          Description

        </label>

        <textarea

          value={description}

          onChange={(e) => setDescription(e.target.value)}

          rows={4}

          className="w-full rounded-md border border-border bg-surface-light px-3 py-2 text-text shadow-sm focus:border-primary focus:outline-none focus:ring-primary"

          placeholder="Enter event description..."

        />

      </div>

    );

  };

  

  return (

    <EditableCard 

      title="About This Event"

      canEdit={isAuthorizedToEdit}

      onSave={onSave}

      editContent={(setSaveData) => <EditContent setSaveData={setSaveData} initialDescription={eventComplete.description || ''} />}

    >

      <div className="max-w-none">

        <p className="whitespace-pre-line text-text">

          {eventComplete.description || 'No description available.'}

        </p>

      </div>

    </EditableCard>

  );

};

export default AboutEventCard; 