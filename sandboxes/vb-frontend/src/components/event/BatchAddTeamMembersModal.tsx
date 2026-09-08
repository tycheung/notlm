import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { UsersAPI } from '../../api/users';
import { EventsAPI } from '../../api/events';
import { getErrorMessage } from '../../api/apiErrors';
import { Role } from '../../types/user';
import CloseIcon from '@mui/icons-material/Close';
import {
  clearBatchTeamMembersDraft,
  loadBatchTeamMembersDraft,
  saveBatchTeamMembersDraft,
} from '../../utils/batchAddDraftStorage';
import { parseQualifyingAverageInput } from '../../utils/parseQualifyingAverage';

const LAST_FIELD_INDEX = 3;

interface TeamMemberRow {
  id: string;
  usbc_id: string;
  first_name: string;
  last_name: string;
  qualifying_average: string;
  user_id?: number | null;
  isExisting: boolean;
  isValid: boolean;
  /** At most one per team; if ambiguous, backend picks captain. */
  isCaptain?: boolean;
}

function emptyTeamMemberRow(teamId: string, index: number): TeamMemberRow {
  return {
    id: `${teamId}-member-${index}`,
    usbc_id: '',
    first_name: '',
    last_name: '',
    qualifying_average: '',
    isExisting: false,
    isValid: false,
    isCaptain: false,
  };
}

function createEmptyTeam(teamNumber: number, size: number): Team {
  const id = `team-${teamNumber}`;
  return {
    id,
    teamName: '',
    members: Array.from({ length: size }, (_, index) => emptyTeamMemberRow(id, index)),
  };
}

function normalizeTeamMemberRow(member: TeamMemberRow): TeamMemberRow {
  return {
    ...member,
    qualifying_average: member.qualifying_average ?? '',
    isCaptain: member.isCaptain ?? false,
  };
}

interface Team {
  id: string;
  /** Optional custom name; empty = backend derives from captain's last name. */
  teamName: string;
  members: TeamMemberRow[];
}

interface BatchAddTeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  teamSize: number;
  existingParticipants?: number[];
  onSuccess: () => void;
}

