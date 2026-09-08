import React, { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import TableSearchInput from '../common/TableSearchInput';
import SearchableSelect from '../common/SearchableSelect';
import Alert from '../common/Alert';
import CreateUserModal from '../admin/CreateUserModal';
import { UsersAPI } from '../../api/users';
import { getErrorMessage } from '../../api/apiErrors';
import { EventsAPI } from '../../api/events';
import { TeamsAPI } from '../../api/teams';
import { UserRead } from '../../types/user';
import { EventRegistration } from '../../types/event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

interface AddParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  teamId?: number;
  existingParticipants?: number[]; // Array of user IDs already registered
  onSuccess?: () => void;
}

const AddParticipantsModal: React.FC<AddParticipantsModalProps> = ({
  isOpen,
  onClose,
  eventId,
  teamId,
  existingParticipants = [],
  onSuccess
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserRead[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const queryClient = useQueryClient();

  // Search users based on query
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: () => UsersAPI.searchUsersUnbounded(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Filter out already registered participants
  const availableUsers = searchResults.filter(user => 
    !existingParticipants.includes(user.id) &&
    !selectedUsers.some(selected => selected.id === user.id)
  );

  // Handle adding a user to selection
  const handleAddUser = (user: UserRead) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery(''); // Clear search after selection
  };

  // Handle removing a user from selection
  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  // Handle successful user creation
  const handleUserCreated = (newUser?: UserRead) => {
    if (newUser) {
      setSelectedUsers(prev => [...prev, newUser]);
    }
    setShowCreateUserModal(false);
  };

  // Register selected participants
  const registerParticipants = async () => {
    if (selectedUsers.length === 0) {
      setRegistrationError('Please select at least one participant to register.');
      return;
    }

    setIsRegistering(true);
    setRegistrationError(null);

    try {
      if (teamId) {
        // Add to team
        const addPromises = selectedUsers.map(async (user) => {
          return await TeamsAPI.addTeamMember(eventId, teamId, {
            user_id: user.id,
            notes: 'Added manually by tournament director'
          });
        });

        await Promise.all(addPromises);
      } else {
        // Original individual registration
        const registrationPromises = selectedUsers.map(async (user) => {
          return await EventsAPI.addParticipantToEvent(eventId, {
            user_id: user.id,
            notes: 'Added manually by tournament director'
          });
        });

        await Promise.all(registrationPromises);
      }

      // Refresh the participants list
      queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] });
      if (teamId) {
        queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
      }
      
      // Reset state and close modal
      setSelectedUsers([]);
      setSearchQuery('');
      onSuccess?.();
      onClose();
      
    } catch (error: any) {
      console.error('Error registering participants:', error);
      setRegistrationError(
        getErrorMessage(error, 'Failed to register participants. Please try again.')
      );
    } finally {
      setIsRegistering(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
      setSearchQuery('');
      setRegistrationError(null);
    }
  }, [isOpen]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={teamId ? "Add Members to Team" : "Add Participants to Event"}
        size="xlarge"
      >
        <div className="space-y-6">
          {registrationError && (
            <Alert
              variant="error"
              message={registrationError}
              onDismiss={() => setRegistrationError(null)}
            />
          )}

          {/* Search Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                                 <TableSearchInput
                   label="Search Users"
                   name="search"
                   value={searchQuery}
                   onChange={setSearchQuery}
                   placeholder="Search by name, email, phone, or USBC ID..."
                   omitMargin={false}
                 />
              </div>
            </div>

            {/* Create New User Button */}
            <Button
              variant="lightbackground"
              onClick={() => setShowCreateUserModal(true)}
              className="w-full"
            >
              <PersonAddIcon className="w-5 h-5 mr-2" />
              Create New User
            </Button>

            {/* Search Results */}
            {searchQuery.length >= 2 && (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-text-muted">
                    Searching...
                  </div>
                ) : availableUsers.length > 0 ? (
                  <div className="divide-y">
                    {availableUsers.map(user => (
                      <div
                        key={user.id}
                        className="p-3 hover:bg-surface-light cursor-pointer flex justify-between items-center"
                        onClick={() => handleAddUser(user)}
                      >
                        <div>
                          <div className="font-medium text-text">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-text-muted">
                            {user.email}
                          </div>
                          {user.usbc_id && (
                            <div className="text-xs text-text-dim">
                              USBC: {user.usbc_id}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="darkbackground"
                          size="small"
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-text-muted">
                    {existingParticipants.includes(searchResults.find(u => 
                      u.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                    )?.id || -1) 
                      ? 'No new users found (some may already be registered)'
                      : 'No users found matching your search'
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Participants */}
          {selectedUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-text">
                Selected Participants ({selectedUsers.length})
              </h3>
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                <div className="divide-y">
                  {selectedUsers.map(user => (
                    <div
                      key={user.id}
                      className="p-3 flex justify-between items-center bg-success/15"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium text-text">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-text-muted">
                            {user.email}
                          </div>
                          {user.usbc_id && (
                            <div className="text-xs text-text-dim">
                              USBC: {user.usbc_id}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="lightbackground"
                        size="small"
                        onClick={() => handleRemoveUser(user.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="lightbackground"
              onClick={onClose}
              disabled={isRegistering}
            >
              Cancel
            </Button>
            <Button
              variant="darkbackground"
              onClick={registerParticipants}
              disabled={selectedUsers.length === 0 || isRegistering}
            >
              {isRegistering ? 'Registering...' : `Register ${selectedUsers.length} Participant${selectedUsers.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
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

export default AddParticipantsModal; 