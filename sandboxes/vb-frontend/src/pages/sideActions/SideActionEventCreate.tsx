import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TournamentsAPI } from '../../api/tournaments';
import { BowlingCentersAPI } from '../../api/bowling-centers';
import { TournamentCreate as TournamentCreateType } from '../../types/tournament';
import { EventFormat } from '../../types/event';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import Button from '../../components/common/Button';
import Label from '../../components/common/Label';
import ErrorMessage from '../../components/common/ErrorMessage';
import CreateBowlingCenterModal from '../../components/bowling_center/CreateBowlingCenterModal';
import BowlingCenterSelect from '../../components/bowling_center/BowlingCenterSelect';
import AddIcon from '@mui/icons-material/Add';
import { getErrorMessage } from '../../api/apiErrors';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { shouldConfirmPassConsume } from '../../api/tdAccess';

interface SideActionEventCreateProps {
  onClose?: () => void;
}

const SideActionEventCreate: React.FC<SideActionEventCreateProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const queryClient = useQueryClient();

  const [formError, setFormError] = useState<string | null>(null);
  const [isCreateBowlingCenterModalOpen, setIsCreateBowlingCenterModalOpen] = useState(false);
  const [passConfirmOpen, setPassConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<TournamentCreateType | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    bowling_center_id: 0,
    location: 'Lanes TBD - Select a bowling center to auto-populate',
    sa_game_count: 3,
    sa_event_format: EventFormat.SINGLES as EventFormat,
    sa_team_size: 4,
  });

  const { data: bowlingCenters, refetch: refetchBowlingCenters } = useQuery({
    queryKey: ['bowlingCenters'],
    queryFn: () => BowlingCentersAPI.getBowlingCenters(),
  });

  useEffect(() => {
    if (bowlingCenters && formValues.bowling_center_id) {
      const selectedCenter = bowlingCenters.find(
        (center) => center.id === formValues.bowling_center_id
      );
      if (selectedCenter) {
        let formattedAddress = `${selectedCenter.name}, ${selectedCenter.address1}`;
        if (selectedCenter.address2) {
          formattedAddress += `, ${selectedCenter.address2}`;
        }
        formattedAddress += `, ${selectedCenter.city}, ${selectedCenter.state} ${selectedCenter.postal_code}`;
        setFormValues((prev) => ({ ...prev, location: formattedAddress }));
      }
    }
  }, [formValues.bowling_center_id, bowlingCenters]);

  const createMutation = useMutation({
    mutationFn: (data: TournamentCreateType) => TournamentsAPI.createTournament(data),
    onSuccess: (tournament) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['userTournaments'] });
      queryClient.invalidateQueries({ queryKey: ['nearbyTournaments'] });

      const eventId = tournament.sa_only_event_id;
      if (eventId) {
        navigate(roleAwareNav.getSaEventPath(eventId));
      }
      onClose?.();
    },
    onError: (error: unknown) => {
      setFormError(getErrorMessage(error, 'Failed to create side action event. Please try again.'));
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormValues((prev) => ({ ...prev, [name]: value === '' ? null : Number(value) }));
      return;
    }
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formValues.name.trim()) {
      setFormError('Event name is required');
      return;
    }
    if (!formValues.bowling_center_id) {
      setFormError('Please select a bowling center');
      return;
    }
    if (!formValues.location) {
      setFormError('Location is required');
      return;
    }
    if (formValues.sa_event_format === EventFormat.TEAMS) {
      const teamSize = Number(formValues.sa_team_size ?? 4);
      if (teamSize < 2 || teamSize > 10) {
        setFormError('Team size must be between 2 and 10');
        return;
      }
    }

    const selectedCenter = bowlingCenters?.find(
      (center) => center.id === formValues.bowling_center_id
    );

    const submitData: TournamentCreateType = {
      name: formValues.name.trim(),
      start_date: null,
      end_date: null,
      official_flg: false,
      bowling_center_id: formValues.bowling_center_id,
      description: '',
      rules: '',
      organizer_id: user?.id || null,
      location: formValues.location,
      lanes_reserved: Math.min(selectedCenter?.lane_count ?? 8, 8),
      sa_only: true,
      sa_game_count: Number(formValues.sa_game_count || 3),
      sa_event_format: formValues.sa_event_format,
      sa_team_size:
        formValues.sa_event_format === EventFormat.TEAMS
          ? Number(formValues.sa_team_size ?? 4)
          : null,
    };

    const passCheck = shouldConfirmPassConsume(user?.billing, 'sa');
    if (passCheck.confirm) {
      setPendingSubmit(submitData);
      setPassConfirmOpen(true);
      return;
    }

    createMutation.mutate(submitData);
  };

  return (
    <div className="py-4">
      {formError && (
        <ErrorMessage
          message={formError}
          title="Side Action Event Creation Error"
          onDismiss={() => setFormError(null)}
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <Label htmlFor="sa_event_name" required>
              Event name
            </Label>
            <input
              id="sa_event_name"
              name="name"
              type="text"
              required
              value={formValues.name}
              onChange={handleChange}
              className="bg-surface-light text-text border border-border rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <Label htmlFor="sa_game_count" required>
              Number of games
            </Label>
            <input
              id="sa_game_count"
              name="sa_game_count"
              type="number"
              min={1}
              max={12}
              required
              value={formValues.sa_game_count}
              onChange={handleChange}
              className="bg-surface text-text border border-border rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <Label htmlFor="sa_event_format" required>
              Singles or teams
            </Label>
            <select
              id="sa_event_format"
              name="sa_event_format"
              value={formValues.sa_event_format}
              onChange={handleChange}
              className="bg-surface text-text border border-border rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value={EventFormat.SINGLES}>Singles</option>
              <option value={EventFormat.TEAMS}>Teams</option>
            </select>
          </div>

          {formValues.sa_event_format === EventFormat.TEAMS && (
            <div>
              <Label htmlFor="sa_team_size" required>
                Team size
              </Label>
              <input
                id="sa_team_size"
                name="sa_team_size"
                type="number"
                min={2}
                max={10}
                required
                value={formValues.sa_team_size}
                onChange={handleChange}
                className="bg-surface text-text border border-border rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          )}

          <div className="col-span-2">
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="sa_bowling_center_id" required>
                Bowling center
              </Label>
              <button
                type="button"
                onClick={() => setIsCreateBowlingCenterModalOpen(true)}
                className="text-sm text-primary hover:text-primary-light flex items-center"
              >
                <AddIcon fontSize="small" className="mr-1" />
                Add New Center
              </button>
            </div>
            <BowlingCenterSelect
              id="sa_bowling_center_id"
              name="bowling_center_id"
              value={formValues.bowling_center_id}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  bowling_center_id: parseInt(e.target.value, 10) || 0,
                }))
              }
              centers={bowlingCenters}
              prependEmptyOption={formValues.bowling_center_id === 0}
              className="bg-surface-light text-text"
            />
          </div>

          <div className="col-span-2 rounded-lg border border-border bg-surface-light p-4 text-sm text-text-muted">
            One qualifying eliminator round for side action pinfall. Not publicly listed until
            upgraded to a full tournament.
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <Button
            variant="lightbackground"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="darkbackground"
            isLoading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            Create SA Event
          </Button>
        </div>
      </form>

      <CreateBowlingCenterModal
        isOpen={isCreateBowlingCenterModalOpen}
        onClose={() => setIsCreateBowlingCenterModalOpen(false)}
        onSuccess={() => void refetchBowlingCenters()}
      />
      <ConfirmDialog
        isOpen={passConfirmOpen}
        title="Consume side action pass"
        message={`Are you sure? 1 side action pass will be consumed (${shouldConfirmPassConsume(user?.billing, 'sa').remaining} remaining).`}
        confirmText="Create SA event"
        onClose={() => {
          setPassConfirmOpen(false);
          setPendingSubmit(null);
        }}
        onConfirm={() => {
          if (pendingSubmit) {
            createMutation.mutate(pendingSubmit);
          }
          setPassConfirmOpen(false);
          setPendingSubmit(null);
        }}
      />
    </div>
  );
};

export default SideActionEventCreate;
