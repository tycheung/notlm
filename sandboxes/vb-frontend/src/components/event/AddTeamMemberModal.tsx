import React, { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import TableSearchInput from '../common/TableSearchInput';
import Alert from '../common/Alert';
import CreateUserModal from '../admin/CreateUserModal';
import { UsersAPI } from '../../api/users';
import { getErrorMessage } from '../../api/apiErrors';
import { TeamsAPI } from '../../api/teams';
import { UserRead } from '../../types/user';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  teamId: number;
  teamName: string;
  existingParticipants?: number[]; // Array of user IDs already registered
  onSuccess?: () => void;
}

const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({
  isOpen,
  onClose,
  eventId,
  teamId,
  teamName,
  existingParticipants = [],
  onSuccess
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRead | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const queryClient = useQueryClient();

  // Search users based on query
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: () => UsersAPI.searchUsers(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Filter out already registered participants
  const availableUsers = searchResults.filter(user => 
    !existingParticipants.includes(user.id) &&
    (!selectedUser || selectedUser.id !== user.id)
  );

  // Handle selecting a user
  const handleSelectUser = (user: UserRead) => {
    setSelectedUser(user);
    setSearchQuery(''); // Clear search after selection
  };

  // Handle clearing selection
  const handleClearSelection = () => {
    setSelectedUser(null);
  };

  // Handle successful user creation
  const handleUserCreated = (newUser?: UserRead) => {
    if (newUser) {
      setSelectedUser(newUser);
    }
    setShowCreateUserModal(false);
  };

  // Add the selected member to the team
  const addTeamMember = async () => {
    if (!selectedUser) {
      setRegistrationError('Please select a participant to add to the team.');
      return;
    }

    setIsRegistering(true);
    setRegistrationError(null);

    try {
      await TeamsAPI.addTeamMember(eventId, teamId, {
        user_id: selectedUser.id,
        notes: 'Added manually by tournament director'
      });

      // Refresh the participants list
      queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
      
      // Reset state and close modal
      setSelectedUser(null);
      setSearchQuery('');
      onSuccess?.();
      onClose();
      
    } catch (error: any) {
      console.error('Error adding team member:', error);
      setRegistrationError(
        getErrorMessage(error, 'Failed to add team member. Please try again.')
      );
    } finally {
      setIsRegistering(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setSearchQuery('');
      setRegistrationError(null);
    }
  }, [isOpen]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Add Member to ${teamName}`}
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
            {searchQuery.length >= 2 && !selectedUser && (
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
                        onClick={() => handleSelectUser(user)}
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
                          Select
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

          {/* Selected Participant */}
          {selectedUser && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-text">
                Selected Participant
              </h3>
              <div className="border rounded-lg">
                <div className="p-3 flex justify-between items-center bg-success/15">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium text-text">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </div>
                      <div className="text-sm text-text-muted">
                        {selectedUser.email}
                      </div>
                      {selectedUser.usbc_id && (
                        <div className="text-xs text-text-dim">
                          USBC: {selectedUser.usbc_id}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="lightbackground"
                    size="small"
                    onClick={handleClearSelection}
                  >
                    Clear
                  </Button>
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
              onClick={addTeamMember}
              disabled={!selectedUser || isRegistering}
            >
              {isRegistering ? 'Adding...' : 'Add Member'}
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

export default AddTeamMemberModal; 