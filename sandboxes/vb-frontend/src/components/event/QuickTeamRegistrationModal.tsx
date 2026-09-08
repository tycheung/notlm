import React, { useState, useEffect } from 'react';
import {
  clearQuickTeamRegistrationDraft,
  loadQuickTeamRegistrationDraft,
  saveQuickTeamRegistrationDraft,
} from '../../utils/quickTeamRegistrationDraftStorage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TeamsAPI } from '../../api/teams';
import { UsersAPI } from '../../api/users';
import { EventsAPI } from '../../api/events';
import { EventTeamRegistration } from '../../types/event_team';
import { UserRead } from '../../types/user';
import { EventRead } from '../../types/event';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import TableSearchInput from '../common/TableSearchInput';
import SearchableSelect from '../common/SearchableSelect';
import Alert from '../common/Alert';
import CreateUserModal from '../admin/CreateUserModal';
import { useAlert } from '../../contexts/AlertContext';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import StarIcon from '@mui/icons-material/Star';
import { getErrorMessage } from '../../api/apiErrors';

interface QuickTeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  onTeamRegistered?: () => void;
}

interface QuickTeamMember {
  user: UserRead | null;
  isCaptain: boolean;
}

const QuickTeamRegistrationModal: React.FC<QuickTeamRegistrationModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onTeamRegistered
}) => {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();
  
  // Form state
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<QuickTeamMember[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);

  // Fetch event details to get team size
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => EventsAPI.getEvent(eventId),
    enabled: !!eventId && isOpen,
  });

  // User search query
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['userSearch', userSearchTerm],
    queryFn: () => UsersAPI.searchUsers(userSearchTerm),
    enabled: userSearchTerm.length >= 2,
    staleTime: 30000,
  });

  // Initialize team members based on event team size (or draft)
  useEffect(() => {
    if (isOpen && event?.team_size) {
      const draft = loadQuickTeamRegistrationDraft(eventId, event.team_size);
      if (draft?.teamMembers?.length === event.team_size) {
        setTeamName(draft.teamName);
        setTeamMembers(draft.teamMembers as QuickTeamMember[]);
        setUserSearchTerm(draft.userSearchTerm);
      } else {
        const initialMembers: QuickTeamMember[] = Array.from({ length: event.team_size }, (_, index) => ({
          user: null,
          isCaptain: index === 0
        }));
        setTeamMembers(initialMembers);
        setTeamName('');
        setUserSearchTerm('');
      }
    }
  }, [isOpen, event?.team_size, eventId]);

  useEffect(() => {
    if (!isOpen || !event?.team_size) return;
    const t = window.setTimeout(() => {
      saveQuickTeamRegistrationDraft(eventId, event.team_size, {
        v: 1,
        teamName,
        teamMembers: teamMembers.map((m) => ({
          user: m.user,
          isCaptain: m.isCaptain,
        })),
        userSearchTerm,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [isOpen, eventId, event?.team_size, teamName, teamMembers, userSearchTerm]);

  // Team registration mutation
  const registerTeamMutation = useMutation({
    mutationFn: async (teamData: EventTeamRegistration) => {
      return TeamsAPI.createEventTeam(eventId, teamData);
    },
    onSuccess: () => {
      if (event?.team_size) {
        clearQuickTeamRegistrationDraft(eventId, event.team_size);
      }
      showAlert('Team registered successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
      onTeamRegistered?.();
      onClose();
    },
    onError: (error: unknown) => {
      showAlert(getErrorMessage(error, 'Failed to register team'), 'error');
    }
  });

  // Handle user selection for a specific member slot
  const handleUserSelect = (user: UserRead) => {
    if (selectedMemberIndex !== null) {
      const newMembers = [...teamMembers];
      newMembers[selectedMemberIndex] = { ...newMembers[selectedMemberIndex], user };
      setTeamMembers(newMembers);
      setSelectedMemberIndex(null);
      setUserSearchTerm('');
    }
  };

  // Handle captain selection
  const handleCaptainChange = (index: number) => {
    const newMembers = teamMembers.map((member, i) => ({
      ...member,
      isCaptain: i === index
    }));
    setTeamMembers(newMembers);
  };

  // Remove user from team slot
  const handleRemoveUser = (index: number) => {
    const newMembers = [...teamMembers];
    newMembers[index] = { user: null, isCaptain: newMembers[index].isCaptain };
    setTeamMembers(newMembers);
  };

  // Handle new user creation
  const handleUserCreated = (newUser?: UserRead) => {
    if (newUser && selectedMemberIndex !== null) {
      const newMembers = [...teamMembers];
      newMembers[selectedMemberIndex] = { ...newMembers[selectedMemberIndex], user: newUser };
      setTeamMembers(newMembers);
      setSelectedMemberIndex(null);
    }
    setShowCreateUserModal(false);
  };

  // Validate and submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate team name
    if (!teamName.trim()) {
      showAlert('Team name is required', 'error');
      return;
    }

    // Get team members with users selected
    const selectedMembers = teamMembers.filter(member => member.user !== null);
    
    if (selectedMembers.length < 1) {
      showAlert('At least 1 team member is required', 'error');
      return;
    }

    // Check for duplicate members
    const userIds = selectedMembers.map(member => member.user!.id);
    const uniqueUserIds = new Set(userIds);
    
    if (userIds.length !== uniqueUserIds.size) {
      showAlert('Each team member can only be selected once', 'error');
      return;
    }

    // Validate captain selection
    const captains = selectedMembers.filter(member => member.isCaptain);
    
    if (captains.length !== 1) {
      showAlert('Exactly one team captain must be selected', 'error');
      return;
    }

    const teamData: EventTeamRegistration = {
      event_id: eventId,
      team_name: teamName.trim(),
      members: selectedMembers.map(member => member.user!.id),
      captain_user_id: captains[0].user!.id,
      entry_number: 1,
      parent_team_id: null,
      auto_approve: true,
      auto_pay: false,
      notes: 'Quick team registration'
    };

    registerTeamMutation.mutate(teamData);
  };

  // Convert search results to options, filtering out already selected users
  const selectedUserIds = teamMembers.map(member => member.user?.id).filter(Boolean);
  const availableUsers = searchResults.filter(user => !selectedUserIds.includes(user.id));

  if (eventLoading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Quick Team Registration"
        size="large"
        closeOnOutsideClick={false}
      >
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-text-muted">Loading event details...</span>
        </div>
      </Modal>
    );
  }

  if (!event || event.event_format !== 'teams') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Quick Team Registration"
        size="large"
        closeOnOutsideClick={false}
      >
        <Alert 
          variant="error" 
          message="This event does not support team registration or could not be loaded." 
        />
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Quick Team Registration"
        size="large"
        closeOnOutsideClick={false}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Name */}
          <div>
            <Input
              label="Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              fullWidth
              placeholder="Enter team name"
            />
          </div>

          {/* Team Members */}
          <div>
            <h3 className="text-lg font-medium text-text mb-4 flex items-center">
              <GroupIcon className="w-5 h-5 mr-2 text-blue-600" />
              Team Members ({event.team_size} required)
            </h3>
            
            <div className="space-y-3">
              {teamMembers.map((member, index) => (
                <div 
                  key={index} 
                  className="border border-border rounded-lg p-4 bg-surface-light"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="font-medium text-text-muted">Position {index + 1}</span>
                      {member.isCaptain && (
                        <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <StarIcon className="w-3 h-3 mr-1" />
                          Captain
                        </span>
                      )}
                    </div>
                    
                    {/* Captain Toggle */}
                    {member.user && (
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="captain"
                          checked={member.isCaptain}
                          onChange={() => handleCaptainChange(index)}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-border"
                        />
                        <span className="ml-2 text-sm text-text-muted">Make Captain</span>
                      </label>
                    )}
                  </div>

                  {member.user ? (
                    <div className="flex items-center justify-between bg-surface border rounded-lg p-3">
                      <div>
                        <div className="font-medium text-text">{member.user.first_name} {member.user.last_name}</div>
                        <div className="text-sm text-text-muted">{member.user.email}</div>
                        {member.user.usbc_id && (
                          <div className="text-xs text-text-dim">USBC: {member.user.usbc_id}</div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="lightbackground"
                        size="small"
                        onClick={() => handleRemoveUser(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="lightbackground"
                        onClick={() => setSelectedMemberIndex(index)}
                        className="w-full"
                      >
                        Select Player
                      </Button>
                      
                      {selectedMemberIndex === index && (
                        <div className="space-y-3 border-t pt-3">
                          <TableSearchInput
                            label="Search Users"
                            value={userSearchTerm}
                            onChange={setUserSearchTerm}
                            placeholder="Search by name, email, or USBC ID..."
                            omitMargin={false}
                          />
                          
                          {userSearchTerm.length >= 2 && (
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {isSearching ? (
                                <div className="text-center py-2 text-text-muted">Searching...</div>
                              ) : availableUsers.length > 0 ? (
                                availableUsers.map(user => (
                                  <div
                                    key={user.id}
                                    className="p-2 bg-surface border rounded cursor-pointer hover:bg-surface-light"
                                    onClick={() => handleUserSelect(user)}
                                  >
                                    <div className="font-medium text-text">
                                      {user.first_name} {user.last_name} ({user.email}){user.usbc_id ? ` - USBCID: ${user.usbc_id}` : ''}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-2 text-text-muted">No users found</div>
                              )}
                            </div>
                          )}
                          
                          <Button
                            type="button"
                            variant="lightbackground"
                            onClick={() => setShowCreateUserModal(true)}
                            className="w-full"
                          >
                            <PersonAddIcon className="w-4 h-4 mr-2" />
                            Create New User
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="lightbackground"
              onClick={onClose}
              disabled={registerTeamMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="darkbackground"
              isLoading={registerTeamMutation.isPending}
              disabled={registerTeamMutation.isPending}
            >
              Register Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={handleUserCreated}
        isTournamentDirector={true}
      />
    </>
  );
};

export default QuickTeamRegistrationModal; 