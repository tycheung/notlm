import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { EventsAPI } from '../../api/events';
import { TeamsAPI } from '../../api/teams';
import { getErrorMessage } from '../../api/apiErrors';
import { UsersAPI } from '../../api/users';
import { EventParticipantWithUser, EventParticipantUpdate } from '../../types/event_participant';
import { EventTeamCaptainUpdate } from '../../types/event_team';
import InlineEditableCell from '../common/InlineEditableCell';
import TeamNameInlineCell from './TeamNameInlineCell';
import ClickableSwapCell from '../common/ClickableSwapCell';
import HistoricalAveragesDisplay from '../common/HistoricalAveragesDisplay';
import Button from '../common/Button';
import { formatDateTimeSecondsNaive, parseNaiveDateTimeToTimestamp } from '../../utils/dateUtils';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import StopIcon from '@mui/icons-material/Stop';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EditIcon from '@mui/icons-material/Edit';
import AddTeamMemberModal from './AddTeamMemberModal';
import CaptainSelectionModal from './CaptainSelectionModal';
import ParticipantDemographicsModal from './ParticipantDemographicsModal';
import ParticipantAgeClassToggles from './ParticipantAgeClassToggles';
import { Gender } from '../../types/user';
import ParticipantQualifyingAverageCell from './ParticipantQualifyingAverageCell';
import ParticipantAssignUsbcModal from './ParticipantAssignUsbcModal';
import ConfirmDialog from '../common/ConfirmDialog';
import TableSearchInput from '../common/TableSearchInput';
import DualHorizontalScrollTable from '../common/DualHorizontalScrollTable';
import SortableHeaderCell from '../common/SortableHeaderCell';
import ParticipantSideActionSignupsView from './ParticipantSideActionSignupsView';
import ParticipantUsbcCell from './ParticipantUsbcCell';
import ParticipantLaneAssignCell from '../event-lane/ParticipantLaneAssignCell';
import YouthEligibilityReviewFlag from './YouthEligibilityReviewFlag';
import { invalidateEventLaneQueries } from '../../features/lanes';
import { SortDirection, toggleSortDirection } from '../common/tableSort';
import {
  buildParticipantGroups,
  computeParticipantStats,
  filterParticipantsByRosterView,
  filterParticipantsBySearch,
  teamQualifyingAverage,
  type ParticipantSortColumn,
  type RosterView,
  type TeamGroup,
} from './participantManagementTableModel';
import { useParticipantDeskBulkActions } from './useParticipantDeskBulkActions';

interface ParticipantManagementTableProps {
  eventId: number;
  tournamentId: number;
  participants: EventParticipantWithUser[];
  event?: { team_size?: number; event_format?: string; entry_fee?: number; start_date?: string };
  isLoading?: boolean;
  canManageLanes?: boolean;
  defaultManagementMode?: 'participants' | 'side_actions';
  hideManagementModeToggle?: boolean;
}

interface ExpandedRows {
  [key: string]: boolean;
}

type DeleteConfirmState =
  | { type: 'team'; teamId: number; teamName: string }
  | { type: 'participant'; participantId: number; participantName: string }
  | null;

