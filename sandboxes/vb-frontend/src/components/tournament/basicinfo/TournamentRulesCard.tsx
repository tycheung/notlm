import React, { useState } from 'react';
import EditableCard from '../../common/EditableCard';
import { TournamentRead } from '../../../types/tournament';

interface TournamentRulesCardProps {
  tournament: TournamentRead;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
}

const TournamentRulesCard: React.FC<TournamentRulesCardProps> = ({
  tournament,
  isAuthorizedToEdit,
  onSave
}) => {

  const EditContent: React.FC<{ setSaveData: (data: any) => void }> = ({ setSaveData }) => {
    const [rules, setRules] = useState(tournament.rules || '');

    React.useEffect(() => {
      setSaveData({ rules });
    }, [rules, setSaveData]);

    return (
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Tournament Rules
        </label>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 border border-border bg-surface-light text-text rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          placeholder="Enter tournament rules..."
        />
      </div>
    );
  };

  return (
    <EditableCard 
      title="Tournament Rules"
      canEdit={isAuthorizedToEdit}
      onSave={onSave}
      editContent={(setSaveData) => <EditContent setSaveData={setSaveData} />}
    >
      <div className="prose-legal prose-invert bg-surface-light p-4 rounded-md text-sm max-w-none">
        <pre className="whitespace-pre-line text-text-muted">
          {tournament.rules || 'No specific rules provided for this tournament.'}
        </pre>
      </div>
    </EditableCard>
  );
};

export default TournamentRulesCard; 