const BatchAddTeamMembersModal: React.FC<BatchAddTeamMembersModalProps> = ({
  isOpen,
  onClose,
  eventId,
  teamSize,
  existingParticipants = [],
  onSuccess
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);

  const queryClient = useQueryClient();
  const inputRefs = useRef<(HTMLInputElement | null)[][][]>([]);
  
  // Cache for USBC lookups to avoid repeated API calls
  const usbcCache = useRef<Map<string, any>>(new Map());
  
  // Debounce timers for each row
  const debounceTimers = useRef<Map<string, number>>(new Map());

  // Initialize from draft or one empty team
  useEffect(() => {
    if (isOpen) {
      const draft = loadBatchTeamMembersDraft(eventId, teamSize);
      if (draft?.teams?.length) {
        setTeams(
          (draft.teams as Team[]).map((t) => ({
            ...t,
            teamName: t.teamName ?? '',
            members: t.members.map((m) => normalizeTeamMemberRow(m as TeamMemberRow)),
          }))
        );
        setCurrentTeamIndex(draft.currentTeamIndex ?? 0);
      } else {
        setTeams([createEmptyTeam(1, teamSize)]);
        setCurrentTeamIndex(0);
      }
      setError(null);
      setSuccessMessage(null);
    } else {
      // Clean up debounce timers when modal closes
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      debounceTimers.current.clear();
      usbcCache.current.clear();
    }
  }, [isOpen, teamSize, eventId]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      saveBatchTeamMembersDraft(eventId, teamSize, {
        v: 2,
        teams: teams.map((team) => ({
          ...team,
          members: team.members.map((m) => ({ ...m })),
        })),
        currentTeamIndex,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [isOpen, eventId, teamSize, teams, currentTeamIndex]);

  // Update team member data (USBC optional: valid when existing from lookup or first + last filled)
  const updateTeamMember = useCallback((teamIndex: number, memberIndex: number, updates: Partial<TeamMemberRow>) => {
    setTeams(prev => prev.map((team, tIndex) => {
      if (tIndex !== teamIndex) return team;
      return {
        ...team,
        members: team.members.map((member, mIndex) => {
          if (mIndex !== memberIndex) return member;
          const merged = { ...member, ...updates };
          const isValid =
            (merged.isExisting && !!merged.user_id) ||
            (!!merged.first_name.trim() && !!merged.last_name.trim());
          return { ...merged, isValid };
        }),
      };
    }));
  }, []);

  // Optimized USBC ID lookup (aligned with BatchAddParticipantsModal)
  const handleUSBCLookup = useCallback(async (usbcId: string, teamIndex: number, memberIndex: number, memberId: string) => {
    const trimmedUsbcId = usbcId.trim();
    if (!trimmedUsbcId) {
      updateTeamMember(teamIndex, memberIndex, { user_id: undefined, isExisting: false });
      return;
    }

    if (usbcCache.current.has(trimmedUsbcId)) {
      const cacheData = usbcCache.current.get(trimmedUsbcId);
      updateTeamMember(teamIndex, memberIndex, {
        first_name: cacheData.first_name,
        last_name: cacheData.last_name,
        user_id: cacheData.user_id,
        isExisting: cacheData.isExisting,
      });
      if (cacheData.isExisting) {
        setTimeout(() => {
          inputRefs.current[teamIndex]?.[memberIndex]?.[0]?.focus();
        }, 50);
      }
      return;
    }

    const timerKey = memberId;
    if (debounceTimers.current.has(timerKey)) {
      clearTimeout(debounceTimers.current.get(timerKey)!);
    }

    const timer = window.setTimeout(async () => {
      try {
        const result = await UsersAPI.searchUSBC(trimmedUsbcId);
        const cacheData = {
          first_name: result.has_existing_profile && result.existing_user ? result.existing_user.first_name : '',
          last_name: result.has_existing_profile && result.existing_user ? result.existing_user.last_name : '',
          user_id: result.has_existing_profile && result.existing_user ? result.existing_user.id : undefined,
          isExisting: result.has_existing_profile,
        };
        usbcCache.current.set(trimmedUsbcId, cacheData);
        updateTeamMember(teamIndex, memberIndex, cacheData);
        if (cacheData.isExisting) {
          setTimeout(() => {
            inputRefs.current[teamIndex]?.[memberIndex]?.[0]?.focus();
          }, 50);
        }
      } catch (error) {
        console.error('USBC lookup error:', error);
        updateTeamMember(teamIndex, memberIndex, { user_id: undefined, isExisting: false });
      }
      debounceTimers.current.delete(timerKey);
    }, 300);

    debounceTimers.current.set(timerKey, timer);
  }, [updateTeamMember]);

  // Handle input change
  const handleInputChange = (teamIndex: number, memberIndex: number, field: keyof TeamMemberRow, value: string) => {
    const team = teams[teamIndex];
    const member = team.members[memberIndex];
    
    // Prevent changes to first_name and last_name if user is found
    if ((field === 'first_name' || field === 'last_name') && member.isExisting) {
      return;
    }
    
    if (field === 'usbc_id' && !value.trim()) {
      updateTeamMember(teamIndex, memberIndex, {
        usbc_id: '',
        user_id: undefined,
        isExisting: false,
      });
      return;
    }

    updateTeamMember(teamIndex, memberIndex, { [field]: value });
    
    if (field === 'usbc_id') {
      handleUSBCLookup(value, teamIndex, memberIndex, member.id);
    }
  };

  const handleTeamNameChange = (teamIndex: number, value: string) => {
    setTeams((prev) =>
      prev.map((team, i) => (i === teamIndex ? { ...team, teamName: value } : team))
    );
  };

  const handleCaptainToggle = (teamIndex: number, memberIndex: number, checked: boolean) => {
    setTeams((prev) =>
      prev.map((team, tIndex) => {
        if (tIndex !== teamIndex) return team;
        return {
          ...team,
          members: team.members.map((member, mIndex) => {
            if (checked) {
              return { ...member, isCaptain: mIndex === memberIndex };
            }
            if (mIndex === memberIndex) return { ...member, isCaptain: false };
            return member;
          }),
        };
      })
    );
  };

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent, teamIndex: number, memberIndex: number, fieldIndex: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const team = teams[teamIndex];
      const member = team.members[memberIndex];
      const nextFieldIndex = fieldIndex + 1;
      
      // Check if current member is "full" (either existing user or manually completed)
      const isMemberComplete = member.isExisting ||
        (member.first_name.trim() && member.last_name.trim());
      
      // If member is complete and we're on qual avg field, move to next member or create new team
      if (isMemberComplete && fieldIndex === LAST_FIELD_INDEX) {
        if (memberIndex < teamSize - 1) {
          setTimeout(() => {
            if (inputRefs.current[teamIndex] && inputRefs.current[teamIndex][memberIndex + 1] && inputRefs.current[teamIndex][memberIndex + 1][0]) {
              inputRefs.current[teamIndex][memberIndex + 1][0]?.focus();
            }
          }, 50);
        } else {
          const newTeamNumber = teams.length + 1;
          setTeams(prev => [...prev, createEmptyTeam(newTeamNumber, teamSize)]);
          setCurrentTeamIndex(teams.length);
          
          setTimeout(() => {
            if (inputRefs.current[teams.length] && inputRefs.current[teams.length][0] && inputRefs.current[teams.length][0][0]) {
              inputRefs.current[teams.length][0][0]?.focus();
            }
          }, 50);
        }
        return;
      }
      
      // If we're at the last field and member is not complete, move to next field
      if (nextFieldIndex > LAST_FIELD_INDEX) {
        if (memberIndex === teamSize - 1) {
          const newTeamNumber = teams.length + 1;
          setTeams(prev => [...prev, createEmptyTeam(newTeamNumber, teamSize)]);
          setCurrentTeamIndex(teams.length);
          
          // Focus the new team's first input
          setTimeout(() => {
            if (inputRefs.current[teams.length] && inputRefs.current[teams.length][0] && inputRefs.current[teams.length][0][0]) {
              inputRefs.current[teams.length][0][0]?.focus();
            }
          }, 50);
        } else {
          // Move to next member
          setTimeout(() => {
            if (inputRefs.current[teamIndex] && inputRefs.current[teamIndex][memberIndex + 1] && inputRefs.current[teamIndex][memberIndex + 1][0]) {
              inputRefs.current[teamIndex][memberIndex + 1][0]?.focus();
            }
          }, 50);
        }
      } else {
        // Move to next field in same member
        setTimeout(() => {
          if (inputRefs.current[teamIndex] && inputRefs.current[teamIndex][memberIndex] && inputRefs.current[teamIndex][memberIndex][nextFieldIndex]) {
            inputRefs.current[teamIndex][memberIndex][nextFieldIndex]?.focus();
          }
        }, 50);
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      // Handle Shift+Tab (backward navigation)
      e.preventDefault();
      
      const team = teams[teamIndex];
      const member = team.members[memberIndex];
      const prevFieldIndex = fieldIndex - 1;
      
      // Check if current member is "full" (either existing user or manually completed)
      const isMemberComplete = member.isExisting ||
        (member.first_name.trim() && member.last_name.trim());
      
      // If we're on the first field (USBC ID), move to previous member or previous team
      if (fieldIndex === 0) {
        if (memberIndex > 0) {
          // Check if previous member is complete (autofilled or manually filled)
          const prevMember = team.members[memberIndex - 1];
          const isPrevMemberComplete = prevMember.isExisting || 
            (prevMember.first_name.trim() && prevMember.last_name.trim());
          
          if (isPrevMemberComplete) {
            // If previous member is complete, go to their USBC ID field (skip autofilled fields)
            setTimeout(() => {
              if (inputRefs.current[teamIndex] && inputRefs.current[teamIndex][memberIndex - 1] && inputRefs.current[teamIndex][memberIndex - 1][0]) {
                inputRefs.current[teamIndex][memberIndex - 1][0]?.focus();
              }
            }, 50);
          } else {
            setTimeout(() => {
              if (inputRefs.current[teamIndex] && inputRefs.current[teamIndex][memberIndex - 1] && inputRefs.current[teamIndex][memberIndex - 1][LAST_FIELD_INDEX]) {
                inputRefs.current[teamIndex][memberIndex - 1][LAST_FIELD_INDEX]?.focus();
              }
            }, 50);
          }
        } else if (teamIndex > 0) {
          // Move to previous team - check last member of previous team
          const prevTeam = teams[teamIndex - 1];
          const lastMemberIndex = prevTeam.members.length - 1;
          const lastMember = prevTeam.members[lastMemberIndex];
          const isLastMemberComplete = lastMember.isExisting || 
            (lastMember.first_name.trim() && lastMember.last_name.trim());
          
          if (isLastMemberComplete) {
            // If last member is complete, go to their USBC ID field
            setTimeout(() => {
              if (inputRefs.current[teamIndex - 1] && inputRefs.current[teamIndex - 1][lastMemberIndex] && inputRefs.current[teamIndex - 1][lastMemberIndex][0]) {
                inputRefs.current[teamIndex - 1][lastMemberIndex][0]?.focus();
              }
            }, 50);
          } else {
            setTimeout(() => {
              if (inputRefs.current[teamIndex - 1] && inputRefs.current[teamIndex - 1][lastMemberIndex] && inputRefs.current[teamIndex - 1][lastMemberIndex][LAST_FIELD_INDEX]) {
                inputRefs.current[teamIndex - 1][lastMemberIndex][LAST_FIELD_INDEX]?.focus();
              }
            }, 50);
          }
        }
        return;
      }
      
      // If current member is complete and we're on first name or last name field, skip to USBC ID
      if (isMemberComplete && (fieldIndex === 1 || fieldIndex === 2)) {
        setTimeout(() => {
          if (inputRefs.current[teamIndex] && inputRefs.current[teamIndex][memberIndex] && inputRefs.current[teamIndex][memberIndex][0]) {
            inputRefs.current[teamIndex][memberIndex][0]?.focus();
          }
        }, 50);
        return;
      }
      
      // Move to previous field in same member
      setTimeout(() => {
        if (inputRefs.current[teamIndex] && inputRefs.current[teamIndex][memberIndex] && inputRefs.current[teamIndex][memberIndex][prevFieldIndex]) {
          inputRefs.current[teamIndex][memberIndex][prevFieldIndex]?.focus();
        }
      }, 50);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Same as Tab
      handleKeyDown({ ...e, key: 'Tab' } as React.KeyboardEvent, teamIndex, memberIndex, fieldIndex);
    }
  };

  // Remove a team
  const removeTeam = (teamIndex: number) => {
    if (teams.length > 1) {
      setTeams(prev => prev.filter((_, index) => index !== teamIndex));
      if (currentTeamIndex >= teamIndex) {
        setCurrentTeamIndex(Math.max(0, currentTeamIndex - 1));
      }
    }
  };

  // Check for duplicate participants within teams and against existing participants
  const checkForDuplicates = () => {
    const allMembers = teams.flatMap(team => team.members.filter(member => member.isValid));
    const duplicates: { member: TeamMemberRow; reason: string }[] = [];
    
    // Check for duplicates within the teams being added
    const userCounts: { [key: string]: TeamMemberRow[] } = {};
    allMembers.forEach(member => {
      const key = `${member.usbc_id}-${member.first_name}-${member.last_name}`.toLowerCase();
      if (!userCounts[key]) {
        userCounts[key] = [];
      }
      userCounts[key].push(member);
    });
    
    // Find duplicates within teams
    Object.values(userCounts).forEach(members => {
      if (members.length > 1) {
        members.forEach(member => {
          duplicates.push({
            member,
            reason: 'This participant appears multiple times in the teams being added'
          });
        });
      }
    });
    
    // Check against existing participants
    allMembers.forEach(member => {
      if (member.user_id && existingParticipants.includes(member.user_id)) {
        duplicates.push({
          member,
          reason: 'This participant is already registered for this event'
        });
      }
    });
    
    return duplicates;
  };

  // Check if a specific member is a duplicate
  const isMemberDuplicate = (member: TeamMemberRow) => {
    if (!member.isValid) return false;
    
    // Check against existing participants
    if (member.user_id && existingParticipants.includes(member.user_id)) {
      return true;
    }
    
    // Check for duplicates within teams
    const allMembers = teams.flatMap(team => team.members.filter(m => m.isValid));
    const key = `${member.usbc_id}-${member.first_name}-${member.last_name}`.toLowerCase();
    const sameMembers = allMembers.filter(m => 
      `${m.usbc_id}-${m.first_name}-${m.last_name}`.toLowerCase() === key
    );
    
    return sameMembers.length > 1;
  };

  // Check if save button should be disabled - reactive to teams state changes
  const shouldDisableSave = useMemo(() => {
    const isBlankMember = (member: TeamMemberRow) =>
      !member.usbc_id.trim() && !member.first_name.trim() && !member.last_name.trim();
    // Check for duplicate participants
    const duplicates = checkForDuplicates();
    if (duplicates.length > 0) {
      return true;
    }

    // Check for empty teams - if ANY team is empty, disable save
    const hasEmptyTeams = teams.some(team => 
      !team.members.some(member => 
        member.usbc_id.trim() || member.first_name.trim() || member.last_name.trim()
      )
    );
    
    if (hasEmptyTeams) {
      return true; // Has empty teams that need to be deleted
    }

    // Check for teams with no valid members
    const nonEmptyTeams = teams.filter(team => 
      team.members.some(member => 
        member.usbc_id.trim() || member.first_name.trim() || member.last_name.trim()
      )
    );
    
    const validTeams = nonEmptyTeams.filter((team) =>
      team.members.every((member) => member.isValid || isBlankMember(member))
    );

    if (validTeams.length === 0) {
      return true;
    }

    const teamsWithoutAnyValidMember = validTeams.filter(
      (team) => team.members.filter((member) => member.isValid).length < 1
    );
    if (teamsWithoutAnyValidMember.length > 0) return true;

    return false;
  }, [teams, teamSize]);

  // Get the specific reason why save is disabled - reactive to teams state changes
  const saveDisabledReason = useMemo(() => {
    const isBlankMember = (member: TeamMemberRow) =>
      !member.usbc_id.trim() && !member.first_name.trim() && !member.last_name.trim();
    // Check for duplicate participants
    const duplicates = checkForDuplicates();
    if (duplicates.length > 0) {
      return `Cannot save: ${duplicates.length} duplicate participant(s) found. Please remove duplicates.`;
    }

    // Check for empty teams
    const hasEmptyTeams = teams.some(team => 
      !team.members.some(member => 
        member.usbc_id.trim() || member.first_name.trim() || member.last_name.trim()
      )
    );
    
    if (hasEmptyTeams) {
      return "Cannot save: Empty teams detected. Please delete empty teams before saving.";
    }

    // Check for teams with no valid members
    const nonEmptyTeams = teams.filter(team => 
      team.members.some(member => 
        member.usbc_id.trim() || member.first_name.trim() || member.last_name.trim()
      )
    );
    
    const validTeams = nonEmptyTeams.filter((team) =>
      team.members.every((member) => member.isValid || isBlankMember(member))
    );

    if (validTeams.length === 0) {
      return "Cannot save: No valid teams found.";
    }

    const teamsWithoutAnyValidMember = validTeams.filter(
      (team) => team.members.filter((member) => member.isValid).length < 1
    );
    if (teamsWithoutAnyValidMember.length > 0) {
      return `Cannot save: ${teamsWithoutAnyValidMember.length} team(s) have no valid members.`;
    }

    return "";
  }, [teams, teamSize]);

  // Process all teams
  const handleSave = async () => {
    const isBlankMember = (member: TeamMemberRow) =>
      !member.usbc_id.trim() && !member.first_name.trim() && !member.last_name.trim();
    // Step 1: Check for duplicate participants first
    const duplicates = checkForDuplicates();
    if (duplicates.length > 0) {
      const duplicateNames = [...new Set(duplicates.map(d => `${d.member.first_name} ${d.member.last_name}`))];
      setError(`Cannot save: The following participants are already in the event or appear multiple times: ${duplicateNames.join(', ')}`);
      return;
    }

    // Step 2: Remove empty teams and filter valid teams
    const nonEmptyTeams = teams.filter(team => 
      team.members.some(member => 
        member.usbc_id.trim() || member.first_name.trim() || member.last_name.trim()
      )
    );
    
    const validTeams = nonEmptyTeams.filter((team) =>
      team.members.every((member) => member.isValid || isBlankMember(member))
    );

    if (validTeams.length === 0) {
      setError('Please enter at least one complete team');
      return;
    }

    // Step 3: require at least one valid member in every non-empty team
    const teamsWithoutAnyValidMember = validTeams.filter(
      (team) => team.members.filter((member) => member.isValid).length < 1
    );
    if (teamsWithoutAnyValidMember.length > 0) {
      setError(
        `Cannot save: ${teamsWithoutAnyValidMember.length} team${teamsWithoutAnyValidMember.length !== 1 ? 's' : ''} have no valid members.`
      );
      return;
    }

    const allValidMembers = validTeams.flatMap((team) =>
      team.members.filter((m) => m.isValid)
    );
    for (const member of allValidMembers) {
      const parsed = parseQualifyingAverageInput(member.qualifying_average);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      const newMembers = validTeams.flatMap((team) =>
        team.members.filter((member) => member.isValid && !member.isExisting)
      );

      let createdUsers: any[] = [];
      if (newMembers.length > 0) {
        const newUsers = newMembers.map((member) => ({
          first_name: member.first_name,
          last_name: member.last_name,
          role: Role.BOWLER,
          ...(member.usbc_id.trim() ? { usbc_id: member.usbc_id.trim() } : {}),
        }));

        createdUsers = await UsersAPI.batchCreateMinimalUsers(newUsers);
      }

      const userMap = new Map<string, number>();
      createdUsers.forEach((user) => {
        const key = user.usbc_id || `${user.first_name} ${user.last_name}`;
        userMap.set(key, user.id);
      });

      const batchData = {
        event_id: eventId,
        team_size: teamSize,
        teams: validTeams.map((team) => {
          const validMembers = team.members.filter((m) => m.isValid);
          const captainCount = validMembers.filter((m) => m.isCaptain).length;
          const captainOk = captainCount === 1;
          return {
            team_name: team.teamName.trim() || undefined,
            members: validMembers.map((member) => {
              let userId = member.user_id ?? undefined;
              if (!member.isExisting) {
                const lookupKey = member.usbc_id.trim()
                  ? member.usbc_id.trim()
                  : `${member.first_name} ${member.last_name}`;
                userId = userMap.get(lookupKey);
                if (!userId) {
                  throw new Error(
                    `Failed to get user ID for ${member.first_name} ${member.last_name}. User creation may have failed.`
                  );
                }
              }
              const parsed = parseQualifyingAverageInput(member.qualifying_average);
              return {
                usbc_id: member.usbc_id,
                first_name: member.first_name,
                last_name: member.last_name,
                user_id: userId,
                is_existing: member.isExisting,
                is_team_captain: captainOk && member.isCaptain ? true : null,
                ...(parsed.ok && parsed.value !== undefined
                  ? { qualifying_average: parsed.value }
                  : {}),
              };
            }),
          };
        }),
      };

      const response = await EventsAPI.batchCreateTeams(eventId, batchData);

      clearBatchTeamMembersDraft(eventId, teamSize);
      
      setSuccessMessage(`Successfully created ${response.total_teams} teams with ${response.total_members} members`);
      
      // Refresh the teams data
      queryClient.invalidateQueries({ queryKey: ['event-teams', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-participants', eventId] });
      
      // Call success callback
      onSuccess();
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error creating teams:', error);
      setError(getErrorMessage(error, 'Failed to create teams. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Team Members"
      size="xlarge"
      className="max-h-[90vh] overflow-y-auto"
      closeOnOutsideClick={false}
    >
      <div className="space-y-6">
        {error && (
          <Alert variant="error" message={error} onDismiss={() => setError(null)} />
        )}
        
        {successMessage && (
          <Alert variant="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
        )}

        <div className="text-sm text-text-muted mb-4">
          <p>Enter team members using USBC lookup or manual name entry:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Type a USBC ID to auto-fill name fields when found</li>
            <li>Or leave USBC blank and enter first and last name — a temporary USBC is assigned on save</li>
            <li>Optional qual avg (0–300) sets the event qualifying average at registration</li>
            <li>Optional team name; if left blank, the team is labeled using the captain&apos;s last name</li>
            <li>Optional captain checkbox — exactly one per team; if unclear, the server picks randomly</li>
            <li>Press Tab to move between fields and create new teams</li>
            <li>Each team can have up to {teamSize} members (minimum 1)</li>
          </ul>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-6 pr-2">
          {teams.map((team, teamIndex) => (
            <div key={team.id} className="border border-border rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[200px]">
                  <label className="text-sm text-text-muted whitespace-nowrap">Team name (optional)</label>
                  <input
                    type="text"
                    value={team.teamName}
                    onChange={(e) => handleTeamNameChange(teamIndex, e.target.value)}
                    placeholder="Leave blank to use captain’s last name"
                    className="flex-1 min-w-[180px] px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {teams.length > 1 && (
                  <button
                    onClick={() => removeTeam(teamIndex)}
                    className="p-1 text-red-600 hover:text-red-800 bg-transparent border border-transparent hover:bg-transparent hover:border-transparent rounded transition-colors"
                    title="Remove team"
                  >
                    <CloseIcon className="w-4 h-4 font-bold" />
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {team.members.map((member, memberIndex) => (
                  <div key={member.id} className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,1fr))_auto] gap-3 items-center p-3 rounded-lg ${
                    isMemberDuplicate(member) ? 'ring-2 ring-red-500 ring-opacity-75 bg-danger/15' : ''
                  }`}>
                    <div className="text-sm font-medium text-text-muted">
                      Member {memberIndex + 1}
                    </div>
                    
                    <input
                      ref={el => {
                        if (!inputRefs.current[teamIndex]) inputRefs.current[teamIndex] = [];
                        if (!inputRefs.current[teamIndex][memberIndex]) inputRefs.current[teamIndex][memberIndex] = [];
                        inputRefs.current[teamIndex][memberIndex][0] = el;
                      }}
                      type="text"
                      placeholder="USBC ID"
                      value={member.usbc_id}
                      onChange={(e) => handleInputChange(teamIndex, memberIndex, 'usbc_id', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, teamIndex, memberIndex, 0)}
                      className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    
                    <input
                      ref={el => {
                        if (!inputRefs.current[teamIndex]) inputRefs.current[teamIndex] = [];
                        if (!inputRefs.current[teamIndex][memberIndex]) inputRefs.current[teamIndex][memberIndex] = [];
                        inputRefs.current[teamIndex][memberIndex][1] = el;
                      }}
                      type="text"
                      placeholder="First Name"
                      value={member.first_name}
                      onChange={(e) => handleInputChange(teamIndex, memberIndex, 'first_name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, teamIndex, memberIndex, 1)}
                      disabled={member.isExisting}
                      className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        member.isExisting 
                          ? 'bg-surface-light border-border text-text-muted cursor-not-allowed' 
                          : 'border-border'
                      }`}
                    />
                    
                    <input
                      ref={el => {
                        if (!inputRefs.current[teamIndex]) inputRefs.current[teamIndex] = [];
                        if (!inputRefs.current[teamIndex][memberIndex]) inputRefs.current[teamIndex][memberIndex] = [];
                        inputRefs.current[teamIndex][memberIndex][2] = el;
                      }}
                      type="text"
                      placeholder="Last Name"
                      value={member.last_name}
                      onChange={(e) => handleInputChange(teamIndex, memberIndex, 'last_name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, teamIndex, memberIndex, 2)}
                      disabled={member.isExisting}
                      className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        member.isExisting 
                          ? 'bg-surface-light border-border text-text-muted cursor-not-allowed' 
                          : 'border-border'
                      }`}
                    />

                    <input
                      ref={el => {
                        if (!inputRefs.current[teamIndex]) inputRefs.current[teamIndex] = [];
                        if (!inputRefs.current[teamIndex][memberIndex]) inputRefs.current[teamIndex][memberIndex] = [];
                        inputRefs.current[teamIndex][memberIndex][3] = el;
                      }}
                      type="number"
                      min={0}
                      max={300}
                      step="0.1"
                      placeholder="Qual. avg"
                      value={member.qualifying_average}
                      onChange={(e) =>
                        handleInputChange(teamIndex, memberIndex, 'qualifying_average', e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(e, teamIndex, memberIndex, 3)}
                      className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    <label className="flex items-center gap-2 text-sm text-text cursor-pointer select-none justify-self-end sm:justify-self-start">
                      <input
                        type="checkbox"
                        checked={!!member.isCaptain}
                        onChange={(e) =>
                          handleCaptainToggle(teamIndex, memberIndex, e.target.checked)
                        }
                        className="rounded border-border"
                      />
                      Captain
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-text-muted">
            {teams.filter(team => team.members.every(member => member.isValid)).length} complete team{teams.filter(team => team.members.every(member => member.isValid)).length !== 1 ? 's' : ''} ready to register
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <div className="relative group">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isProcessing || shouldDisableSave}
              >
                {isProcessing ? 'Creating Teams...' : 'Save Changes'}
              </Button>
              {shouldDisableSave && !isProcessing && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {saveDisabledReason}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BatchAddTeamMembersModal;