const ParticipantManagementTable: React.FC<ParticipantManagementTableProps> = ({
  eventId,
  tournamentId,
  participants,
  event,
  isLoading = false,
  canManageLanes = true,
  defaultManagementMode = 'participants',
  hideManagementModeToggle = false,
}) => {
  const queryClient = useQueryClient();
  const participantQueryKey = ['eventParticipants', eventId] as const;
  const [managementMode, setManagementMode] = useState<'participants' | 'side_actions'>(
    defaultManagementMode
  );
  const [expandedRows, setExpandedRows] = useState<ExpandedRows>({});
  const [allTeamsExpanded, setAllTeamsExpanded] = useState(false);
  const [patchingParticipantIds, setPatchingParticipantIds] = useState<Record<number, number>>({});
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [selectedTeamForMember, setSelectedTeamForMember] = useState<{ teamId: number; teamName: string } | null>(null);
  const [captainModalOpen, setCaptainModalOpen] = useState(false);
  const [selectedTeamForCaptain, setSelectedTeamForCaptain] = useState<{ teamId: number; teamName: string; members: EventParticipantWithUser[]; currentCaptainId: number | null } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);
  const [rosterView, setRosterView] = useState<RosterView>('all');
  const [patchError, setPatchError] = useState<string | null>(null);
  const [assignUsbcTarget, setAssignUsbcTarget] = useState<{ userId: number; name: string } | null>(null);
  const [assignUsbcError, setAssignUsbcError] = useState<string | null>(null);
  const [assignUsbcSubmitting, setAssignUsbcSubmitting] = useState(false);
  const [demographicsTarget, setDemographicsTarget] = useState<EventParticipantWithUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<ParticipantSortColumn>('participant');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const beginParticipantPatch = useCallback((participantId: number) => {
    setPatchingParticipantIds((prev) => ({
      ...prev,
      [participantId]: (prev[participantId] ?? 0) + 1,
    }));
  }, []);

  const endParticipantPatch = useCallback((participantId: number) => {
    setPatchingParticipantIds((prev) => {
      const currentCount = prev[participantId] ?? 0;
      if (currentCount <= 1) {
        const { [participantId]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [participantId]: currentCount - 1,
      };
    });
  }, []);

  const setParticipantListInCache = useCallback(
    (updater: (list: EventParticipantWithUser[]) => EventParticipantWithUser[]) => {
      queryClient.setQueryData<EventParticipantWithUser[] | undefined>(participantQueryKey, (current) => {
        if (!current) return current;
        return updater(current);
      });
    },
    [participantQueryKey, queryClient]
  );

  const applyParticipantPatchInCache = useCallback(
    (participantId: number, data: EventParticipantUpdate) => {
      setParticipantListInCache((list) =>
        list.map((participant) =>
          participant.id === participantId ? { ...participant, ...data } : participant
        )
      );
    },
    [setParticipantListInCache]
  );

  const scopedParticipantRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: participantQueryKey });
    queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
  }, [eventId, participantQueryKey, queryClient]);

  const invalidateParticipantRelatedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] });
    queryClient.invalidateQueries({ queryKey: ['eventParticipants'] });
    queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
    queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event-teams', eventId] });
    queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] });
    queryClient.invalidateQueries({ queryKey: ['squadParticipants'] });
    queryClient.invalidateQueries({ queryKey: ['eventGames', eventId] });
    queryClient.invalidateQueries({ queryKey: ['squadGames'] });
    queryClient.invalidateQueries({ queryKey: ['gameScores'] });
    queryClient.invalidateQueries({ queryKey: ['eventStandings', eventId] });
    queryClient.invalidateQueries({ queryKey: ['pendingSignupEvents'] });
    queryClient.invalidateQueries({ queryKey: ['actionsNeededCounts'] });
    void invalidateEventLaneQueries(queryClient, eventId);
  }, [queryClient, eventId]);

  const handleAssignUsbc = useCallback((target: { userId: number; name: string }) => {
    setAssignUsbcTarget(target);
    setAssignUsbcError(null);
  }, []);

  const handleSubmitAssignUsbc = async (rawValue: string) => {
    if (!assignUsbcTarget) return;
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setAssignUsbcError('Enter the bowler’s USBC ID.');
      return;
    }
    setAssignUsbcSubmitting(true);
    setAssignUsbcError(null);
    try {
      await UsersAPI.assignUsbc(assignUsbcTarget.userId, trimmed);
      setAssignUsbcTarget(null);
      queryClient.invalidateQueries({ queryKey: ['temporaryUsbcUsers'] });
      invalidateParticipantRelatedQueries();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: unknown; error?: string } }; message?: string };
      const d = ax.response?.data;
      const msg =
        (typeof d?.detail === 'string' ? d.detail : null) ||
        d?.error ||
        ax.message ||
        'Could not update USBC';
      setAssignUsbcError(typeof msg === 'string' ? msg : 'Could not update USBC');
    } finally {
      setAssignUsbcSubmitting(false);
    }
  };

  const renderParticipantNameBlock = (
    participant: EventParticipantWithUser,
    opts?: { captainBadge?: boolean }
  ) => (
    <div>
      <div className="text-sm font-medium text-text flex items-center gap-1.5 flex-wrap">
        <span>{participant.user_name}</span>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded p-0.5 text-text-muted hover:text-primary hover:bg-surface-light"
          title="Edit gender / date of birth"
          onClick={() => setDemographicsTarget(participant)}
        >
          <EditIcon className="w-3.5 h-3.5" />
        </button>
        {renderDuplicateBadge(participant)}
        {opts?.captainBadge && participant.is_team_captain ? (
          <span className="ml-1 bg-pending/25 text-pending text-xs px-2 py-1 rounded-full font-semibold border border-pending/40">
            Captain
          </span>
        ) : null}
      </div>
      <div className="text-sm text-text-muted">{participant.user_email || 'No email'}</div>
      <ParticipantUsbcCell participant={participant} onAssignUsbc={handleAssignUsbc} />
      <YouthEligibilityReviewFlag
        show={participant.youth_eligibility_review === true}
        birthDate={participant.user_birth_date}
        asOfDate={event?.start_date}
      />
      <ParticipantAgeClassToggles
        isYouth={participant.is_youth === true}
        isSenior={participant.is_senior === true}
        isFemale={participant.user_gender === Gender.FEMALE}
        disabled={Boolean(patchingParticipantIds[participant.id])}
        onChange={(patch) => {
          void patchParticipant(participant.id, patch);
        }}
        onFemaleChange={(female) => {
          void patchParticipantFemale(participant.id, female);
        }}
      />
    </div>
  );

  const renderDuplicateBadge = (participant: EventParticipantWithUser) => {
    if (!participant.duplicate_entry) return null;
    return (
      <span
        className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
        title={`Duplicate entry${participant.duplicate_entry_count ? ` x${participant.duplicate_entry_count}` : ''}`}
      >
        <WarningAmberIcon className="w-3 h-3" />
        Duplicate{participant.duplicate_entry_count ? ` x${participant.duplicate_entry_count}` : ''}
      </span>
    );
  };

  const getEffectiveCaptain = (_teamId: number, members: EventParticipantWithUser[]) => {
    return members.find(m => m.is_team_captain);
  };

  // Handle captain modal
  const handleOpenCaptainModal = (teamId: number, teamName: string, teamMembers: EventParticipantWithUser[]) => {
    const currentCaptain = getEffectiveCaptain(teamId, teamMembers);
    setSelectedTeamForCaptain({
      teamId,
      teamName,
      members: teamMembers,
      currentCaptainId: currentCaptain?.user_id || null
    });
    setCaptainModalOpen(true);
  };

  const handleCloseCaptainModal = () => {
    setCaptainModalOpen(false);
    setSelectedTeamForCaptain(null);
  };

  const filteredParticipants = useMemo(
    () => filterParticipantsByRosterView(participants, rosterView),
    [participants, rosterView]
  );

  const displayParticipants = useMemo(
    () => filterParticipantsBySearch(filteredParticipants, searchQuery),
    [filteredParticipants, searchQuery]
  );

  const handleSortToggle = (column: ParticipantSortColumn) => {
    setSortDirection((prevDirection) => toggleSortDirection(prevDirection, sortColumn === column));
    setSortColumn(column);
  };

  const sortAriaSortFor = (column: ParticipantSortColumn): 'none' | 'ascending' | 'descending' =>
    sortColumn === column ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

  const participantGroups = useMemo(
    () =>
      buildParticipantGroups({
        participants: displayParticipants,
        entryFee: event?.entry_fee ?? 0,
        teamSize: event?.team_size || 4,
        sortColumn,
        sortDirection,
      }),
    [displayParticipants, event?.team_size, event?.entry_fee, sortColumn, sortDirection]
  );

  // Mutation for updating participant data
  const updateParticipantMutation = useMutation({    mutationFn: async ({ participantId, data }: { participantId: number, data: EventParticipantUpdate }) => {
      return EventsAPI.updateEventParticipant(eventId, participantId, data);
    },
    onMutate: async ({ participantId, data }: { participantId: number, data: EventParticipantUpdate }) => {
      await queryClient.cancelQueries({ queryKey: participantQueryKey });
      const previousParticipants = queryClient.getQueryData<EventParticipantWithUser[]>(participantQueryKey);
      applyParticipantPatchInCache(participantId, data);
      return { previousParticipants };
    },
    onError: (error, _variables, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(participantQueryKey, context.previousParticipants);
      }
      console.error('Failed to update participant:', error);
    },
    onSettled: (_data, _error, variables) => {
      void scopedParticipantRefresh();
      if (variables?.data?.checked_in !== undefined) {
        void invalidateEventLaneQueries(queryClient, eventId);
      }
    },
  });

  // Mutation for updating team captain
  const updateCaptainMutation = useMutation({
    mutationFn: async ({ teamId, captainData }: { teamId: number, captainData: EventTeamCaptainUpdate }) => {
      return TeamsAPI.updateTeamCaptain(eventId, teamId, captainData);
    },
    onSuccess: () => {
      void invalidateParticipantRelatedQueries();
    },
    onError: (error) => {
      console.error('Failed to update team captain:', error);
    }
  });

  const updateTeamNameMutation = useMutation({
    mutationFn: ({ teamId, team_name }: { teamId: number; team_name: string | null }) =>
      TeamsAPI.updateEventTeam(eventId, teamId, { team_name }),
    onSuccess: () => {
      void invalidateParticipantRelatedQueries();
    }
  });

  const formatSubmitError = (error: unknown): string =>
    getErrorMessage(error, 'Save failed');

  const {
    checkInAllSubmitting,
    teamActionTeamId,
    handleCheckInAll,
    handleTeamCheckIn,
    handleTeamMarkAsPaid,
    handleTeamAccept,
  } = useParticipantDeskBulkActions({
    eventId,
    participantQueryKey,
    queryClient,
    participantGroups,
    setParticipantListInCache,
    beginParticipantPatch,
    endParticipantPatch,
    scopedParticipantRefresh,
    setPatchError,
    formatSubmitError,
  });

  const patchParticipant = async (participantId: number, data: EventParticipantUpdate) => {
    setPatchError(null);
    beginParticipantPatch(participantId);
    try {
      await updateParticipantMutation.mutateAsync({ participantId, data });
    } catch (error) {
      setPatchError(formatSubmitError(error));
      throw error;
    } finally {
      endParticipantPatch(participantId);
    }
  };

  const patchParticipantFemale = async (participantId: number, female: boolean) => {
    setPatchError(null);
    beginParticipantPatch(participantId);
    const previousParticipants = queryClient.getQueryData<EventParticipantWithUser[]>(participantQueryKey);
    const nextGender = female ? Gender.FEMALE : Gender.MALE;
    setParticipantListInCache((list) =>
      list.map((participant) =>
        participant.id === participantId
          ? { ...participant, user_gender: nextGender }
          : participant
      )
    );
    try {
      const result = await EventsAPI.updateParticipantDemographics(eventId, participantId, {
        gender: nextGender,
      });
      setParticipantListInCache((list) =>
        list.map((participant) =>
          participant.id === participantId
            ? {
                ...participant,
                user_gender: result.gender,
                ...(typeof result.is_senior === 'boolean' ? { is_senior: result.is_senior } : {}),
                ...(typeof result.is_youth === 'boolean' ? { is_youth: result.is_youth } : {}),
              }
            : participant
        )
      );
      scopedParticipantRefresh();
    } catch (error) {
      if (previousParticipants) {
        queryClient.setQueryData(participantQueryKey, previousParticipants);
      }
      setPatchError(formatSubmitError(error));
    } finally {
      endParticipantPatch(participantId);
    }
  };

  const patchTeamName = async (teamId: number, raw: string | null) => {
    setPatchError(null);
    try {
      const s = typeof raw === 'string' ? raw.trim() : '';
      await updateTeamNameMutation.mutateAsync({
        teamId,
        team_name: s === '' ? null : s
      });
    } catch (error) {
      setPatchError(formatSubmitError(error));
      throw error;
    }
  };

  const handleSelectNewCaptain = async (newCaptainUserId: number) => {
    if (!selectedTeamForCaptain) return;
    const currentCaptain = getEffectiveCaptain(selectedTeamForCaptain.teamId, selectedTeamForCaptain.members);
    if (!currentCaptain || currentCaptain.user_id === newCaptainUserId) return;
    setPatchError(null);
    try {
      await updateCaptainMutation.mutateAsync({
        teamId: selectedTeamForCaptain.teamId,
        captainData: { new_captain_user_id: newCaptainUserId }
      });
    } catch (error) {
      setPatchError(formatSubmitError(error));
    }
  };

  // Delete mutations
  const deleteTeamMutation = useMutation({
    mutationFn: ({ teamId }: { teamId: number }) => TeamsAPI.deleteEventTeam(eventId, teamId),
    onSuccess: () => {
      void invalidateParticipantRelatedQueries();
    },
    onError: (error: unknown) => {
      console.error('Failed to delete team:', error);
    }
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: ({ participantId }: { participantId: number }) => EventsAPI.deleteEventParticipant(eventId, participantId),
    onSuccess: () => {
      void invalidateParticipantRelatedQueries();
    },
    onError: (error: unknown) => {
      console.error('Failed to delete participant:', error);
    }
  });

  const handleIndividualMarkPaidToggle = async (participant: EventParticipantWithUser) => {
    const entryFee = event?.entry_fee ?? 0;
    if (entryFee <= 0) return;
    const currentAmount = Number(participant.paid_amount ?? 0);
    const nextAmount = currentAmount >= entryFee ? 0 : entryFee;
    await patchParticipant(participant.id, { paid_amount: nextAmount });
  };

  const handleDeleteTeam = (teamId: number, teamName: string) => {
    setDeleteConfirm({ type: 'team', teamId, teamName });
  };

  const handleDeleteParticipant = (participantId: number, participantName: string) => {
    setDeleteConfirm({ type: 'participant', participantId, participantName });
  };

  const executeDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const dc = deleteConfirm;
    setDeleteConfirm(null);
    if (dc.type === 'team') {
      deleteTeamMutation.mutate({ teamId: dc.teamId });
      return;
    }
    const participant = participants.find(p => p.id === dc.participantId);
    setPatchError(null);
    try {
      if (participant?.is_team_captain && participant.team_id) {
        const teamMembers = participants.filter(
          p => p.team_id === participant.team_id && p.id !== participant.id
        );
        if (teamMembers.length > 0) {
          await updateCaptainMutation.mutateAsync({
            teamId: participant.team_id,
            captainData: { new_captain_user_id: teamMembers[0].user_id }
          });
        }
      }
      await deleteParticipantMutation.mutateAsync({ participantId: dc.participantId });
    } catch (error) {
      setPatchError(formatSubmitError(error));
    }
  };

  // Helper functions for row IDs
  const getTeamRowId = (teamId: number) => `team-${teamId}`;
  const getParticipantRowId = (participantId: number) => `participant-${participantId}`;

  // Toggle row expansion (supports both team and participant rows)
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const newState = {
        ...prev,
        [rowId]: !prev[rowId]
      };
      
      // If this is a team row, check if all teams are now expanded/collapsed
      if (rowId.startsWith('team-')) {
        const teamIds = participantGroups.teams?.map(team => getTeamRowId(team.team_id)) || [];
        const allTeamsExpanded = teamIds.every(teamId => newState[teamId] === true);
        setAllTeamsExpanded(allTeamsExpanded);
      }
      
      return newState;
    });
  };

  // Toggle all team expansions
  const toggleAllTeams = () => {
    const newExpandedState = !allTeamsExpanded;
    setAllTeamsExpanded(newExpandedState);
    
    // Update expanded rows for all teams
    const newExpandedRows = { ...expandedRows };
    participantGroups.teams?.forEach(team => {
      const teamRowId = getTeamRowId(team.team_id);
      newExpandedRows[teamRowId] = newExpandedState;
    });
    
    setExpandedRows(newExpandedRows);
  };

  // Handle opening add member modal
  const handleAddMember = (teamId: number, teamName: string) => {
    setSelectedTeamForMember({ teamId, teamName });
    setAddMemberModalOpen(true);
  };

  // Handle add member modal close
  const handleAddMemberModalClose = () => {
    setAddMemberModalOpen(false);
    setSelectedTeamForMember(null);
  };

  // Handle successful member addition
  const handleMemberAdded = () => {
    void invalidateParticipantRelatedQueries();
    handleAddMemberModalClose();
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'approved':
        return { icon: <CheckCircleIcon className="w-5 h-5 text-success" />, color: 'text-success' };
      case 'withdrawn':
        return { icon: <CancelIcon className="w-5 h-5 text-text-muted" />, color: 'text-text-muted' };
      default:
        return { icon: <PendingIcon className="w-5 h-5 text-pending" />, color: 'text-pending' };
    }
  };

  const renderMarkPaidButton = (participant: EventParticipantWithUser, isRowPatching: boolean) => {
    const entryFee = event?.entry_fee ?? 0;
    const entryFeeConfigured = entryFee > 0;
    const currentAmount = Number(participant.paid_amount ?? 0);
    const isPaid = entryFeeConfigured && currentAmount >= entryFee;
    const tooltipText = entryFeeConfigured
      ? `Mark paid (${entryFee.toFixed(2)} entry fee)`
      : 'Set an entry fee to enable quick mark paid';

    if (isPaid) {
      return null;
    }

    return (
      <Button
        variant="darkbackground"
        size="small"
        type="button"
        title={tooltipText}
        disabled={isRowPatching || !entryFeeConfigured}
        onClick={() => void handleIndividualMarkPaidToggle(participant)}
        className="text-xs px-2 py-1"
      >
        Mark Paid
      </Button>
    );
  };

  const getPaidAmountCellClassName = (participant: EventParticipantWithUser) => {
    const currentAmount = Number(participant.paid_amount ?? 0);
    const entryFee = event?.entry_fee ?? 0;
    const isPaid = entryFee > 0 && currentAmount >= entryFee;
    const paidStyles = isPaid ? 'text-emerald-300 bg-transparent hover:bg-transparent' : '';
    return `min-w-[8ch] ${paidStyles}`.trim();
  };

  const stats = useMemo(
    () => computeParticipantStats(participants, event?.entry_fee ?? 0),
    [participants, event?.entry_fee]
  );

  const notCheckedInOnRoster = useMemo(
    () => participants.filter((p) => p.status === 'approved' && !p.checked_in).length,
    [participants]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-text-muted">Loading participants...</span>
      </div>
    );
  }

  if (participants.length === 0) {
    if (hideManagementModeToggle && defaultManagementMode === 'side_actions') {
      return (
        <div className="space-y-4">
          <ParticipantSideActionSignupsView tournamentId={tournamentId} eventId={eventId} />
        </div>
      );
    }
    return (
      <div className="text-center py-8 bg-surface-light rounded-lg">
        <p className="text-text-muted mb-2">No sign-ups for this event yet.</p>
        <Button
          variant="darkbackground"
          onClick={() => void invalidateParticipantRelatedQueries()}
        >
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hideManagementModeToggle && (
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-text">Screen:</span>
        <button
          type="button"
          onClick={() => setManagementMode('participants')}
          className={`px-3 py-1 rounded-md text-sm border transition-colors ${
            managementMode === 'participants'
              ? 'bg-primary text-white border-primary'
              : 'bg-surface-light border-border text-text-muted hover:border-primary/50'
          }`}
        >
          Participant roster
        </button>
        <button
          type="button"
          onClick={() => setManagementMode('side_actions')}
          className={`px-3 py-1 rounded-md text-sm border transition-colors ${
            managementMode === 'side_actions'
              ? 'bg-primary text-white border-primary'
              : 'bg-surface-light border-border text-text-muted hover:border-primary/50'
          }`}
        >
          Side action signups
        </button>
      </div>
      )}

      {managementMode === 'side_actions' ? (
        <ParticipantSideActionSignupsView tournamentId={tournamentId} eventId={eventId} />
      ) : (
        <>
      {/* Participant Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-surface-light p-4 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-text">{stats.total}</div>
          <div className="text-sm text-text-muted">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-success">{stats.approved}</div>
          <div className="text-sm text-text-muted">On roster</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-pending">{stats.pending}</div>
          <div className="text-sm text-text-muted">Pending sign-ups</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-text-muted">{stats.withdrawn}</div>
          <div className="text-sm text-text-muted">Withdrawn</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{stats.paid}</div>
          <div className="text-sm text-text-muted">Paid</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-accent">{stats.checkedIn}</div>
          <div className="text-sm text-text-muted">Checked In</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-text">View:</span>
          {(
            [
              { key: 'all' as const, label: 'All', count: stats.total },
              { key: 'pending' as const, label: 'Sign-up list', count: stats.pending },
              { key: 'roster' as const, label: 'Roster', count: stats.approved },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRosterView(key)}
              className={`px-3 py-1 rounded-md text-sm border transition-colors ${
                rosterView === key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface-light border-border text-text-muted hover:border-primary/50'
              }`}
            >
              {label}{' '}
              <span className={rosterView === key ? 'opacity-90' : 'opacity-80'}>({count})</span>
            </button>
          ))}
        </div>
        {notCheckedInOnRoster > 0 && (
          <Button
            variant="primary"
            size="small"
            onClick={() => {
              if (notCheckedInOnRoster > 0) void handleCheckInAll();
            }}
            disabled={checkInAllSubmitting}
          >
            {checkInAllSubmitting
              ? 'Checking in…'
              : `Check in all bowlers (${notCheckedInOnRoster})`}
          </Button>
        )}
      </div>

      <TableSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by name, USBC ID, or email"
        className="max-w-xl"
      />

      {displayParticipants.length === 0 && participants.length > 0 && (
        <p className="text-center text-text-muted py-4 text-sm">
          {searchQuery.trim()
            ? 'No participants match your search.'
            : 'No participants in this view. Choose "All" or another filter.'}
        </p>
      )}

      {patchError && (
        <div className="text-sm text-danger border border-danger/40 bg-danger/10 rounded px-3 py-2">
          {patchError}
        </div>
      )}



      {/* Participants Table */}
      {displayParticipants.length > 0 && (
      <div className="bg-surface rounded-lg shadow">
        <DualHorizontalScrollTable stickyTop>
          <table className="table-auto w-full min-w-full divide-y divide-border text-sm">
            <thead className="bg-primary">
              <tr>
                <th
                  scope="col"
                  aria-sort={sortAriaSortFor('participant')}
                  className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider"
                >
                  <div className="flex items-center gap-2">
                    <SortableHeaderCell
                      label="Participant"
                      columnKey="participant"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onToggle={handleSortToggle}
                    />
                    {participantGroups.teams && participantGroups.teams.length > 0 && (
                      <button
                        onClick={toggleAllTeams}
                        className={`inline-flex shrink-0 items-center justify-center w-7 h-7 text-text bg-surface/25 hover:bg-surface/40 border border-border/60 rounded-md transition-colors duration-150 ${allTeamsExpanded ? 'ring-1 ring-border/80' : ''}`}
                        type="button"
                        aria-label={
                          allTeamsExpanded ? 'Collapse all teams' : 'Show all team members'
                        }
                        title={
                          allTeamsExpanded ? 'Collapse all teams' : 'Show all team members'
                        }
                      >
                        {allTeamsExpanded ? (
                          <RemoveIcon className="w-4 h-4" aria-hidden />
                        ) : (
                          <AddIcon className="w-4 h-4" aria-hidden />
                        )}
                      </button>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  aria-sort={sortAriaSortFor('status')}
                  className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider"
                >
                  <SortableHeaderCell
                    label="Status"
                    columnKey="status"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onToggle={handleSortToggle}
                  />
                </th>
                <th
                  scope="col"
                  aria-sort={sortAriaSortFor('qualifyingAverage')}
                  className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider"
                >
                  <SortableHeaderCell
                    label="Qual. avg"
                    columnKey="qualifyingAverage"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onToggle={handleSortToggle}
                  />
                </th>
                <th
                  scope="col"
                  aria-sort={sortAriaSortFor('amount')}
                  className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider"
                >
                  <SortableHeaderCell
                    label="Amount"
                    columnKey="amount"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onToggle={handleSortToggle}
                  />
                </th>
                <th
                  scope="col"
                  aria-sort={sortAriaSortFor('checkIn')}
                  className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider"
                >
                  <SortableHeaderCell
                    label="Check-In"
                    columnKey="checkIn"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onToggle={handleSortToggle}
                  />
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider"
                >
                  Lane
                </th>
                <th
                  scope="col"
                  aria-sort={sortAriaSortFor('signup')}
                  className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider"
                >
                  <SortableHeaderCell
                    label="Sign-up"
                    columnKey="signup"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onToggle={handleSortToggle}
                  />
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {/* Render Teams */}
              {participantGroups.teams && Array.isArray(participantGroups.teams) && participantGroups.teams.map((team) => {
                const teamRowId = getTeamRowId(team.team_id);
                const isTeamExpanded = expandedRows[teamRowId];
                const earliestTeamSignup = team.members.reduce<string | null>((earliest, member) => {
                  if (!earliest) return member.registered_at;
                  return parseNaiveDateTimeToTimestamp(member.registered_at) <
                    parseNaiveDateTimeToTimestamp(earliest)
                    ? member.registered_at
                    : earliest;
                }, null);
                
                return (
                  <React.Fragment key={teamRowId}>
                    {/* Team Header Row */}
                    <tr
                      className={`bg-gradient-to-r from-surface-light to-surface hover:from-surface-light hover:to-surface-light/90 border-l-4 border-primary shadow-sm ${
                        updateTeamNameMutation.isPending &&
                        updateTeamNameMutation.variables?.teamId === team.team_id
                          ? 'opacity-80'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleRowExpansion(teamRowId)}
                            className="mr-2 p-1 bg-transparent border-0 text-text hover:text-primary hover:bg-transparent focus:bg-transparent focus:outline-none transition-colors duration-150 cursor-pointer"
                            style={{ background: 'transparent', border: 'none' }}
                            title={isTeamExpanded ? 'Collapse team' : 'Expand team'}
                            type="button"
                          >
                            {isTeamExpanded ? 
                              <ExpandLessIcon className="w-4 h-4" /> : 
                              <ExpandMoreIcon className="w-4 h-4" />
                            }
                          </button>
                          <GroupIcon className="w-4 h-4 text-primary mr-2 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-text flex items-center gap-2 flex-wrap">
                              <TeamNameInlineCell
                                teamName={team.team_name || ''}
                                displayName={team.team_display_name}
                                onSave={(v) => patchTeamName(team.team_id, v)}
                              />
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-light text-text-muted"
                                title={`Roster size ${team.members.length}/${event?.team_size || 4}`}
                              >
                                {team.members.length}/{event?.team_size || 4}
                              </span>
                              {!team.is_valid && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger/20 text-danger"
                                  title={`Incomplete team, ${team.members.length}/${event?.team_size || 4} members`}
                                >
                                  <StopIcon className="w-3 h-3" />
                                  Incomplete
                                </span>
                              )}
                            </div>
                            {team.team_average != null && (
                              <div className="text-xs text-text-muted">
                                Team average: {team.team_average.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle min-w-0">
                        <div className="flex min-h-[2.25rem] items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            team.approval_status === 'approved' 
                              ? 'bg-success/20 text-success' 
                              : team.approval_status === 'partial'
                              ? 'bg-pending/25 text-pending'
                              : 'bg-danger/20 text-danger'
                          }`}>
                            {team.members_approved}/{team.members.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-text-muted">
                        {(() => {
                          const teamAvg = teamQualifyingAverage(team.members);
                          return teamAvg == null ? '—' : teamAvg.toFixed(1);
                        })()}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            team.payment_status === 'paid' 
                              ? 'bg-success/20 text-success' 
                              : 'bg-surface-light text-text-muted'
                          }`}>
                            {team.members_paid}/{team.members.length}
                          </span>
                          {team.payment_status !== 'paid' && (
                            <Button
                              variant="darkbackground"
                              size="small"
                              onClick={() => handleTeamMarkAsPaid(team.team_id, event?.entry_fee || 0)}
                              disabled={teamActionTeamId === team.team_id}
                              className="text-xs px-2 py-1"
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            team.members_checked_in === team.members.length
                              ? 'bg-success/20 text-success' 
                              : 'bg-surface-light text-text-muted'
                          }`}>
                            {team.members_checked_in}/{team.members.length}
                          </span>
                          {team.members_checked_in < team.members.length && (
                            <Button
                              variant="lightbackground"
                              size="small"
                              onClick={() => handleTeamCheckIn(team.team_id)}
                              disabled={teamActionTeamId === team.team_id}
                              className="text-xs px-2 py-1"
                            >
                              Check In
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-text-muted">—</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-text">
                        {earliestTeamSignup ? formatDateTimeSecondsNaive(earliestTeamSignup) : '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          <Button
                            variant="darkbackground"
                            size="small"
                            onClick={() => handleTeamAccept(team.team_id)}
                            disabled={team.approval_status === 'approved' || teamActionTeamId === team.team_id}
                            className="text-xs px-2 py-1"
                          >
                            Accept Team
                          </Button>
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleDeleteTeam(team.team_id, team.team_display_name)}
                            disabled={deleteTeamMutation.isPending}
                            className="text-xs px-2 py-1 bg-red-600 text-white hover:bg-red-700"
                          >
                            Delete Team
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Team Members (when expanded) */}
                    {isTeamExpanded && team.members.map((participant) => {
                      const statusDisplay = getStatusDisplay(participant.status);
                      const participantRowId = getParticipantRowId(participant.id);
                      const isParticipantExpanded = expandedRows[participantRowId];
                      const userId = participant.user_id;
                      const isRowPatching = Boolean(patchingParticipantIds[participant.id]);

                      return (
                        <React.Fragment key={participant.id}>
                          <tr
                            className={`border-l-4 border-accent/40 relative ${
                              isRowPatching
                                ? 'bg-pending/20 hover:bg-pending/25'
                                : 'bg-accent/5 hover:bg-accent/10'
                            }`}
                            data-guide-id={`guide-participant-row-${participant.id}`}
                          >
                            {/* Team Member Info */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 flex justify-center">
                                  <button
                                    onClick={() => toggleRowExpansion(participantRowId)}
                                    className="p-1 bg-transparent border-0 text-text-dim hover:text-text-muted hover:bg-transparent focus:bg-transparent focus:outline-none transition-colors duration-150 cursor-pointer"
                                    style={{ background: 'transparent', border: 'none' }}
                                    title={isParticipantExpanded ? 'Collapse details' : 'Expand details'}
                                    type="button"
                                  >
                                    {isParticipantExpanded ? 
                                      <ExpandLessIcon className="w-4 h-4" /> : 
                                      <ExpandMoreIcon className="w-4 h-4" />
                                    }
                                  </button>
                                </div>
                                <PersonIcon className="w-4 h-4 text-accent mr-2" />
                                
                                {/* Captain Badge - Clickable */}
                                {participant.is_team_captain && (
                                  <button
                                    type="button"
                                    className="rounded-full p-1 mr-2 cursor-pointer transition-all duration-200 hover:scale-110 bg-pending/15 hover:bg-pending/25"
                                    onClick={() => handleOpenCaptainModal(team.team_id, team.team_display_name, team.members)}
                                    title="Captain (click to reassign)"
                                  >
                                    <StarIcon className="w-4 h-4 text-pending" />
                                  </button>
                                )}

                                <div className="ml-4">
                                  {renderParticipantNameBlock(participant, { captainBadge: true })}
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-3 align-middle min-w-0">
                              <div className={isRowPatching ? 'pointer-events-none opacity-60' : undefined}>
                                <ClickableSwapCell
                                  compact
                                  title="Click to cycle: Pending → Approved → Withdrawn."
                                  value={participant.status}
                                  onChange={(value) =>
                                    void patchParticipant(participant.id, { status: value as string })
                                  }
                                  options={[
                                    { key: 'pending', label: 'Pending' },
                                    { key: 'approved', label: 'Approved' },
                                    { key: 'withdrawn', label: 'Withdrawn' }
                                  ]}
                                />
                              </div>
                            </td>

                            {/* Qualifying average */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <ParticipantQualifyingAverageCell
                                eventId={eventId}
                                participantId={participant.id}
                                userId={participant.user_id}
                                qualifyingAverage={participant.qualifying_average}
                                disabled={isRowPatching}
                                onPatch={async (participantId, average) => {
                                  await patchParticipant(participantId, {
                                    qualifying_average: average,
                                  });
                                }}
                              />
                            </td>

                            {/* Paid Amount */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <InlineEditableCell
                                  type="currency"
                                  value={participant.paid_amount}
                                  onSave={async (value) => {
                                    await patchParticipant(participant.id, { paid_amount: value as number | null });
                                  }}
                                  min={0}
                                  max={9999.99}
                                  disabled={isRowPatching}
                                  className={getPaidAmountCellClassName(participant)}
                                />
                                {renderMarkPaidButton(participant, isRowPatching)}
                              </div>
                            </td>

                            {/* Check-In */}
                            <td className="px-3 py-3 align-middle min-w-0">
                              <div className={isRowPatching ? 'pointer-events-none opacity-60' : undefined}>
                                <ClickableSwapCell
                                  compact
                                  value={participant.checked_in}
                                  onChange={(value) =>
                                    void patchParticipant(participant.id, { checked_in: value as boolean })
                                  }
                                  options={[
                                    { key: false, label: 'Not Checked In' },
                                    { key: true, label: 'Checked In' }
                                  ]}
                                />
                              </div>
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap">
                              <ParticipantLaneAssignCell
                                eventId={eventId}
                                eventParticipantId={participant.id}
                                canManageLanes={canManageLanes}
                                disabled={isRowPatching}
                              />
                            </td>

                            {/* Sign-up */}
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-text">
                              {formatDateTimeSecondsNaive(participant.registered_at) || '—'}
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <Button
                                variant="danger"
                                size="small"
                                onClick={() => handleDeleteParticipant(participant.id, participant.user_name)}
                                disabled={deleteParticipantMutation.isPending}
                                className="text-xs px-2 py-1 bg-red-600 text-white hover:bg-red-700"
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>

                                                     {/* Expanded Team Member Details */}
                           {isParticipantExpanded && (
                             <tr className="bg-surface-light/80 border-l-4 border-accent/30">
                              <td colSpan={8} className="px-3 py-3 border-l-8 border-accent/25">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ml-8">
                                  {/* Historical Averages */}
                                  <div>
                                    <HistoricalAveragesDisplay userId={userId} />
                                  </div>

                                  {/* Additional Info and Notes */}
                                  <div className="space-y-4">
                                    <div className="space-y-3">
                                      <h4 className="text-sm font-medium text-text-muted">Handicap</h4>
                                      <InlineEditableCell
                                        type="number"
                                        value={participant.handicap}
                                        onSave={async (value) => {
                                          await patchParticipant(participant.id, {
                                            handicap: value as number | null
                                          });
                                        }}
                                        max={100}
                                        placeholder="No handicap"
                                        disabled={isRowPatching}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-medium text-text-muted">Rolling average (50-game)</h4>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm text-text">
                                          {participant.user_average_50games_score?.toFixed(1) || '—'}
                                        </span>
                                        {participant.user_average_50games_score && (
                                          <Button
                                            variant="lightbackground"
                                            size="small"
                                            onClick={() =>
                                              void patchParticipant(participant.id, {
                                                qualifying_average: participant.user_average_50games_score
                                              })
                                            }
                                            disabled={isRowPatching}
                                            className="text-xs px-2 py-1"
                                          >
                                            Use
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="text-sm font-medium text-text-muted mb-2">Sign-up details</h4>
                                      <div className="text-xs text-text-muted space-y-1">
                                        {participant.approval_date && (
                                          <div>Approved: {formatDateTimeSecondsNaive(participant.approval_date)}</div>
                                        )}
                                        {participant.checked_in_at && (
                                          <div>Checked In: {formatDateTimeSecondsNaive(participant.checked_in_at)}</div>
                                        )}
                                        <div>Entry #{participant.entry_number}</div>
                                        {participant.team_position && (
                                          <div>Team Position: {participant.team_position}</div>
                                        )}
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="text-sm font-medium text-text-muted mb-2">Notes</h4>
                                      <InlineEditableCell
                                        type="text"
                                        value={participant.notes}
                                        onSave={async (value) => {
                                          await patchParticipant(participant.id, { notes: value as string | null });
                                        }}
                                        placeholder="Add notes..."
                                        className="w-full"
                                        disabled={isRowPatching}
                                      />
                                    </div>

                                    <div>
                                      <h4 className="text-sm font-medium text-text-muted mb-2">User Averages</h4>
                                      <div className="text-xs text-text-muted space-y-1">
                                        <div>Lifetime: {participant.user_average_lifetime_score?.toFixed(1) || '—'}</div>
                                        <div>1-year: {participant.user_average_365day_score?.toFixed(1) || '—'}</div>
                                        <div>90-day: {participant.user_average_90day_score?.toFixed(1) || '—'}</div>
                                        <div>50-game: {participant.user_average_50games_score?.toFixed(1) || '—'}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Add Participant slots for incomplete teams - only show when expanded */}
                    {isTeamExpanded && event?.team_size && team.members.length < event.team_size && Array.from({ length: event.team_size - team.members.length }).map((_, index) => (
                      <tr key={`add-participant-${team.team_id}-${index}`} className="bg-accent/5 hover:bg-accent/10 border-l-4 border-dashed border-border">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 flex justify-center">
                              <div className="w-4 h-4 border-2 border-dashed border-border rounded"></div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-primary">
                                Add Participant
                              </div>
                              <div className="text-xs text-text-muted">
                                Slot {team.members.length + index + 1} of {event.team_size}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle min-w-0">
                          <div className="flex min-h-[2.25rem] items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-light text-text-muted">
                              Empty
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-text-muted">—</td>
                        <td className="px-3 py-3 whitespace-nowrap">—</td>
                        <td className="px-3 py-3 whitespace-nowrap">—</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-text-muted">—</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Button
                            variant="lightbackground"
                            size="small"
                            onClick={() => handleAddMember(team.team_id, team.team_display_name)}
                            className="text-xs px-2 py-1 border-border text-primary hover:bg-accent/15"
                          >
                            Add Member
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Render Individual Participants */}
              {participantGroups.individuals && Array.isArray(participantGroups.individuals) && participantGroups.individuals.map((participant) => {
                const statusDisplay = getStatusDisplay(participant.status);
                const participantRowId = getParticipantRowId(participant.id);
                const isExpanded = expandedRows[participantRowId];
                const userId = participant.user_id; // Use the correct field name for user ID
                const isRowPatching = Boolean(patchingParticipantIds[participant.id]);

                return (
                  <React.Fragment key={participant.id}>
                    <tr
                      className={`hover:bg-surface-light ${isRowPatching ? 'bg-pending/15' : ''}`}
                      data-guide-id={`guide-participant-row-${participant.id}`}
                    >
                      {/* Participant Info */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleRowExpansion(participantRowId)}
                            className="mr-3 p-1 bg-transparent border-0 text-text-dim hover:text-text-muted hover:bg-transparent focus:bg-transparent focus:outline-none transition-colors duration-150 cursor-pointer"
                            style={{ background: 'transparent', border: 'none' }}
                            title={isExpanded ? 'Collapse details' : 'Expand details'}
                            type="button"
                          >
                            {isExpanded ? 
                              <ExpandLessIcon className="w-5 h-5" /> : 
                              <ExpandMoreIcon className="w-5 h-5" />
                            }
                          </button>
                          <div>
                            {renderParticipantNameBlock(participant)}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 align-middle min-w-0">
                        <div className={isRowPatching ? 'pointer-events-none opacity-60' : undefined}>
                          <ClickableSwapCell
                            compact
                            title="Click to cycle: Pending → Approved → Withdrawn."
                            value={participant.status}
                            onChange={(value) =>
                              void patchParticipant(participant.id, { status: value as string })
                            }
                            options={[
                              { key: 'pending', label: 'Pending' },
                              { key: 'approved', label: 'Approved' },
                              { key: 'withdrawn', label: 'Withdrawn' }
                            ]}
                          />
                        </div>
                      </td>

                      {/* Qualifying average */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <ParticipantQualifyingAverageCell
                          eventId={eventId}
                          participantId={participant.id}
                          userId={participant.user_id}
                          qualifyingAverage={participant.qualifying_average}
                          disabled={isRowPatching}
                          onPatch={async (participantId, average) => {
                            await patchParticipant(participantId, {
                              qualifying_average: average,
                            });
                          }}
                        />
                      </td>

                      {/* Paid Amount */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <InlineEditableCell
                            type="currency"
                            value={participant.paid_amount}
                            onSave={async (value) => {
                              await patchParticipant(participant.id, { paid_amount: value as number | null });
                            }}
                            min={0}
                            max={9999.99}
                            disabled={isRowPatching}
                            className={getPaidAmountCellClassName(participant)}
                          />
                          {renderMarkPaidButton(participant, isRowPatching)}
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="px-3 py-3 align-middle min-w-0">
                        <div className={isRowPatching ? 'pointer-events-none opacity-60' : undefined}>
                          <ClickableSwapCell
                            compact
                            value={participant.checked_in}
                            onChange={(value) =>
                              void patchParticipant(participant.id, { checked_in: value as boolean })
                            }
                            options={[
                              { key: false, label: 'Not Checked In' },
                              { key: true, label: 'Checked In' }
                            ]}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <ParticipantLaneAssignCell
                          eventId={eventId}
                          eventParticipantId={participant.id}
                          canManageLanes={canManageLanes}
                          disabled={isRowPatching}
                        />
                      </td>

                      {/* Sign-up */}
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-text">
                        {formatDateTimeSecondsNaive(participant.registered_at) || '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleDeleteParticipant(participant.id, participant.user_name)}
                          disabled={deleteParticipantMutation.isPending}
                          className="text-xs px-2 py-1 bg-red-600 text-white hover:bg-red-700"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>

                    {/* Expanded Individual Participant Details */}
                    {isExpanded && (
                      <tr className="bg-surface-light">
                        <td colSpan={8} className="px-3 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Historical Averages */}
                            <div>
                              <HistoricalAveragesDisplay userId={userId} />
                            </div>

                            {/* Additional Info and Notes */}
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium text-text-muted">Handicap</h4>
                                <InlineEditableCell
                                  type="number"
                                  value={participant.handicap}
                                  onSave={async (value) => {
                                    await patchParticipant(participant.id, {
                                      handicap: value as number | null
                                    });
                                  }}
                                  max={100}
                                  placeholder="No handicap"
                                  disabled={isRowPatching}
                                />
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-text-muted">Rolling average (50-game)</h4>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm text-text">
                                    {participant.user_average_50games_score?.toFixed(1) || '—'}
                                  </span>
                                  {participant.user_average_50games_score && (
                                    <Button
                                      variant="lightbackground"
                                      size="small"
                                      onClick={() =>
                                        void patchParticipant(participant.id, {
                                          qualifying_average: participant.user_average_50games_score
                                        })
                                      }
                                      disabled={isRowPatching}
                                      className="text-xs px-2 py-1"
                                    >
                                      Use
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-medium text-text-muted mb-2">Sign-up details</h4>
                                <div className="text-xs text-text-muted space-y-1">
                                    {participant.approval_date && (
                                    <div>Approved: {formatDateTimeSecondsNaive(participant.approval_date)}</div>
                                    )}
                                    {participant.checked_in_at && (
                                    <div>Checked In: {formatDateTimeSecondsNaive(participant.checked_in_at)}</div>
                                    )}
                                  <div>Entry #{participant.entry_number}</div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-medium text-text-muted mb-2">Notes</h4>
                                <InlineEditableCell
                                  type="text"
                                  value={participant.notes}
                                  onSave={async (value) => {
                                    await patchParticipant(participant.id, { notes: value as string | null });
                                  }}
                                  placeholder="Add notes..."
                                  className="w-full"
                                  disabled={isRowPatching}
                                />
                              </div>

                              <div>
                                <h4 className="text-sm font-medium text-text-muted mb-2">User Averages</h4>
                                <div className="text-xs text-text-muted space-y-1">
                                  <div>Lifetime: {participant.user_average_lifetime_score?.toFixed(1) || '—'}</div>
                                  <div>1-year: {participant.user_average_365day_score?.toFixed(1) || '—'}</div>
                                  <div>90-day: {participant.user_average_90day_score?.toFixed(1) || '—'}</div>
                                  <div>50-game: {participant.user_average_50games_score?.toFixed(1) || '—'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </DualHorizontalScrollTable>
      </div>
      )}

      {/* Add Team Member Modal */}
      {selectedTeamForMember && (
        <AddTeamMemberModal
          isOpen={addMemberModalOpen}
          onClose={handleAddMemberModalClose}
          eventId={eventId}
          teamId={selectedTeamForMember.teamId}
          teamName={selectedTeamForMember.teamName}
          existingParticipants={participants.map(p => p.user_id)}
          onSuccess={handleMemberAdded}
        />
      )}

      {/* Captain Selection Modal */}
      {selectedTeamForCaptain && (
        <CaptainSelectionModal
          isOpen={captainModalOpen}
          onClose={handleCloseCaptainModal}
          teamMembers={selectedTeamForCaptain.members}
          currentCaptainId={selectedTeamForCaptain.currentCaptainId}
          teamName={selectedTeamForCaptain.teamName}
          onSelectCaptain={handleSelectNewCaptain}
        />
      )}

      <ParticipantAssignUsbcModal
        target={assignUsbcTarget}
        onClose={() => {
          setAssignUsbcTarget(null);
          setAssignUsbcError(null);
        }}
        onSubmit={handleSubmitAssignUsbc}
        error={assignUsbcError}
        submitting={assignUsbcSubmitting}
      />

      <ParticipantDemographicsModal
        eventId={eventId}
        participant={demographicsTarget}
        onClose={() => setDemographicsTarget(null)}
        onSaved={({ participantId, gender, birth_date, is_senior, is_youth }) => {
          setParticipantListInCache((list) =>
            list.map((p) =>
              p.id === participantId
                ? {
                    ...p,
                    user_gender: gender,
                    user_birth_date: birth_date,
                    ...(typeof is_senior === 'boolean' ? { is_senior } : {}),
                    ...(typeof is_youth === 'boolean' ? { is_youth } : {}),
                  }
                : p
            )
          );
          scopedParticipantRefresh();
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDeleteConfirm}
        title={deleteConfirm?.type === 'team' ? 'Delete Team' : 'Remove Participant'}
        message={
          deleteConfirm?.type === 'team'
            ? `Are you sure you want to delete team "${deleteConfirm.teamName}"? This will remove all team members and cannot be undone.`
            : deleteConfirm?.type === 'participant'
              ? `Are you sure you want to remove "${deleteConfirm.participantName}" from this event? This cannot be undone.`
              : ''
        }
        confirmText={deleteConfirm?.type === 'team' ? 'Delete Team' : 'Remove'}
        cancelText="Cancel"
        confirmVariant="danger"
      />
        </>
      )}
    </div>
  );
};

export default ParticipantManagementTable; 
