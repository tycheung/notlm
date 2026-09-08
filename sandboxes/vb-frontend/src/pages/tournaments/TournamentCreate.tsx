import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TournamentsAPI } from '../../api/tournaments';
import { BowlingCentersAPI } from '../../api/bowling-centers';
import { TournamentCreate as TournamentCreateType } from '../../types/tournament';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import PageTitle from '../../components/common/PageTitle';
import Button from '../../components/common/Button';
import Label from '../../components/common/Label';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { shouldConfirmPassConsume } from '../../api/tdAccess';

import CreateBowlingCenterModal from '../../components/bowling_center/CreateBowlingCenterModal';
import BowlingCenterSelect from '../../components/bowling_center/BowlingCenterSelect';
import AddIcon from '@mui/icons-material/Add';
import { useOptionalDirectorGuide } from '../../features/director-guide';
import {
  clearTournamentCreateDraft,
  loadTournamentCreateDraft,
  saveTournamentCreateDraft,
} from '../../utils/tournamentCreateDraftStorage';
import { getErrorMessage } from '../../api/apiErrors';

interface TournamentCreateProps {
  onClose?: () => void;
}

const TournamentCreate: React.FC<TournamentCreateProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const queryClient = useQueryClient();
  const guide = useOptionalDirectorGuide();
  const isModalMode = !!onClose;
  const draftBootstrap = useMemo(
    () => (isModalMode ? loadTournamentCreateDraft() : null),
    [isModalMode]
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [isCreateBowlingCenterModalOpen, setIsCreateBowlingCenterModalOpen] = useState(false);
  const [passConfirmOpen, setPassConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<TournamentCreateType | null>(null);

  const defaultFormValues = (): TournamentCreateType => ({
    name: '',
    start_date: null,
    end_date: null,
    official_flg: false,
    bowling_center_id: 0,
    description: '',
    rules: '',
    organizer_id: user?.id || null,
    location: 'Lanes TBD - Select a bowling center to auto-populate',
    lanes_reserved: 8,
  });

  const [formValues, setFormValues] = useState<TournamentCreateType>(() => {
    if (draftBootstrap?.formValues) {
      return {
        ...defaultFormValues(),
        ...draftBootstrap.formValues,
        organizer_id: draftBootstrap.formValues.organizer_id ?? user?.id ?? null,
      };
    }
    return defaultFormValues();
  });

  // Fetch bowling centers for the dropdown
  const { data: bowlingCenters, isLoading: loadingCenters, refetch: refetchBowlingCenters } = useQuery({
    queryKey: ['bowlingCenters'],
    queryFn: () => BowlingCentersAPI.getBowlingCenters(),
  });
  
  // Update location when bowling center changes
  useEffect(() => {
    if (bowlingCenters && formValues.bowling_center_id) {
      const selectedCenter = bowlingCenters.find(center => center.id === formValues.bowling_center_id);
      if (selectedCenter) {
        // Format the address as a single line
        let formattedAddress = `${selectedCenter.name}, ${selectedCenter.address1}`;
        if (selectedCenter.address2) {
          formattedAddress += `, ${selectedCenter.address2}`;
        }
        formattedAddress += `, ${selectedCenter.city}, ${selectedCenter.state} ${selectedCenter.postal_code}`;
        
        setFormValues(prev => ({
          ...prev,
          location: formattedAddress
        }));
      }
    }
  }, [formValues.bowling_center_id, bowlingCenters]);

  useEffect(() => {
    if (!isModalMode) return;
    const t = window.setTimeout(() => {
      saveTournamentCreateDraft({
        v: 1,
        formValues,
        startDateTime: null,
        endDateTime: null,
        isEndTimeAutoCalculated: true,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [isModalMode, formValues]);

  // Handle opening the bowling center modal
  const handleOpenCreateBowlingCenterModal = () => {
    setIsCreateBowlingCenterModalOpen(true);
  };

  // Handle successful creation of a bowling center
  const handleBowlingCenterCreated = () => {
    refetchBowlingCenters();
  };

  // Create tournament mutation
  const createTournamentMutation = useMutation({
    mutationFn: (data: TournamentCreateType) => {
      // Log the data being sent to the API
      return TournamentsAPI.createTournament(data);
    },
    onSuccess: (tournament) => {
      if (onClose) {
        clearTournamentCreateDraft();
        onClose();
      }
      // Invalidate tournament queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['userTournaments'] });
      queryClient.invalidateQueries({ queryKey: ['nearbyTournaments'] });

      guide?.notifyStepCompleted('create_tournament', { tournamentId: tournament.id });
      navigate(roleAwareNav.getTournamentPath(tournament.id));
    },
    onError: (error: unknown) => {
      console.error('Error creating tournament:', error);
      setFormError(getErrorMessage(error, 'Failed to create tournament. Please try again.'));
    },
  });

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
      setFormValues(prev => ({ ...prev, [name]: value === '' ? null : Number(value) }));
      return;
    }
    
    // Handle all other inputs
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Basic validation
    if (!formValues.name) {
      setFormError('Tournament name is required');
      return;
    }
    
    if (!formValues.bowling_center_id) {
      setFormError('Please select a bowling center');
      return;
    }
    
    // Validate lanes reserved
    if (!formValues.lanes_reserved || formValues.lanes_reserved < 1) {
      setFormError('Please specify the number of lanes to reserve (minimum 1)');
      return;
    }
    
    const selectedCenter = bowlingCenters?.find(center => center.id === formValues.bowling_center_id);
    if (selectedCenter && formValues.lanes_reserved > selectedCenter.lane_count) {
      setFormError(`Cannot reserve ${formValues.lanes_reserved} lanes. This bowling center only has ${selectedCenter.lane_count} lanes available.`);
      return;
    }
    
    // Ensure location is populated if a bowling center is selected
    if (!formValues.location && formValues.bowling_center_id) {
      if (selectedCenter) {
        // Format the address as a single line
        let formattedAddress = `${selectedCenter.name}, ${selectedCenter.address1}`;
        if (selectedCenter.address2) {
          formattedAddress += `, ${selectedCenter.address2}`;
        }
        formattedAddress += `, ${selectedCenter.city}, ${selectedCenter.state} ${selectedCenter.postal_code}`;
        
        // Update formValues with the generated location
        formValues.location = formattedAddress;
      } else {
        setFormError('Location is required');
        return;
      }
    } else if (!formValues.location) {
      setFormError('Location is required');
      return;
    }

    const submitData = {
      ...formValues,
      official_flg: false,
      start_date: null,
      end_date: null,
      sa_only: false,
    };

    const passCheck = shouldConfirmPassConsume(user?.billing, 'full');
    if (passCheck.confirm) {
      setPendingSubmit(submitData);
      setPassConfirmOpen(true);
      return;
    }

    createTournamentMutation.mutate(submitData);
  };

  return (
    <div className={isModalMode ? "py-4" : "max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"}>
      {!isModalMode && (
        <div className="mb-8">
          <PageTitle size="large" className="mb-6">Create New Tournament</PageTitle>
          <p className="text-text-muted mt-2">Enter the details for your new tournament.</p>
        </div>
      )}
      
                {formError && (
            <ErrorMessage
              message={formError}
              title="Tournament Creation Error"
              onDismiss={() => setFormError(null)}
              className="mb-6"
            />
          )}
      
      <form onSubmit={handleSubmit} className={isModalMode ? "" : "bg-surface rounded-lg shadow border border-border p-6 mb-6"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="col-span-2">
            <Label htmlFor="name" required>
              Tournament Name
            </Label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formValues.name}
              onChange={handleChange}
              data-guide-id="guide-field-tournament-name"
              className="bg-surface-light text-text border border-border rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="col-span-2 bg-surface-light border border-border p-4 rounded-lg text-sm text-text-muted">
            <p>
              Tournament start and end times are set automatically from the events you add after
              creation (earliest event start and latest event end).
            </p>
          </div>

          {/* Bowling Center */}
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-1">
                          <Label htmlFor="bowling_center_id" required>
              Bowling Center
            </Label>
              <button
                type="button"
                onClick={handleOpenCreateBowlingCenterModal}
                className="text-sm text-primary hover:text-primary-light flex items-center"
              >
                <AddIcon fontSize="small" className="mr-1" />
                Add New Center
              </button>
            </div>
            <BowlingCenterSelect
              id="bowling_center_id"
              name="bowling_center_id"
              value={formValues.bowling_center_id}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, bowling_center_id: parseInt(e.target.value, 10) || 0 }))
              }
              centers={bowlingCenters}
              prependEmptyOption={formValues.bowling_center_id === 0}
              className="bg-surface-light text-text"
              data-guide-id="guide-field-tournament-center"
            />
          </div>
          
          {/* Location */}
          <div className="col-span-2">
            <Label htmlFor="location" required>
              Location
            </Label>
            <input
              id="location"
              name="location"
              type="text"
              required
              value={formValues.location}
              onChange={handleChange}
              className="bg-surface-light text-text border border-border rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Auto-populated from bowling center selection (can be modified)"
            />
            <p className="text-sm text-text-muted mt-1">
              Automatically populated from the selected bowling center, but can be edited if needed.
            </p>
          </div>
          
          {/* Lanes Reserved */}
          <div>
            <Label htmlFor="lanes_reserved" required>
              Lanes Reserved
            </Label>
            <input
              id="lanes_reserved"
              name="lanes_reserved"
              type="number"
              min="1"
              max={bowlingCenters?.find(center => center.id === formValues.bowling_center_id)?.lane_count || 128}
              required
              value={formValues.lanes_reserved}
              onChange={handleChange}
              className="bg-surface-light text-text border border-border rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-sm text-text-muted mt-1">
              {formValues.bowling_center_id && bowlingCenters?.find(center => center.id === formValues.bowling_center_id) 
                ? `Maximum ${bowlingCenters.find(center => center.id === formValues.bowling_center_id)?.lane_count} lanes available at this center`
                : 'Number of lanes to reserve for this tournament'
              }
            </p>
          </div>
          
          {/* Description */}
          <div className="col-span-2">
            <Label htmlFor="description">
              Description
            </Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formValues.description || ''}
              onChange={handleChange}
              className="bg-surface-light text-text border border-border rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            ></textarea>
          </div>
          
          {/* Rules */}
          <div className="col-span-2">
            <Label htmlFor="rules">
              Rules
            </Label>
            <textarea
              id="rules"
              name="rules"
              rows={6}
              value={formValues.rules || ''}
              onChange={handleChange}
              className="bg-surface-light text-text border border-border rounded-md w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            ></textarea>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-4">
          <Button
            variant="lightbackground"
            onClick={onClose || (() => navigate(roleAwareNav.getTournamentsListPath()))}
            disabled={createTournamentMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="darkbackground"
            isLoading={createTournamentMutation.isPending}
            disabled={createTournamentMutation.isPending}
            data-guide-id="guide-create-tournament-submit"
          >
            Create Tournament
          </Button>
        </div>
      </form>

      {/* Add the Modal at the end of the component */}
      <CreateBowlingCenterModal 
        isOpen={isCreateBowlingCenterModalOpen}
        onClose={() => setIsCreateBowlingCenterModalOpen(false)}
        onSuccess={handleBowlingCenterCreated}
      />
      <ConfirmDialog
        isOpen={passConfirmOpen}
        title="Consume tournament pass"
        message={`Are you sure? 1 tournament pass will be consumed (${shouldConfirmPassConsume(user?.billing, 'full').remaining} remaining).`}
        confirmText="Create tournament"
        onClose={() => {
          setPassConfirmOpen(false);
          setPendingSubmit(null);
        }}
        onConfirm={() => {
          if (pendingSubmit) {
            createTournamentMutation.mutate(pendingSubmit);
          }
          setPassConfirmOpen(false);
          setPendingSubmit(null);
        }}
      />
    </div>
  );
};

export default TournamentCreate;
