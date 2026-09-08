import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoundsAPI } from '../../api/rounds';
import { SquadsAPI } from '../../api/squads';
import { EventsAPI } from '../../api/events';
import { TournamentsAPI } from '../../api/tournaments';
import { DirectorsAPI } from '../../api/directors';
import { RoundRead } from '../../types/round';
import type { RoundRelationshipRead } from '../../types/roundRelationship';
import { SquadRead, SquadCreate, SquadUpdate, SquadStatus } from '../../types/squad';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import { isDirectorSuiteRole } from '../../utils/roles';
import {
  formatDateTimeNaive,
  getErrorMessage,
  getLaterOfEventStartOrNow,
  parseNaiveDateTimeToDate,
  toTimezoneNaiveISO,
  toTimezoneNaiveISOString,
  validateSquadDates,
} from '../../utils/dateUtils';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { mapDirectorAccessToUiFlags } from '../../utils/directorAccessUi';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Loading from '../../components/common/Loading';
import Label from '../../components/common/Label';
import Modal from '../../components/common/Modal';
import DateTimeField from '../../components/common/DateTimeField';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { getCompetitionMethodDisplayLabel } from '../../utils/competitionMethodDisplay';
import { roundRelationshipApi } from '../../services/roundRelationshipApi';

const RoundsManagement: React.FC = () => {
  const params = useParams<{ id?: string; eventId?: string }>();
  const eventIdNumber = parseInt(params.eventId || params.id || '0', 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  
  // State
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'flow'>('list');

  // Fetch event details
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventIdNumber],
    queryFn: () => EventsAPI.getCompleteEvent(eventIdNumber),
    enabled: !!eventIdNumber,
  });

  const { data: tournamentForBreadcrumb } = useQuery({
    queryKey: ['tournament', event?.tournament_id],
    queryFn: () => TournamentsAPI.getTournament(event!.tournament_id),
    enabled: !!event?.tournament_id,
  });
  
  // Fetch rounds for this event
  const { data: rounds, isLoading: roundsLoading } = useQuery({
    queryKey: ['eventRounds', eventIdNumber],
    queryFn: () => RoundsAPI.getEventRounds(eventIdNumber),
    enabled: !!eventIdNumber,
  });

  const { data: roundRelationships = [] } = useQuery({
    queryKey: ['roundRelationships', eventIdNumber],
    queryFn: () => roundRelationshipApi.getAllRoundRelationshipsForEvent(eventIdNumber),
    enabled: !!eventIdNumber,
  });

  const { data: directorAccess, isLoading: directorAccessLoading } = useQuery({
    queryKey: ['eventDirectorAccess', eventIdNumber],
    queryFn: () => DirectorsAPI.getEventDirectorAccess(eventIdNumber),
    enabled: !!eventIdNumber && !!user && isDirectorSuiteRole(user.role),
  });
  const caps = mapDirectorAccessToUiFlags(directorAccess, user?.role === Role.ADMIN);
  const isAuthorized =
    !!user &&
    (user.role === Role.ADMIN ||
      (isDirectorSuiteRole(user.role) && (caps.canEditEventFormat || caps.canSquads)));

  const handleCreateRound = () => {
    navigate(roleAwareNav.getEventPath(eventIdNumber));
  };
  
  const handleManageSquads = (round: RoundRead) => {
    setSelectedRound(round);
    setIsSquadModalOpen(true);
  };

  const handleRoundClick = (roundId: number) => {
    navigate(roleAwareNav.getRoundPath(roundId));
  };
  
  if (
    eventLoading ||
    roundsLoading ||
    (!!user && isDirectorSuiteRole(user.role) && directorAccessLoading)
  ) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading size="medium" />
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <Alert
          variant="error"
          message="Event not found."
          className="mb-4"
        />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb 
        items={[
          { label: 'Home', path: '/' },
          { label: 'Tournaments', path: roleAwareNav.getTournamentsListPath() },
          ...(tournamentForBreadcrumb
            ? [
                {
                  label: tournamentForBreadcrumb.name,
                  path: roleAwareNav.getTournamentPath(tournamentForBreadcrumb.id),
                },
              ]
            : event.tournament_id
              ? [
                  {
                    label: 'Tournament',
                    path: roleAwareNav.getTournamentPath(event.tournament_id),
                  },
                ]
              : []),
          { label: event.name, path: roleAwareNav.getEventPath(event.id) },
          { label: 'Rounds & Squads' },
        ]} 
        className="mb-6"
      />
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <PageTitle>Rounds & Squads Management</PageTitle>
          <p className="text-text-muted text-sm mt-1">Event: {event.name}</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="lightbackground"
            onClick={() => navigate(roleAwareNav.getEventPath(event.id))}
          >
            Back to Event
          </Button>
          {isAuthorized && (
            <Button variant="darkbackground" onClick={handleCreateRound}>
              Open Advancement Format
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-text-muted hover:text-text-muted hover:border-border'
            }`}
          >
            Rounds List
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'flow'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-text-muted hover:text-text-muted hover:border-border'
            }`}
          >
            Tournament Flow
          </button>
        </nav>
      </div>
      
      {error && (
        <Alert 
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}
      
      {/* Tab Content */}
      {activeTab === 'list' ? (
        // Rounds List
        <div className="space-y-6">
          {rounds && rounds.length === 0 ? (
            <Card title="No Rounds Yet">
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-text mb-2">Create Your First Round</h3>
                <p className="text-text-muted mb-6">
                  Rounds organize the structure of your event. Each round can have multiple squads.
                </p>
                {isAuthorized && (
                  <Button variant="darkbackground" onClick={handleCreateRound}>
                    Open Advancement Format
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            rounds?.map((round) => (
              <RoundCard
                key={round.id}
                round={round}
                relationships={roundRelationships}
                isAuthorized={isAuthorized}
                onManageSquads={() => handleManageSquads(round)}
                onRoundEdit={() => navigate(roleAwareNav.getRoundPath(round.id))}
                onRoundClick={handleRoundClick}
              />
            ))
          )}
        </div>
      ) : (
        // Tournament flow editing is now managed from Event Info.
        <div className="text-center py-12 bg-surface-light rounded-lg">
          <div className="text-text-muted">
            <h3 className="text-lg font-medium mb-2">Advancement Format</h3>
            <p>Use Event Info to edit stage flow and format relationships.</p>
            <p className="text-sm mt-2">
              <Link className="text-primary underline" to={roleAwareNav.getEventPath(event.id)}>
                Open event details
              </Link>
            </p>
          </div>
        </div>
      )}
      
      {/* Squad Management Modal */}
      {selectedRound && (
        <SquadManagementModal
          isOpen={isSquadModalOpen}
          onClose={() => {
            setIsSquadModalOpen(false);
            setSelectedRound(null);
          }}
          round={selectedRound}
        />
      )}
    </div>
  );
};

// Round Card Component
interface RoundCardProps {
  round: RoundRead;
  relationships: RoundRelationshipRead[];
  isAuthorized: boolean;
  onManageSquads: () => void;
  onRoundEdit: () => void;
  onRoundClick: (roundId: number) => void;
}

const RoundCard: React.FC<RoundCardProps> = ({ 
  round,
  relationships,
  isAuthorized, 
  onManageSquads,
  onRoundEdit,
  onRoundClick
}) => {
  const getRoundStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-surface-light text-text';
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <button
              onClick={() => onRoundClick(round.id)}
              className="text-xl font-semibold text-primary hover:text-primary-light text-left"
            >
              Round {round.round_number}
            </button>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoundStatusColor(round.status)}`}>
              {round.status.charAt(0).toUpperCase() + round.status.slice(1)}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-text-muted">Game Count</p>
              <p className="font-medium">{round.game_count} games</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Number of Squads</p>
              <p className="font-medium">{round.number_of_squads} squads</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Competition Format</p>
              <p className="font-medium">
                {getCompetitionMethodDisplayLabel(
                  String(round.competition_method || 'eliminator'),
                  { roundId: round.id, relationships }
                )}
              </p>
            </div>
          </div>
          
          {round.notes && (
            <div className="mb-4">
              <p className="text-sm text-text-muted">Notes</p>
              <p className="text-sm text-text-muted">{round.notes}</p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 ml-4">
          <Button
            variant="lightbackground"
            size="small"
            onClick={onManageSquads}
          >
            Manage Squads
          </Button>
          {isAuthorized && (
            <Button
              variant="darkbackground"
              size="small"
              onClick={onRoundEdit}
            >
              Edit Round
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

// Squad Management Modal Component
interface SquadManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: RoundRead;
}

const SquadManagementModal: React.FC<SquadManagementModalProps> = ({
  isOpen,
  onClose,
  round
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const queryClient = useQueryClient();
  const [isCreateSquadModalOpen, setIsCreateSquadModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch squads for this round
  const { data: squads, isLoading: squadsLoading } = useQuery({
    queryKey: ['roundSquads', round.id],
    queryFn: () => SquadsAPI.getRoundSquads(round.id),
    enabled: isOpen && !!round.id,
  });
  
  // Create squad mutation
  const createSquadMutation = useMutation({
    mutationFn: (squadData: SquadCreate) => SquadsAPI.createSquadForRound(round.id, squadData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roundSquads', round.id] });
      setIsCreateSquadModalOpen(false);
      setError(null);
    },
    onError: (error: any) => {
      setError(getErrorMessage(error, 'Failed to create squad'));
    }
  });
  
  const handleCreateSquad = () => {
    setIsCreateSquadModalOpen(true);
  };
  
  const handleSquadSubmit = (squadData: SquadCreate) => {
    const finalSquadData = {
      ...squadData,
      round_id: round.id,
      game_count: round.game_count // Ensure squad has same game count as round
    };
    createSquadMutation.mutate(finalSquadData);
  };

  const handleSquadClick = (squadId: number) => {
    navigate(roleAwareNav.getSquadPath(squadId));
  };

  const handleSquadEdit = (squadId: number) => {
    navigate(roleAwareNav.getSquadPath(squadId, '/edit'));
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Squads for Round ${round.round_number}`}
      size="large"
      closeOnOutsideClick={false}
    >
      <div className="space-y-4">
        {error && (
          <Alert 
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}
        
        <div className="flex justify-between items-center">
          <p className="text-text-muted">
            {squads?.length || 0} of {round.number_of_squads} squads configured
          </p>
          <Button
            variant="darkbackground"
            onClick={handleCreateSquad}
            disabled={createSquadMutation.isPending}
          >
            Add Squad
          </Button>
        </div>
        
        {squadsLoading ? (
          <div className="flex justify-center py-8">
            <Loading size="medium" />
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {squads && squads.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <p>No squads created yet for this round.</p>
                <p className="text-sm mt-1">Create at least one squad to organize participants.</p>
              </div>
            ) : (
              squads?.map((squad) => (
                <SquadCard 
                  key={squad.id} 
                  squad={squad} 
                  onSquadClick={handleSquadClick}
                  onSquadEdit={handleSquadEdit}
                />
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Create Squad Modal */}
      <SquadCreateModal
        isOpen={isCreateSquadModalOpen}
        onClose={() => setIsCreateSquadModalOpen(false)}
        onSubmit={handleSquadSubmit}
        round={round}
        isLoading={createSquadMutation.isPending}
      />
    </Modal>
  );
};

// Squad Card Component
interface SquadCardProps {
  squad: SquadRead;
  onSquadClick: (squadId: number) => void;
  onSquadEdit: (squadId: number) => void;
}

const SquadCard: React.FC<SquadCardProps> = ({ squad, onSquadClick, onSquadEdit }) => {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-surface-light text-text';
    }
  };
  
  return (
    <div className="border border-border rounded-md p-4 hover:bg-surface-light">
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => onSquadClick(squad.id)}
            className="text-lg font-medium text-primary hover:text-primary-light text-left"
          >
            {squad.name}
          </button>
          <div className="text-sm text-text-muted mt-1">
                                            {formatDateTimeNaive(squad.start_datetime)}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(squad.status)}`}>
              {squad.status.charAt(0).toUpperCase() + squad.status.slice(1)}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {squad.game_count} Games
            </span>
            {squad.start_lane && squad.end_lane && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Lanes {squad.start_lane}-{squad.end_lane}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="lightbackground" 
            size="small"
            onClick={() => onSquadEdit(squad.id)}
          >
            Edit
          </Button>
          <Button 
            variant="darkbackground" 
            size="small"
            onClick={() => onSquadClick(squad.id)}
          >
            View
          </Button>
        </div>
      </div>
    </div>
  );
};

// Squad Create Modal Component
interface SquadCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (squadData: SquadCreate) => void;
  round: RoundRead;
  isLoading: boolean;
}

const SquadCreateModal: React.FC<SquadCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  round,
  isLoading
}) => {
  const getDefaultStartDateTime = (eventStart?: string | null): string => {
    const dt = getLaterOfEventStartOrNow(eventStart);
    return toTimezoneNaiveISOString(dt);
  };

  const [formData, setFormData] = useState<SquadCreate>({
    name: '',
    round_id: round.id,
    start_datetime: getDefaultStartDateTime(),
    max_participants: 12,
    game_count: round.game_count,
    status: SquadStatus.SCHEDULED,
    allows_reentry: false
  });
  
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Get event data for validation
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['event', round.event_id],
    queryFn: () => EventsAPI.getEvent(round.event_id),
    enabled: !!round.event_id
  });

  useEffect(() => {
    if (!isOpen) return;
    const nextStart = getDefaultStartDateTime(eventData?.start_date);
    setFormData({
      name: '',
      round_id: round.id,
      start_datetime: nextStart,
      max_participants: 12,
      game_count: round.game_count,
      status: SquadStatus.SCHEDULED,
      allows_reentry: false
    });
    setValidationError(null);
  }, [isOpen, round.id, round.game_count, eventData?.start_date]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    if (!eventData) {
      setValidationError('Event schedule is still loading. Please wait and try again.');
      return;
    }

    // Comprehensive date validation using the new utility
    const validation = validateSquadDates(
      formData.start_datetime,
      eventData.start_date,
      eventData.end_date
    );
    
    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Invalid squad dates');
      return;
    }
    

    
    onSubmit(formData);
  };
  
  const handleInputChange = (field: keyof SquadCreate, value: any) => {
    // Clear validation error when user makes changes
    setValidationError(null);
    
    if (field === 'start_datetime' && value) {
      const d = parseNaiveDateTimeToDate(String(value));
      value = d ? toTimezoneNaiveISO(d) : value;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create Squad for Round ${round.round_number}`}
      size="medium"
      closeOnOutsideClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display validation error at the top */}
        {validationError && (
          <Alert variant="error" message={validationError} />
        )}
        {!eventData && !validationError && (
          <Alert variant="warning" message="Event schedule is loading. Please wait before saving." />
        )}
        
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Squad Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="e.g., Squad A, Morning Squad"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateTimeField
            label="Start Date & Time"
            id="rounds_squad_create_start"
            value={
              formData.start_datetime
                ? formData.start_datetime.slice(0, 19)
                : null
            }
            onChange={(v) =>
              handleInputChange('start_datetime', v ?? '')
            }
            minDateTime={
              eventData?.start_date
                ? parseNaiveDateTimeToDate(eventData.start_date) ?? undefined
                : undefined
            }
            maxDateTime={
              eventData?.end_date
                ? parseNaiveDateTimeToDate(eventData.end_date) ?? undefined
                : undefined
            }
            required
            fullWidth
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Max Participants
            </label>
            <input
              type="number"
              value={formData.max_participants}
              onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              min="1"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Start Lane (Optional)
            </label>
            <input
              type="number"
              value={formData.start_lane || ''}
              onChange={(e) => handleInputChange('start_lane', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              min="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              End Lane (Optional)
            </label>
            <input
              type="number"
              value={formData.end_lane || ''}
              onChange={(e) => handleInputChange('end_lane', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              min="1"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            rows={3}
            placeholder="Add any special notes for this squad..."
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="lightbackground" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="darkbackground"
            disabled={isLoading || eventLoading || !eventData}
          >
            {isLoading ? 'Creating...' : 'Create Squad'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RoundsManagement; 