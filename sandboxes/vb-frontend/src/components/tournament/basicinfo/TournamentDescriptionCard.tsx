import React, { useState } from 'react';
import EditableCard from '../../common/EditableCard';
import { TournamentRead } from '../../../types/tournament';

interface TournamentDescriptionCardProps {
  tournament: TournamentRead;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
}

const TournamentDescriptionCard: React.FC<TournamentDescriptionCardProps> = ({
  tournament,
  isAuthorizedToEdit,
  onSave
}) => {

  const EditContent: React.FC<{ setSaveData: (data: any) => void }> = ({ setSaveData }) => {
    const [description, setDescription] = useState(tournament.description || '');

    React.useEffect(() => {
      setSaveData({ description });
    }, [description, setSaveData]);

    return (
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Tournament Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-border bg-surface-light text-text rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          placeholder="Enter tournament description..."
        />
      </div>
    );
  };

  return (
    <EditableCard 
      title="About This Tournament"
      canEdit={isAuthorizedToEdit}
      onSave={onSave}
      editContent={(setSaveData) => <EditContent setSaveData={setSaveData} />}
    >
      <div className="max-w-none">
        <p className="whitespace-pre-line text-text">
          {tournament.description || 'No description available.'}
        </p>
      </div>
    </EditableCard>
  );
};

export default TournamentDescriptionCard; 