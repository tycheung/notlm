import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';
import Alert from '../common/Alert';
import { TournamentsAPI } from '../../api/tournaments';
import { getErrorMessage } from '../../api/apiErrors';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { useAuth } from '../../contexts/AuthContext';

export type CopyRosterMode = 'with_roster' | 'blank_roster';

interface CopyTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTournamentId: number;
  sourceTournamentName: string;
}

const CopyTournamentModal: React.FC<CopyTournamentModalProps> = ({
  isOpen,
  onClose,
  sourceTournamentId,
  sourceTournamentName,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleAwareNav = useRoleAwareNavigation(user);
  const [name, setName] = useState('');
  const [rosterMode, setRosterMode] = useState<CopyRosterMode>('with_roster');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(`Copy of ${sourceTournamentName}`);
    setRosterMode('with_roster');
    setError(null);
  }, [isOpen, sourceTournamentName]);

  const copyMutation = useMutation({
    mutationFn: () =>
      TournamentsAPI.copyTournament(sourceTournamentId, {
        name: name.trim(),
        include_roster: rosterMode === 'with_roster',
      }),
    onSuccess: (result) => {
      onClose();
      if (result.first_event_id != null) {
        navigate(roleAwareNav.getEventPath(result.first_event_id));
        return;
      }
      navigate(roleAwareNav.getTournamentPath(result.tournament_id));
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, 'Failed to copy tournament. Please try again.'));
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Tournament name is required.');
      return;
    }
    setError(null);
    copyMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Copy tournament"
      size="medium"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={copyMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={copyMutation.isPending || !name.trim()}
          >
            {copyMutation.isPending ? 'Copying…' : 'Copy tournament'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert variant="error" message={error} />}

        <p className="text-sm text-text-muted">
          Creates a new tournament with the same events, format structure, and side-action
          definitions. Dates stay TBD until you set them on the copy.
        </p>

        <div>
          <Label htmlFor="copy-tournament-name">Tournament name</Label>
          <Input
            id="copy-tournament-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text">Roster</legend>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-surface-light">
              <input
                type="radio"
                name="copy-roster-mode"
                className="mt-1"
                checked={rosterMode === 'with_roster'}
                onChange={() => setRosterMode('with_roster')}
              />
              <span>
                <span className="block font-medium text-text">Copy with roster</span>
                <span className="block text-sm text-text-muted">
                  Approved participants and teams (no check-in, payments, or scores).
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-surface-light">
              <input
                type="radio"
                name="copy-roster-mode"
                className="mt-1"
                checked={rosterMode === 'blank_roster'}
                onChange={() => setRosterMode('blank_roster')}
              />
              <span>
                <span className="block font-medium text-text">Copy with blank roster</span>
                <span className="block text-sm text-text-muted">
                  Same setup and side actions; you add bowlers later.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};

export default CopyTournamentModal;
