import React, { useState, useEffect } from 'react';
import {
  clearTeamRegistrationDraft,
  loadTeamRegistrationDraft,
  saveTeamRegistrationDraft,
} from '../../utils/teamRegistrationDraftStorage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../api/apiErrors';
import { TeamsAPI } from '../../api/teams';
import { UsersAPI } from '../../api/users';
import { EventTeamRegistration, PublicTeamSignUp } from '../../types/event_team';
import { UserRead } from '../../types/user';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import TableSearchInput from '../common/TableSearchInput';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';

interface TeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  teamSize: number;
  onTeamRegistered?: () => void;
  /** Bowler sign-up (pending TD); public API with manual member rows */
  signUpMode?: boolean;
}

interface TeamMemberForm {
  user_id: number | null;
  user_name: string;
  user_email: string;
  user_usbc_id: string | null;
  is_captain: boolean;
  position: number;
  first_name: string;
  last_name: string;
  manual_usbc: string;
}

function emptyMember(index: number): TeamMemberForm {
  return {
    user_id: null,
    user_name: '',
    user_email: '',
    user_usbc_id: null,
    is_captain: index === 0,
    position: index + 1,
    first_name: '',
    last_name: '',
    manual_usbc: '',
  };
}

const TeamRegistrationModal: React.FC<TeamRegistrationModalProps> = ({
  isOpen,
  onClose,
  eventId,
  teamSize,
  onTeamRegistered,
  signUpMode = false,
}) => {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();
  const { user } = useAuth();

  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMemberForm[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchErrors, setSearchErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) {
      const draft = loadTeamRegistrationDraft(eventId, teamSize);
      if (draft?.teamMembers?.length === teamSize) {
        setTeamName(draft.teamName);
        const restored = (draft.teamMembers as Partial<TeamMemberForm>[]).map((m, index) => ({
          ...emptyMember(index),
          ...m,
          first_name: m.first_name ?? '',
          last_name: m.last_name ?? '',
          manual_usbc: m.manual_usbc ?? '',
          position: index + 1,
        }));
        setTeamMembers(restored);
        setUserSearchTerm(draft.userSearchTerm);
      } else {
        const initialMembers: TeamMemberForm[] = Array.from({ length: teamSize }, (_, index) =>
          emptyMember(index)
        );
        if (signUpMode && user) {
          initialMembers[0] = {
            ...initialMembers[0],
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            manual_usbc: user.usbc_id || '',
            is_captain: true,
          };
        }
        setTeamMembers(initialMembers);
        setTeamName('');
        setUserSearchTerm('');
      }
      setSearchErrors({});
    }
  }, [isOpen, teamSize, eventId, signUpMode, user?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      saveTeamRegistrationDraft(eventId, teamSize, {
        v: 1,
        teamName,
        teamMembers: teamMembers.map((m) => ({ ...m })),
        userSearchTerm,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [isOpen, eventId, teamSize, teamName, teamMembers, userSearchTerm]);

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['userSearch', userSearchTerm],
    queryFn: () => UsersAPI.searchUsers(userSearchTerm),
    enabled: !signUpMode && userSearchTerm.length >= 2,
    staleTime: 30000,
  });

  const registerTeamMutation = useMutation({
    mutationFn: async (payload: EventTeamRegistration | PublicTeamSignUp) => {
      if (signUpMode) {
        return TeamsAPI.signUpEventTeamPublic(eventId, payload as PublicTeamSignUp);
      }
      return TeamsAPI.createEventTeam(eventId, payload as EventTeamRegistration);
    },
    onSuccess: () => {
      clearTeamRegistrationDraft(eventId, teamSize);
      showAlert(
        signUpMode
          ? 'Team sign-up submitted. The tournament director will review your team.'
          : 'Team registered successfully!',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
      onTeamRegistered?.();
      onClose();
    },
    onError: (error: unknown) => {
      showAlert(getErrorMessage(error, 'Failed to register team'), 'error');
    },
  });

  const handleMemberSelect = (position: number, selected: UserRead) => {
    setTeamMembers((prev) =>
      prev.map((member) =>
        member.position === position
          ? {
              ...member,
              user_id: selected.id,
              user_name: `${selected.first_name} ${selected.last_name}`,
              user_email: selected.email || '',
              user_usbc_id: selected.usbc_id || null,
            }
          : member
      )
    );

    setSearchErrors((prev) => {
      const next = { ...prev };
      delete next[position];
      return next;
    });
  };

  const handleCaptainChange = (position: number) => {
    setTeamMembers((prev) =>
      prev.map((member) => ({
        ...member,
        is_captain: member.position === position,
      }))
    );
  };

  const handleRemoveMember = (position: number) => {
    setTeamMembers((prev) =>
      prev.map((member) =>
        member.position === position
          ? {
              ...member,
              user_id: null,
              user_name: '',
              user_email: '',
              user_usbc_id: null,
              is_captain:
                member.is_captain && prev.filter((m) => m.user_id !== null).length === 1
                  ? true
                  : member.is_captain,
            }
          : member
      )
    );
  };

  const validateForm = (): boolean => {
    if (!teamName.trim()) {
      showAlert('Team name is required', 'error');
      return false;
    }

    if (signUpMode) {
      const filledMembers = teamMembers.filter(
        (m) => m.first_name.trim() || m.last_name.trim() || m.manual_usbc.trim()
      );
      if (filledMembers.length < 1) {
        showAlert('At least 1 team member is required.', 'error');
        return false;
      }
      for (const m of filledMembers) {
        if (!m.first_name.trim() || !m.last_name.trim()) {
          showAlert('Each included team member needs a first and last name.', 'error');
          return false;
        }
      }
      if (filledMembers.length > teamSize) {
        showAlert(`Team cannot exceed ${teamSize} members.`, 'error');
        return false;
      }
      const captainInFilled = filledMembers.filter((m) => m.is_captain);
      if (captainInFilled.length !== 1) {
        showAlert('Exactly one included team member must be selected as captain.', 'error');
        return false;
      }
      const captains = teamMembers.filter((m) => m.is_captain);
      if (captains.length !== 1) {
        showAlert('Exactly one team captain must be selected.', 'error');
        return false;
      }
      return true;
    }

    const selectedMembers = teamMembers.filter((member) => member.user_id !== null);

    if (selectedMembers.length < 2) {
      showAlert('At least 2 team members are required', 'error');
      return false;
    }

    const userIds = selectedMembers.map((member) => member.user_id);
    const uniqueUserIds = new Set(userIds);

    if (userIds.length !== uniqueUserIds.size) {
      showAlert('Each team member can only be selected once', 'error');
      return false;
    }

    const captains = selectedMembers.filter((member) => member.is_captain);

    if (captains.length !== 1) {
      showAlert('Exactly one team captain must be selected', 'error');
      return false;
    }

    setSearchErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (signUpMode) {
      const filledMembers = teamMembers.filter(
        (m) => m.first_name.trim() || m.last_name.trim() || m.manual_usbc.trim()
      );
      const body: PublicTeamSignUp = {
        team_name: teamName.trim(),
        members: filledMembers.map((m) => ({
          first_name: m.first_name.trim(),
          last_name: m.last_name.trim(),
          usbc_id: m.manual_usbc.trim() ? m.manual_usbc.trim() : null,
          is_captain: m.is_captain,
        })),
        entry_number: 1,
      };
      registerTeamMutation.mutate(body);
      return;
    }

    const selectedMembers = teamMembers.filter((member) => member.user_id !== null);

    const teamData: EventTeamRegistration = {
      event_id: eventId,
      team_name: teamName.trim(),
      members: selectedMembers.map((member) => member.user_id!),
      captain_user_id: selectedMembers.find((member) => member.is_captain)?.user_id!,
      entry_number: 1,
      parent_team_id: null,
      auto_approve: true,
      auto_pay: false,
      notes: 'Team registration',
    };

    registerTeamMutation.mutate(teamData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={signUpMode ? 'Sign Up Team' : 'Register Team'}
      size="large"
      closeOnOutsideClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div>
          <h3 className="text-lg font-medium text-text mb-4">
            Team Members (up to {teamSize} players)
          </h3>

          <div className="space-y-4">
            {signUpMode
              ? teamMembers.map((member) => (
                  <div key={member.position} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-text-muted">
                        Position {member.position}
                        {member.is_captain && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            Captain
                          </span>
                        )}
                      </h4>
                      <label className="flex items-center text-sm text-text-muted">
                        <input
                          type="radio"
                          name="captain"
                          checked={member.is_captain}
                          onChange={() => handleCaptainChange(member.position)}
                          className="mr-2"
                        />
                        Captain
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="First name"
                        value={member.first_name}
                        onChange={(e) =>
                          setTeamMembers((prev) =>
                            prev.map((m) =>
                              m.position === member.position
                                ? { ...m, first_name: e.target.value }
                                : m
                            )
                          )
                        }
                        fullWidth
                      />
                      <Input
                        label="Last name"
                        value={member.last_name}
                        onChange={(e) =>
                          setTeamMembers((prev) =>
                            prev.map((m) =>
                              m.position === member.position
                                ? { ...m, last_name: e.target.value }
                                : m
                            )
                          )
                        }
                        fullWidth
                      />
                    </div>
                    <div className="mt-3">
                      <Input
                        label="USBC ID (optional)"
                        value={member.manual_usbc}
                        onChange={(e) =>
                          setTeamMembers((prev) =>
                            prev.map((m) =>
                              m.position === member.position
                                ? { ...m, manual_usbc: e.target.value }
                                : m
                            )
                          )
                        }
                        fullWidth
                        placeholder="Encouraged for accurate matching"
                      />
                    </div>
                  </div>
                ))
              : teamMembers.map((member) => (
                  <div key={member.position} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-text-muted">
                        Position {member.position}
                        {member.is_captain && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            Captain
                          </span>
                        )}
                      </h4>

                      {member.user_id && (
                        <Button
                          type="button"
                          variant="lightbackground"
                          size="small"
                          onClick={() => handleRemoveMember(member.position)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    {member.user_id ? (
                      <div className="bg-surface-light p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-text">{member.user_name}</div>
                            <div className="text-sm text-text-muted">
                              {member.user_email || 'No email'}
                            </div>
                            {member.user_usbc_id && (
                              <div className="text-xs text-text-dim">USBC: {member.user_usbc_id}</div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="captain"
                                checked={member.is_captain}
                                onChange={() => handleCaptainChange(member.position)}
                                className="mr-2"
                              />
                              <span className="text-sm text-text-muted">Captain</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <TableSearchInput
                          label="Search Users"
                          value={userSearchTerm}
                          onChange={setUserSearchTerm}
                          placeholder="Search by name, email, phone, or USBC ID..."
                          omitMargin={false}
                        />

                        {userSearchTerm.length >= 2 && (
                          <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                            {isSearching ? (
                              <div className="p-4 text-center text-text-muted">Searching...</div>
                            ) : searchResults.length > 0 ? (
                              <div className="divide-y">
                                {searchResults.map((u) => (
                                  <div
                                    key={u.id}
                                    className="p-3 hover:bg-surface-light cursor-pointer flex justify-between items-center"
                                    onClick={() => handleMemberSelect(member.position, u)}
                                  >
                                    <div>
                                      <div className="font-medium text-text">
                                        {u.first_name} {u.last_name} ({u.email})
                                        {u.usbc_id ? ` - USBCID: ${u.usbc_id}` : ''}
                                      </div>
                                    </div>
                                    <Button type="button" variant="darkbackground" size="small">
                                      Add
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-text-muted">
                                No users found matching your search
                              </div>
                            )}
                          </div>
                        )}

                        {searchErrors[member.position] && (
                          <p className="mt-1 text-sm text-red-600">{searchErrors[member.position]}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
          </div>
        </div>

        <div className="bg-accent/15 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Team Summary</h3>
          <div className="text-sm text-blue-800">
            <div>Team: {teamName || 'Unnamed Team'}</div>
            {signUpMode ? (
              <div>
                Captain:{' '}
                {teamMembers.find((m) => m.is_captain)
                  ? `${teamMembers.find((m) => m.is_captain)!.first_name} ${teamMembers.find((m) => m.is_captain)!.last_name}`
                  : 'Not selected'}
              </div>
            ) : (
              <>
                <div>
                  Members: {teamMembers.filter((m) => m.user_id !== null).length} of {teamSize}{' '}
                  selected
                </div>
                <div>
                  Captain:{' '}
                  {teamMembers.find((m) => m.is_captain && m.user_id !== null)?.user_name ||
                    'Not selected'}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
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
            {signUpMode ? 'Submit sign-up' : 'Register Team'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TeamRegistrationModal;
