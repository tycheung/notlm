import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { SquadUpdate } from '../../types/squad';
import PageTitle from '../../components/common/PageTitle';
import ErrorMessage from '../../components/common/ErrorMessage';
import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import { getErrorMessage } from '../../api/apiErrors';
import { SquadsAPI } from '../../api/squads';
import { RoundsAPI } from '../../api/rounds';
import SquadForm from '../../components/squad/SquadForm';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';

const SquadEdit: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const { id: idParam } = useParams<{ id: string }>();
  const parsedSquadId = parseInt(idParam || '0', 10);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Fetch the squad data
  const { data: squad, isLoading, error } = useQuery({
    queryKey: ['squad', parsedSquadId],
    queryFn: () => SquadsAPI.getSquad(parsedSquadId),
    enabled: !!parsedSquadId,
  });

  const { data: roundWithEvent, isLoading: roundLoading } = useQuery({
    queryKey: ['roundWithEvent', squad?.round_id],
    queryFn: () => RoundsAPI.getRoundWithEvent(squad!.round_id),
    enabled: !!squad?.round_id,
  });
  
  // Update squad mutation
  const updateSquadMutation = useMutation({
    mutationFn: (data: SquadUpdate) => {
      return SquadsAPI.updateSquad(parsedSquadId, data);
    },
    onSuccess: (_updatedSquad) => {
      navigate(roleAwareNav.getSquadPath(parsedSquadId));
    },
    onError: (error: unknown) => {
      console.error('Error updating squad:', error);
      setFormError(getErrorMessage(error, 'Failed to update squad. Please try again.'));
    },
  });
  
  // Handle form submission
  const handleSubmit = async (formData: SquadUpdate) => {
    setFormError(null);
    
    if (!parsedSquadId) {
      setFormError('Invalid squad ID');
      return;
    }
    
    try {
      await updateSquadMutation.mutateAsync(formData);
    } catch (error) {
      // Error is already handled by the mutation
    }
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    navigate(roleAwareNav.getSquadPath(parsedSquadId));
  };

  if (isLoading || (squad && roundLoading)) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error || !squad) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Alert
          variant="error"
          message={getErrorMessage(error, 'Failed to load squad data.')}
        />
      </div>
    );
  }
  
  const breadcrumbItems: { label: string; path?: string }[] = [
    { label: 'Home', path: '/' },
    { label: 'Tournaments', path: roleAwareNav.getTournamentsListPath() },
  ];
  if (roundWithEvent?.event) {
    const ev = roundWithEvent.event;
    breadcrumbItems.push(
      { label: 'Tournament', path: roleAwareNav.getTournamentPath(ev.tournament_id) },
      { label: ev.name, path: roleAwareNav.getEventPath(ev.id) },
      {
        label: squad.name || `Squad ${squad.id}`,
        path: roleAwareNav.getSquadPath(squad.id),
      },
      { label: 'Edit squad' }
    );
  } else {
    breadcrumbItems.push(
      {
        label: squad.name || `Squad ${squad.id}`,
        path: roleAwareNav.getSquadPath(squad.id),
      },
      { label: 'Edit squad' }
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Breadcrumb items={breadcrumbItems} className="mb-6" />
      <div className="mb-8">
        <PageTitle className="mb-2">Edit Squad</PageTitle>
        <p className="text-text-muted">Update squad details for "{squad.name}".</p>
      </div>
      
      {formError && (
        <ErrorMessage
          message={formError}
          title="Squad Update Error"
          onDismiss={() => setFormError(null)}
          className="mb-6"
        />
      )}
      
      <SquadForm
        initialData={squad}
        roundId={squad.round_id}
        onSubmit={handleSubmit}
        isSubmitting={updateSquadMutation.isPending}
        onCancel={handleCancel}
        isEdit={true}
      />
    </div>
  );
};

export default SquadEdit; 
