import React from 'react';
import Card from '../../common/Card';
import { TournamentRead } from '../../../types/tournament';
import { formatDateTimeNaive } from '../../../utils/dateUtils';

interface TournamentDetailsCardProps {
  tournament: TournamentRead;
  isAuthorizedToEdit: boolean;
  onSave: (data: any) => Promise<any>;
}

const TournamentDetailsCard: React.FC<TournamentDetailsCardProps> = ({
  tournament,
  isAuthorizedToEdit: _isAuthorizedToEdit,
  onSave: _onSave,
}) => {
  const schedule =
    tournament.start_date && tournament.end_date
      ? `${formatDateTimeNaive(tournament.start_date)} – ${formatDateTimeNaive(tournament.end_date)}`
      : 'Schedule is set from your events. Add events to see start and end times.';

  return (
    <Card title="Tournament Details" className="mb-6">
      <div className="space-y-3 text-text">
        <p>
          <span className="font-medium text-text">Schedule:</span>{' '}
          <span className="text-text-muted">{schedule}</span>
        </p>
        <p className="text-sm text-text-muted">
          Start and end times are computed from the earliest event start and latest event end.
        </p>
        <p>
          <span className="font-medium text-text">Current Entries:</span>{' '}
          <span className="text-text-muted">{tournament.current_entries}</span>
        </p>
      </div>
    </Card>
  );
};

export default TournamentDetailsCard;
