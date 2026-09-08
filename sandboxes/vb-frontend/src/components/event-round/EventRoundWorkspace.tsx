import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { SquadsAPI } from '../../api/squads';
import { EventsAPI } from '../../api/events';
import { RoundsAPI } from '../../api/rounds';
import { RoundMatchSeriesAPI } from '../../api/round-match-series';
import { AdvancementPoolAPI } from '../../api/advancement-pool';
import { EventParticipantWithUser } from '../../types/event';
import {
  SquadAssignment,
  SquadCreate,
  SquadRead,
  SquadStatus,
  SquadUpdate,
} from '../../types/squad';
import SquadNameDatetimeModal from '../squad/SquadNameDatetimeModal';
import { DragDropCategory, DragDropItem } from '../common/DragDropCategorizedTable';
import Loading from '../common/Loading';
import Alert from '../common/Alert';
import SquadUnlockConfirmDialog from './SquadUnlockConfirmDialog';
import ReEntryModal from '../event/ReEntryModal';
import SportsIcon from '@mui/icons-material/Sports';
import { useSquadManagement } from '../../hooks/useSquadManagement';
import { useSquadParticipants } from '../../hooks/useSquadParticipants';
import { useAdvancementPool } from '../../hooks/useAdvancementPool';
import { useAssignmentChanges } from '../../hooks/useAssignmentChanges';
import { useTeamAssignmentChanges } from '../../hooks/useTeamAssignmentChanges';
import { useGameChanges } from '../../hooks/useGameChanges';
import { useRoundManagement } from '../../hooks/useRoundManagement';
import { useModalState } from '../../hooks/useModalState';
import { useMessageState } from '../../hooks/useMessageState';
import { AssignmentService } from '../../services/assignmentService';
import { getErrorMessage } from '../../api/apiErrors';
import { useSourceRoundAdvancementDestinations } from '../../hooks/useSourceRoundAdvancementDestinations';
import { buildPoolTeamsForRound } from '../../utils/advancementPoolTeams';
import { TeamsAPI } from '../../api/teams';
import RoundControls from '../event/RoundControls';
import ScoringModeControls from '../event/ScoringModeControls';
import ParticipantItem from '../event/ParticipantItem';
import TeamItem from '../event/TeamItem';
import { EventTeamWithMembers } from '../../types/event_team';
import { PendingAssignmentChanges } from '../../services/assignmentService';
import IndividualAssignment from '../event/IndividualAssignment';
import TeamAssignment from '../event/TeamAssignment';
import { ScoringTabOrderProvider } from '../../contexts/ScoringTabOrderContext';
import { useScoringTabMode } from '../../hooks/useScoringTabMode';
import { getMostRelevantRound, isRoundIdValid } from '../../features/rounds/roundRelevance';
import { usePersistedRoundSelection } from '../../features/rounds/usePersistedRoundSelection';
import EventRoundTabChrome from './EventRoundTabChrome';
import EventRoundPendingChangesBar from './EventRoundPendingChangesBar';
import { buildSquadCategoriesForScoring } from '../../utils/eventRound/buildSquadCategoriesForScoring';
import {
  ASSIGNMENT_BATCH_CHUNK_SIZE,
  buildIndividualAssignmentSavePlan,
  formatSkippedRemovalError,
} from '../../utils/eventRound/buildIndividualAssignmentSavePlan';
import {
  formatGameBatchErrors,
  workspaceGameSaveQueryKeys,
  workspacePostSaveQueryKeys,
} from '../../utils/eventRound/workspaceSaveHelpers';
import { submitEventRoundWorkspaceChanges } from '../../utils/eventRound/submitEventRoundWorkspaceChanges';
import ScoringSurfaceRouter from '../event-scoring/ScoringSurfaceRouter';
import BakerLeagueReconcileView from '../event-scoring/BakerLeagueReconcileView';
import BakerLeagueLaneAssignmentsView from '../event-scoring/BakerLeagueLaneAssignmentsView';
import RoundGameCountControls from '../event-scoring/RoundGameCountControls';
import RoundScoreCsvControls from '../event-scoring/RoundScoreCsvControls';
import type { CompetitionMethod } from '../event-scoring/types';
import { useAdjustRoundGameCount } from '../../hooks/useAdjustRoundGameCount';
import {
  bonusPinsConfigured,
  computeMatchPlayBonusByTeamId,
  parseBonusPinsConfig,
} from '../../utils/bonusPins';
import {
  getSelectedRoundBracketMode,
  getSelectedRoundCompetitionMethod,
  getSelectedRoundPodSize,
  getSelectedRoundPositionRoundGame,
  getSelectedRoundScheduledGames,
} from '../event-scoring/visual/selectedRoundScoringConfig';
import {
  buildScoringVisualDiagnostics,
  buildScoringVisualParticipants,
  deriveScoringEmptyReason,
} from '../event-scoring/visual/buildScoringVisualParticipants';
import {
  buildPendingGameScorePayloads,
  chunkArray,
  evaluateBatchSaveOutcome,
  persistPendingGameScores,
} from '../../utils/pendingGameScoreSave';
import { getCompetitionMethodDisplayLabel } from '../../utils/competitionMethodDisplay';
import { buildLaneLabelLookup, useLaneScoreSheet } from '../../features/lanes';
import { useBakerLeagueLanePreview } from './useBakerLeagueLanePreview';
import { useAdvancerSquadBootstrap } from './useAdvancerSquadBootstrap';
import AdvancerAssignBanner from './AdvancerAssignBanner';

export interface EventRoundWorkspaceProps {
  eventId: number;
  eventComplete: any;
  isAuthorizedForManagement: boolean;
  surfaceMode?: 'squads' | 'scoring';
  /** Called after scores/assignments save so championship, rounds, and Event Flow stay in sync */
  onAfterSuccessfulSave?: () => void;
  forceHideRoundSelector?: boolean;
}

const EventRoundWorkspace: React.FC<EventRoundWorkspaceProps> = ({
  eventId,
  eventComplete,
  isAuthorizedForManagement,
  surfaceMode = 'squads',
  onAfterSuccessfulSave,
  forceHideRoundSelector = false,
}) => {
  const queryClient = useQueryClient();
  // Use custom hooks for state management
  const {
    assignmentError,
    setAssignmentError,
    successMessage,
    setSuccessMessage
  } = useMessageState();

  const {
    reEntryModalOpen,
    setReEntryModalOpen,
    selectedSquadForReEntry,
    setSelectedSquadForReEntry,
    showUnlockConfirm,
    setShowUnlockConfirm
  } = useModalState();

  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [squadNameDtModalMode, setSquadNameDtModalMode] = useState<'create' | 'edit' | null>(null);
  const [squadBeingEdited, setSquadBeingEdited] = useState<SquadRead | null>(null);
  const [squadModalServerError, setSquadModalServerError] = useState<string | null>(null);
  /** Team assign/remove uses raw API calls (not useMutation); track so Save shows Saving... */
  const [isSavingTeamAssignments, setIsSavingTeamAssignments] = useState(false);
  const [squadUnlockConfirmId, setSquadUnlockConfirmId] = useState<number | null>(null);
  const hasInitializedRoundRef = useRef(false);

  // Check if this is a team-based event
  const isTeamEvent = eventComplete?.event_format === 'teams';

  const squadsSurface = surfaceMode === 'squads';
  const scoringSurface = surfaceMode === 'scoring';
  const surfaceTitle = squadsSurface ? 'Squads Management' : 'Game Scoring Management';
  const surfaceSubtitle = squadsSurface
    ? 'Manage squad assignments and lock squads when ready to score'
    : 'Track scores and monitor scoring progress for this event';
  const permissionMessage = scoringSurface
    ? "You don't have permission to manage game scoring for this event."
    : "You don't have permission to manage squads for this event.";

  const {
    tabMode,
    setTabMode,
    teamScoringMode,
    setTeamScoringMode,
    scoringViewMode,
    setScoringViewMode,
    participantSortOrder,
    setParticipantSortOrder,
  } = useScoringTabMode();

  const selectedRoundIsBaker = useMemo(() => {
    if (!selectedRoundId || !Array.isArray(eventComplete?.rounds)) return false;
    const round = eventComplete.rounds.find(
      (r: { id: number }) => Number(r.id) === Number(selectedRoundId)
    );
    const cfg = (round?.competition_method_config || {}) as Record<string, unknown>;
    return String(cfg.game_style || 'standard').toLowerCase() === 'baker';
  }, [eventComplete?.rounds, selectedRoundId]);

  const selectedRoundMethodConfig = useMemo(() => {
    if (!selectedRoundId || !Array.isArray(eventComplete?.rounds)) return null;
    const round = eventComplete.rounds.find(
      (r: { id: number }) => Number(r.id) === Number(selectedRoundId)
    );
    return (round?.competition_method_config || null) as Record<string, unknown> | null;
  }, [eventComplete?.rounds, selectedRoundId]);

  const selectedRoundCompetitionMethod: CompetitionMethod = useMemo(
    () => getSelectedRoundCompetitionMethod(eventComplete?.rounds, selectedRoundId),
    [eventComplete?.rounds, selectedRoundId]
  );

  const effectiveTeamScoringMode = selectedRoundIsBaker ? 'team' : teamScoringMode;
  const { getPersistedRoundId, setPersistedRoundId, clearPersistedRoundId } =
    usePersistedRoundSelection(eventId);

  // Use the squad management hook
  const {
    squads,
    allEventSquads,
    participants,
    roundRelationships,
    outgoingRelationships,
    loadingSquads,
    loadingParticipants,
    squadsError,
    expandedCategories,
    toggleCategory,
    updateExpandedState
  } = useSquadManagement({ eventId, selectedRoundId });

  const incomingRelationships = useMemo(
    () =>
      (roundRelationships || []).filter(
        (r: any) => r && Number(r.target_round_id) === Number(selectedRoundId)
      ),
    [roundRelationships, selectedRoundId]
  );

  const incomingRelationshipsWithCarry = useMemo(
    () => incomingRelationships.filter((r: any) => Boolean(r?.carry_over_enabled)),
    [incomingRelationships]
  );

  const { data: carryOverTotalsResponse } = useQuery({
    queryKey: ['carryOverTotals', selectedRoundId],
    queryFn: () => RoundsAPI.getCarryOverTotalsForRound(selectedRoundId as number),
    enabled: !!selectedRoundId && scoringSurface && incomingRelationshipsWithCarry.length > 0,
  });

  const carryOverTotalsByRelationshipId = useMemo(() => {
    const raw = carryOverTotalsResponse?.relationships;
    if (!raw || typeof raw !== 'object') return undefined;
    const out: Record<number, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      const id = Number(k);
      if (!Number.isFinite(id)) continue;
      out[id] = v;
    }
    return Object.keys(out).length ? out : undefined;
  }, [carryOverTotalsResponse]);

  // Fetch teams for team-based events
  const { data: teams = [], isLoading: loadingTeams } = useQuery<EventTeamWithMembers[]>({
    queryKey: ['eventTeams', eventId],
    queryFn: () => TeamsAPI.getEventTeams(eventId),
    enabled: isTeamEvent && !!eventId,
  });

  // A full page reload tears down the document: in-flight assign/remove requests are aborted, so only
  // completed calls persist. Warn if the user tries to refresh or close the tab during team save.
  useEffect(() => {
    if (!isSavingTeamAssignments) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isSavingTeamAssignments]);

  // One request per round (all squads) — must run before useRoundManagement so it gets real participant counts
  const {
    squadParticipants,
    isLoadingSquadParticipants
  } = useSquadParticipants({ roundId: selectedRoundId });

  const {
    allSquadsLockedIn,
    anySquadLockedIn,
    getRoundStatus,
    roundStatusData,
    isLoadingRoundStatus,
    handleUnlockRound,
    isUnlocking: unlockFromRoundManagement,
    lockSquad,
    unlockSquad,
    isLockingSquadId,
    isUnlockingSquadId,
    completeRound,
    isCompletingRound,
    selectedRoundRealtimeStatus,
  } = useRoundManagement({
    eventId,
    selectedRoundId,
    eventComplete,
    allSquads: allEventSquads,
    onSquadActionError: (message) => {
      setAssignmentError(message);
      setTimeout(() => setAssignmentError(null), 10000);
    },
  });

  // Use the advancement pool hook
  const {
    allPoolParticipants,
    unassignedParticipants,
    loadingPoolParticipants,
    isInitialRound,
    hasIncomingRelationships
  } = useAdvancementPool({
    selectedRoundId,
    participants,
    squadParticipants,
    roundRelationships
  });

  // Use the assignment changes hook (for individual participants)
  const {
    pendingAssignmentChanges,
    handleDragDropAssignment,
    handleReEnterParticipants,
    clearAssignmentChanges,
    handleStageReEntryRemoval,
    handleUndoRemoval,
    setPendingAssignmentChanges,
  } = useAssignmentChanges({
    squadParticipants,
    squads,
    selectedRoundId,
    unassignedParticipants,
    participants
  });

  // Fetch all squad teams for the selected round in one request (team events)
  const { data: squadTeamsData = {}, isLoading: loadingSquadTeams } = useQuery({
    queryKey: ['squadTeams', selectedRoundId],
    queryFn: async () => {
      if (!selectedRoundId) return {};
      const res = await SquadsAPI.getRoundTeams(selectedRoundId);
      const result: Record<number, any[]> = {};
      for (const row of res.squads || []) {
        result[row.squad_id] = row.teams || [];
      }
      return result;
    },
    enabled: isTeamEvent && !!selectedRoundId && !loadingSquads,
  });

  /** Teams that appear in the advancement pool for the selected round (for metadata + eligibility). */
  const poolTeamsForRound = useMemo(() => {
    if (!isTeamEvent || !teams?.length || !selectedRoundId) return [];
    const incoming = roundRelationships.filter(
      (r: any) => r && Number(r.target_round_id) === Number(selectedRoundId)
    );
    return buildPoolTeamsForRound(
      allPoolParticipants || [],
      teams,
      selectedRoundId,
      incoming
    );
  }, [isTeamEvent, teams, selectedRoundId, allPoolParticipants, roundRelationships]);

  /**
   * Initial round (no edges into this round): unassigned = registered teams not yet placed in a squad.
   * Bracket rounds (incoming edges): unassigned = teams in the advancement pool for this round that
   * are not yet assigned to a squad — same idea as singles using pool participants.
   */
  const unassignedTeams = useMemo(() => {
    if (!isTeamEvent || !teams || !squadTeamsData || !squads) return [];

    const squadsInRound = squads.filter((s) => s.round_id === selectedRoundId);
    const assignedTeamIds = new Set<number>();
    squadsInRound.forEach((squad) => {
      (squadTeamsData[squad.id] || []).forEach((t: any) => {
        if (t?.id) assignedTeamIds.add(t.id);
      });
    });

    if (!hasIncomingRelationships) {
      return teams.filter((t) => !assignedTeamIds.has(t.id));
    }

    return poolTeamsForRound.filter((t) => !assignedTeamIds.has(t.id));
  }, [
    isTeamEvent,
    teams,
    squadTeamsData,
    squads,
    selectedRoundId,
    roundRelationships,
    poolTeamsForRound,
    hasIncomingRelationships
  ]);

  /** People currently on squads in this round (singles / team member rows). */
  const participantsInRoundSquadsCount = useMemo(() => {
    if (!squads?.length || !squadParticipants) return 0;
    return squads.reduce(
      (sum, squad) => sum + (squadParticipants[squad.id]?.length || 0),
      0
    );
  }, [squads, squadParticipants]);

  /** Distinct teams placed in squads for this round (team events). */
  const teamsAssignedInRoundCount = useMemo(() => {
    if (!isTeamEvent || !squads?.length || !squadTeamsData) return 0;
    const ids = new Set<number>();
    for (const sq of squads) {
      for (const t of squadTeamsData[sq.id] || []) {
        if (t?.id) ids.add(t.id);
      }
    }
    return ids.size;
  }, [isTeamEvent, squads, squadTeamsData]);

  /**
   * RoundControls disables lock when this is 0. For bracket rounds, count must not rely only
   * on advancement pool GET (can be empty after assignments) — use roster in squads too.
   */
  const totalParticipantsCount = useMemo(() => {
    if (isTeamEvent) {
      if (isInitialRound) {
        return teams?.length || 0;
      }
      return Math.max(
        allPoolParticipants?.length || 0,
        teamsAssignedInRoundCount,
        participantsInRoundSquadsCount
      );
    }
    if (isInitialRound) {
      return participants?.length || 0;
    }
    return Math.max(
      allPoolParticipants?.length || 0,
      participantsInRoundSquadsCount
    );
  }, [
    isTeamEvent,
    isInitialRound,
    teams,
    participants,
    allPoolParticipants,
    participantsInRoundSquadsCount,
    teamsAssignedInRoundCount
  ]);

  // Update expanded state when squad participants change
  useEffect(() => {
    if (squadParticipants && Object.keys(squadParticipants).length > 0) {
      updateExpandedState(squadParticipants, unassignedParticipants);
    }
  }, [squadParticipants, unassignedParticipants, updateExpandedState]);

  // Update expanded state for team events when squad teams data changes
  useEffect(() => {
    if (isTeamEvent && squadTeamsData && Object.keys(squadTeamsData).length > 0) {
      // Convert squad teams data to the format expected by updateExpandedState
      const teamSquadParticipants: { [squadId: number]: any[] } = {};
      Object.entries(squadTeamsData).forEach(([squadId, teams]) => {
        teamSquadParticipants[parseInt(squadId)] = teams || [];
      });
      updateExpandedState(teamSquadParticipants, unassignedTeams);
    }
  }, [isTeamEvent, squadTeamsData, unassignedTeams, updateExpandedState]);

  // Use the team assignment changes hook (for team-based events)
  const {
    pendingTeamAssignmentChanges,
    handleDragDropTeamAssignment,
    // handleReEnterTeams, // Removed as per edit hint
    // getCurrentSquadTeamAssignment, // Removed as per edit hint
    clearTeamAssignmentChanges,
    handleStageTeamReEntryRemoval,
    handleUndoTeamRemoval,
    executeTeamAssignmentChanges
  } = useTeamAssignmentChanges({
    squadTeams: squadTeamsData,
    squads,
    selectedRoundId,
    unassignedTeams,
    teams: teams || []
  });


  // Use the game changes hook
  const {
    pendingGameChanges,
    squadGames,
    loadingGames,
    handleGameScoreChange,
    handleTemporaryGameScoreChange,
    getPendingGameValue,
    hasGamePendingChanges,
    hasAnyGamePendingChanges,
    clearGameChanges,
    getParticipantGames,
    getGameIdForParticipantAndGameNumber,
    getTeamGames,
    getTeamGameIdForTeamAndGameNumber,
    temporaryGames
  } = useGameChanges({
    squads,
    roundId: selectedRoundId,
    teamGamesOnly: Boolean(isTeamEvent && selectedRoundIsBaker),
  });

  // Get the current round's game count
  const getCurrentRoundGameCount = () => {
    if (!eventComplete?.rounds || !Array.isArray(eventComplete.rounds)) return 0;
    
    if (selectedRoundId) {
      const selectedRound = eventComplete.rounds.find((r: any) => r.id === selectedRoundId);
      return selectedRound?.game_count || 0;
    } else if (squads && squads.length > 0) {
      const firstSquad = squads[0];
      const round = eventComplete.rounds.find((r: any) => r.id === firstSquad.round_id);
      return round?.game_count || 0;
    }
    
    return 0;
  };

  // Teams in the selected round (advancement "top X%" counts teams, not bowlers)
  const { destinationMap: advancementDestinationMap } = useSourceRoundAdvancementDestinations({
    eventId,
    selectedRoundId,
    outgoingRelationships,
    rounds: eventComplete?.rounds ?? [],
    finalNodes: eventComplete?.final_nodes ?? [],
    teams,
    enabled: scoringSurface,
  });
  const { data: scoringRosterData } = useQuery({
    queryKey: ['roundScoringRoster', selectedRoundId],
    queryFn: () => SquadsAPI.getRoundScoringRoster(selectedRoundId as number),
    enabled: !!selectedRoundId && scoringSurface,
  });
  const { data: roundMatchSeriesData, isLoading: isLoadingRoundMatchSeries } = useQuery({
    queryKey: ['roundMatchSeries', selectedRoundId],
    queryFn: () => RoundMatchSeriesAPI.list(selectedRoundId as number),
    enabled: !!selectedRoundId && scoringSurface,
    refetchInterval: (query) => {
      const rosterCount = Number(scoringRosterData?.participants?.length ?? 0);
      const seriesCount = Number((query.state.data as any)?.match_series?.length ?? 0);
      if (rosterCount > 0 && seriesCount === 0) {
        return 1500;
      }
      return false;
    },
  });

  const bonusPinsEnabled = useMemo(
    () => bonusPinsConfigured(selectedRoundMethodConfig),
    [selectedRoundMethodConfig]
  );

  const eventParticipantToTeamId = useMemo(() => {
    const map = new Map<number, number>();
    for (const team of poolTeamsForRound || []) {
      const teamId = Number(team.id);
      for (const m of team.members || []) {
        const epId = Number(
          (m as { event_participant_id?: number; id?: number }).event_participant_id ??
            (m as { id?: number }).id
        );
        if (epId > 0 && teamId > 0) map.set(epId, teamId);
      }
    }
    for (const teams of Object.values(squadTeamsData || {})) {
      for (const team of teams as Array<{ id: number; members?: Array<{ event_participant_id?: number; id?: number }> }>) {
        const teamId = Number(team.id);
        for (const m of team.members || []) {
          const epId = Number(m.event_participant_id ?? m.id);
          if (epId > 0 && teamId > 0) map.set(epId, teamId);
        }
      }
    }
    return map;
  }, [poolTeamsForRound, squadTeamsData]);

  const isLeagueSchedule =
    String(selectedRoundMethodConfig?.schedule_mode || '').toLowerCase() === 'league';
  const showBakerLeagueReconcile = Boolean(
    scoringSurface &&
      isTeamEvent &&
      selectedRoundIsBaker &&
      selectedRoundCompetitionMethod === 'round_robin' &&
      isLeagueSchedule
  );

  const { data: roundStandingsParticipants } = useQuery({
    queryKey: ['round-participants-bonus', selectedRoundId],
    queryFn: () => RoundsAPI.getRoundParticipants(Number(selectedRoundId)),
    enabled: Boolean(
      selectedRoundId &&
        scoringSurface &&
        isLeagueSchedule &&
        (bonusPinsEnabled || showBakerLeagueReconcile)
    ),
    staleTime: 5_000,
  });

  const bonusPinsByTeamId = useMemo(() => {
    if (!bonusPinsEnabled) return new Map<number, number>();
    // League Baker: server computes one win/tie award per team per game from shells.
    if (isLeagueSchedule && roundStandingsParticipants?.length) {
      const map = new Map<number, number>();
      for (const row of roundStandingsParticipants) {
        const teamId = Number(row.team_id);
        if (teamId > 0) map.set(teamId, Number(row.bonus_pins) || 0);
      }
      return map;
    }
    return computeMatchPlayBonusByTeamId(
      roundMatchSeriesData?.match_series ?? [],
      parseBonusPinsConfig(selectedRoundMethodConfig),
      eventParticipantToTeamId
    );
  }, [
    bonusPinsEnabled,
    isLeagueSchedule,
    roundStandingsParticipants,
    roundMatchSeriesData?.match_series,
    selectedRoundMethodConfig,
    eventParticipantToTeamId,
  ]);

  const { data: laneScoreSheetData } = useLaneScoreSheet(eventId, selectedRoundId, null, {
    enabled: !!selectedRoundId && scoringSurface,
  });
  const laneLabelLookup = useMemo(
    () => buildLaneLabelLookup(laneScoreSheetData?.rows ?? []),
    [laneScoreSheetData?.rows]
  );

  // Mutation for assigning participants to squad
  const assignParticipantMutation = useMutation({
    mutationFn: async (assignment: SquadAssignment) => {
      return SquadsAPI.assignParticipantToSquad(assignment);
    },
    onError: (error: any) => {
      setAssignmentError(getErrorMessage(error, 'Failed to assign participant'));
      setTimeout(() => setAssignmentError(null), 5000);
    }
  });

  const [isSavingGameScores, setIsSavingGameScores] = useState(false);

  // Batch mutations for squad operations
  const batchAssignMutation = useMutation({
    mutationFn: async (request: any) => {
      return SquadsAPI.batchAssignParticipants(request);
    },
    onError: (error: any) => {
      setAssignmentError(getErrorMessage(error, 'Failed to batch assign participants'));
      setTimeout(() => setAssignmentError(null), 5000);
    }
  });

  const batchRemoveMutation = useMutation({
    mutationFn: async (request: any) => {
      return SquadsAPI.batchRemoveParticipants(request);
    },
    onError: (error: any) => {
      setAssignmentError(getErrorMessage(error, 'Failed to batch remove participants'));
      setTimeout(() => setAssignmentError(null), 5000);
    }
  });

  const batchReentryMutation = useMutation({
    mutationFn: async (request: any) => {
      return SquadsAPI.batchRegisterReentries(request);
    },
    onError: (error: any) => {
      setAssignmentError(getErrorMessage(error, 'Failed to batch register re-entries'));
      setTimeout(() => setAssignmentError(null), 5000);
    }
  });

  const batchUnassignAllMutation = useMutation({
    mutationFn: async (body: { event_participant_ids: number[] }) => {
      return EventsAPI.batchUnassignEventParticipantsFromAll(eventId, body);
    },
    onError: (error: any) => {
      setAssignmentError(getErrorMessage(error, 'Failed to batch unassign participants'));
      setTimeout(() => setAssignmentError(null), 5000);
    }
  });

  const createRoundSquadMutation = useMutation({
    mutationFn: (body: SquadCreate) => {
      if (!selectedRoundId) {
        return Promise.reject(new Error('No round selected'));
      }
      return SquadsAPI.createSquadForRound(selectedRoundId, body);
    },
    onSuccess: () => {
      setSquadNameDtModalMode(null);
      setSquadModalServerError(null);
      queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      if (selectedRoundId) {
        queryClient.invalidateQueries({ queryKey: ['squadParticipants', selectedRoundId] });
      }
      setSuccessMessage('Squad created.');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: unknown) => {
      setSquadModalServerError(getErrorMessage(error, 'Failed to create squad'));
    },
  });

  const updateRoundSquadMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: SquadUpdate }) =>
      SquadsAPI.updateSquad(id, body),
    onSuccess: () => {
      setSquadNameDtModalMode(null);
      setSquadBeingEdited(null);
      setSquadModalServerError(null);
      queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      if (selectedRoundId) {
        queryClient.invalidateQueries({ queryKey: ['squadParticipants', selectedRoundId] });
      }
      setSuccessMessage('Squad updated.');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: unknown) => {
      setSquadModalServerError(getErrorMessage(error, 'Failed to update squad'));
    },
  });

  const clearSquadModalServerError = useCallback(() => setSquadModalServerError(null), []);

  const openCreateSquadModal = useCallback(() => {
    setSquadBeingEdited(null);
    setSquadModalServerError(null);
    setSquadNameDtModalMode('create');
  }, []);

  const openEditSquadModal = useCallback((squadId: number) => {
    const s = squads.find((sq) => sq.id === squadId);
    if (!s) return;
    setSquadBeingEdited(s);
    setSquadModalServerError(null);
    setSquadNameDtModalMode('edit');
  }, [squads]);

  const closeSquadNameDatetimeModal = useCallback(() => {
    if (createRoundSquadMutation.isPending || updateRoundSquadMutation.isPending) return;
    setSquadNameDtModalMode(null);
    setSquadBeingEdited(null);
    setSquadModalServerError(null);
  }, [createRoundSquadMutation.isPending, updateRoundSquadMutation.isPending]);

  const handleSquadNameDatetimeSubmit = useCallback(
    (values: { name: string; start_datetime: string }) => {
      if (!selectedRoundId) {
        setSquadModalServerError('Select a round first.');
        return;
      }
      const rounds = eventComplete?.rounds;
      const roundRow =
        Array.isArray(rounds) && selectedRoundId
          ? rounds.find((r: { id: number }) => r.id === selectedRoundId)
          : null;
      const gameCount = Number(roundRow?.game_count || 0);
      if (!gameCount) {
        setSquadModalServerError(
          'This round has no game count configured. Set the round format before adding squads.'
        );
        return;
      }
      if (squadNameDtModalMode === 'create') {
        const body: SquadCreate = {
          name: values.name,
          round_id: selectedRoundId,
          start_datetime: values.start_datetime,
          max_participants: Math.max(24, unassignedParticipants.length, Number(roundRow?.competition_method_config?.entrant_count) || 0),
          game_count: gameCount,
          status: SquadStatus.SCHEDULED,
          allows_reentry: false,
        };
        createRoundSquadMutation.mutate(body);
      } else if (squadNameDtModalMode === 'edit' && squadBeingEdited) {
        updateRoundSquadMutation.mutate({
          id: squadBeingEdited.id,
          body: { name: values.name, start_datetime: values.start_datetime },
        });
      }
    },
    [
      selectedRoundId,
      eventComplete?.rounds,
      squadNameDtModalMode,
      squadBeingEdited,
      createRoundSquadMutation,
      updateRoundSquadMutation,
      unassignedParticipants.length,
    ]
  );

  // Note: getRoundStatus is now provided by the useRoundManagement hook

  const sortedRounds = useMemo(() => {
    if (!Array.isArray(eventComplete?.rounds)) return [];
    return [...eventComplete.rounds].sort((a: any, b: any) => a.round_number - b.round_number);
  }, [eventComplete?.rounds]);

  const suggestedRound = useMemo(
    () =>
      getMostRelevantRound({
        rounds: eventComplete?.rounds,
        allSquads: allEventSquads,
        roundStatusData,
      }),
    [eventComplete?.rounds, allEventSquads, roundStatusData]
  );

  useEffect(() => {
    hasInitializedRoundRef.current = false;
    setSelectedRoundId(null);
  }, [eventId]);

  useEffect(() => {
    if (
      !showBakerLeagueReconcile &&
      (scoringViewMode === 'reconcile' || scoringViewMode === 'lanes')
    ) {
      setScoringViewMode('entry');
    }
  }, [showBakerLeagueReconcile, scoringViewMode, setScoringViewMode]);

  // Default round for the header `<select>` (Squads / Game Scoring / Lanes share this workspace):
  // 1) Valid `localStorage` choice for this event (`usePersistedRoundSelection`)
  // 2) Else `getMostRelevantRound` — earliest uncompleted round by squad start time, else the
  //    earliest round when everything is complete (see `roundRelevance.ts`)
  // 3) Else first round by `round_number`
  // Wait until event squads are loaded so (2) uses real squad rows, not an empty first pass.
  useEffect(() => {
    if (hasInitializedRoundRef.current) return;
    if (loadingSquads) return;
    if (!sortedRounds.length) return;

    const persistedRoundId = getPersistedRoundId();
    if (persistedRoundId != null && isRoundIdValid(persistedRoundId, sortedRounds)) {
      setSelectedRoundId(persistedRoundId);
      hasInitializedRoundRef.current = true;
      return;
    }

    if (persistedRoundId != null) {
      clearPersistedRoundId();
    }

    const fallbackRoundId = suggestedRound.roundId ?? sortedRounds[0]?.id ?? null;
    if (fallbackRoundId != null) {
      setSelectedRoundId(fallbackRoundId);
      hasInitializedRoundRef.current = true;
    }
  }, [
    sortedRounds,
    suggestedRound.roundId,
    loadingSquads,
    getPersistedRoundId,
    clearPersistedRoundId,
  ]);

  const handleRoundSelectionChange = useCallback((value: string) => {
    const nextRoundId = value ? parseInt(value, 10) : null;
    setSelectedRoundId(nextRoundId);
    setPersistedRoundId(nextRoundId);
  }, [setPersistedRoundId]);

  // Create drag and drop categories using the assignment service
  const createDragDropCategories = useMemo((): DragDropCategory[] => {
    if (isTeamEvent) {
      // For team events, use team-based assignment
      // Use the calculated unassigned teams
      const unassignedTeamsForCategories = unassignedTeams;
      
      const result = AssignmentService.createTeamDragDropCategories(
        unassignedTeamsForCategories,
        squads,
        squadTeamsData,
        pendingTeamAssignmentChanges,
        poolTeamsForRound
      );
      
      return result.map(({ maxItems, ...category }) => category);
    } else {
      // For individual events, use participant-based assignment
      
      const result = AssignmentService.createDragDropCategories(
        unassignedParticipants,
        squads,
        squadParticipants,
        pendingAssignmentChanges,
        allPoolParticipants
      );
      
      
      return result.map(({ maxItems, ...category }) => category);
    }
  }, [
    isTeamEvent,
    teams,
    squads,
    pendingTeamAssignmentChanges,
    unassignedParticipants,
    squadParticipants,
    pendingAssignmentChanges,
    allPoolParticipants,
    poolTeamsForRound,
    unassignedTeams
  ]);



  // Note: These functions are now provided by the useAssignmentChanges hook

  // Handle move selected items (new selection-based UI)
  const handleMoveSelectedIndividuals = useCallback((itemIds: string[], targetSquadId: string) => {
    
    // Convert string IDs back to numbers for the existing logic
    const participantIds = itemIds.map(id => parseInt(id, 10));
    
    // Stage the moves using existing logic
    participantIds.forEach(participantId => {
      // Find the participant object (pool advancers may only exist in unassigned list)
      const participant =
        participants.find((p) => p.id === participantId) ??
        unassignedParticipants.find((p) => p.id === participantId);
      if (!participant) {
        console.warn('Participant not found:', participantId);
        return;
      }
      
      // Find current squad for this participant
      const currentSquad = squads.find(squad => {
        const squadParticipantsList = squadParticipants[squad.id] || [];
        return squadParticipantsList.some((sp: any) => sp.event_participant_id === participantId);
      });
      
      
      // Determine the source category (current squad or 'unassigned')
      const fromCategoryId = currentSquad ? currentSquad.id.toString() : 'unassigned';
      
      // Only stage the move if it's actually a change
      if (fromCategoryId !== targetSquadId) {
        
        // Stage the move with proper participant data
        const dragDropResult = {
          item: { id: participantId, data: participant },
          fromCategoryId: fromCategoryId,
          toCategoryId: targetSquadId
        };
        
        handleDragDropAssignment(dragDropResult);
      } else {
      }
    });
  }, [squads, squadParticipants, participants, unassignedParticipants, handleDragDropAssignment]);

  const {
    assignableAdvancerSquad,
    selectedRoundDisplayLabel,
    expectedSquadNameForRound,
    handleAssignAllAdvancersToSquad,
  } = useAdvancerSquadBootstrap({
    squadsSurface,
    isAuthorizedForManagement,
    loadingSquads,
    selectedRoundId,
    eventComplete,
    squads,
    allEventSquads,
    unassignedParticipants,
    hasIncomingRelationships,
    createSquad: createRoundSquadMutation.mutate,
    createSquadPending: createRoundSquadMutation.isPending,
    updateSquad: updateRoundSquadMutation.mutate,
    handleDragDropAssignment,
  });

  const handleMoveSelectedTeams = useCallback((itemIds: string[], targetSquadId: string) => {
    // Convert string IDs back to numbers for the existing logic
    const teamIds = itemIds.map(id => parseInt(id, 10));
    const requiredTeamSize = eventComplete?.team_size ?? null;
    const isIncompleteTeam = (team: EventTeamWithMembers) => {
      const expected =
        typeof team.expected_team_size === 'number' && team.expected_team_size > 0
          ? team.expected_team_size
          : requiredTeamSize;
      if (!expected || expected < 1) return false;
      const memberCount = team.member_count ?? team.members?.length ?? 0;
      return memberCount < expected;
    };
    const incompleteTeams = teamIds
      .map((id) => teams.find((t) => t.id === id))
      .filter((t): t is EventTeamWithMembers => Boolean(t))
      .filter((t) => isIncompleteTeam(t));
    if (incompleteTeams.length > 0) {
      const preview = incompleteTeams
        .slice(0, 3)
        .map((t) => t.display_name || `Team ${t.team_number}`)
        .join(', ');
      const suffix = incompleteTeams.length > 3 ? '...' : '';
      setAssignmentError(
        `Incomplete team${incompleteTeams.length === 1 ? '' : 's'} cannot be assigned to squads: ${preview}${suffix}`
      );
      setTimeout(() => setAssignmentError(null), 5000);
      return;
    }
    
    // Stage the moves using existing logic
    teamIds.forEach(teamId => {
      // Find the team object
      const team = teams.find(t => t.id === teamId);
      if (!team) {
        console.warn('Team not found:', teamId);
        return;
      }
      
      // Find current squad for this team
      const currentSquad = squads.find(squad => 
        squadTeamsData[squad.id]?.some((st: any) => st.id === teamId)
      );
      
      // Determine the source category (current squad or 'unassigned')
      const fromCategoryId = currentSquad ? currentSquad.id.toString() : 'unassigned';
      
      // Only stage the move if it's actually a change
      if (fromCategoryId !== targetSquadId) {
        // Stage the move with proper team data
        handleDragDropTeamAssignment({
          item: { id: teamId, data: team },
          fromCategoryId: fromCategoryId,
          toCategoryId: targetSquadId
        });
      }
    });
  }, [squads, squadTeamsData, teams, handleDragDropTeamAssignment, eventComplete?.team_size, setAssignmentError]);

  // Handle re-entry modal open for a specific squad
  const handleReEntryModalOpen = (squadId: number) => {
    setSelectedSquadForReEntry(squadId);
    setReEntryModalOpen(true);
  };

  // Wrapper for handleReEnterParticipants that includes the target squad ID
  const handleReEnterParticipantsWrapper = (selectedParticipantIds: number[]) => {
    
    if (selectedSquadForReEntry) {
      handleReEnterParticipants(selectedParticipantIds, selectedSquadForReEntry);
      setReEntryModalOpen(false);
      setSelectedSquadForReEntry(null);
    } else {
    }
  };

  // Re-entry operations are always TD-allowed; re-entry flags are informational only.
  const isReEntryAllowed = () => {
    return !!eventComplete;
  };

  // Re-entry operations are always available per squad when management is enabled.
  const isSquadReEntryAllowed = (squadId: number) => {
    return !!allEventSquads?.some((s) => s.id === squadId);
  };





  // Render function for participant items using the ParticipantItem component
  const renderParticipantItem = (item: DragDropItem, isDragging = false, listeners?: any) => {
    return (
      <ParticipantItem
        item={item}
        isDragging={isDragging}
        pendingAssignmentChanges={pendingAssignmentChanges}
        onStageReEntryRemoval={handleStageReEntryRemoval}
        onUndoRemoval={handleUndoRemoval}
        listeners={listeners}
      />
    );
  };

  // Render function for team items using the TeamItem component
  const renderTeamItem = (item: DragDropItem, isDragging = false, listeners?: any) => {
    // Log team data before rendering
    return (
      <TeamItem
        item={item}
        isDragging={isDragging}
        pendingAssignmentChanges={pendingTeamAssignmentChanges}
        onStageReEntryRemoval={handleStageTeamReEntryRemoval}
        onUndoRemoval={handleUndoTeamRemoval}
        listeners={listeners}
      />
    );
  };

  // Check if all participants/teams are assigned to squads
  const areAllParticipantsAssigned = () => {
    if (isTeamEvent) {
      return AssignmentService.areAllTeamsAssignedSimple(unassignedTeams);
    } else {
      return AssignmentService.areAllParticipantsAssignedSimple(unassignedParticipants);
    }
  };


  const handleUnlockAllSquads = useCallback(() => {
    handleUnlockRound();
    clearGameChanges();
    clearAssignmentChanges();
    clearTeamAssignmentChanges();
  }, [
    handleUnlockRound,
    clearGameChanges,
    clearAssignmentChanges,
    clearTeamAssignmentChanges,
  ]);



  // Note: These functions are now provided by the useGameChanges hook

  // Check if there are any pending assignment changes
  const hasAnyAssignmentPendingChanges = () => {
    if (isTeamEvent) {
      return Object.keys(pendingTeamAssignmentChanges).length > 0;
    } else {
      return Object.keys(pendingAssignmentChanges).length > 0;
    }
  };



  // Check if there are any pending changes of any type
  const hasAnyPendingChanges = () => {
    return hasAnyGamePendingChanges() || hasAnyAssignmentPendingChanges();
  };



  const handleSubmitAllChanges = async () => {
    await submitEventRoundWorkspaceChanges({
      hasAnyGamePendingChanges,
      hasAnyAssignmentPendingChanges,
      temporaryGames,
      squadGames,
      pendingGameChanges,
      isTeamEvent,
      effectiveTeamScoringMode,
      setIsSavingGameScores,
      clearGameChanges,
      queryClient,
      eventId,
      setAssignmentError,
      setIsSavingTeamAssignments,
      executeTeamAssignmentChanges,
      clearTeamAssignmentChanges,
      selectedRoundId,
      pendingAssignmentChanges,
      squadParticipants,
      isInitialRound,
      batchUnassignAllMutation,
      batchRemoveMutation,
      batchAssignMutation,
      setPendingAssignmentChanges,
      setSuccessMessage,
      batchReentryMutation,
      clearAssignmentChanges,
      onAfterSuccessfulSave,
    });
  };

  const handleDiscardAllChanges = () => {
    clearGameChanges();
    if (isTeamEvent) {
      clearTeamAssignmentChanges();
    } else {
      clearAssignmentChanges();
    }
  };

  // Create squad categories for table display
  const createSquadCategories = () =>
    buildSquadCategoriesForScoring({
      isTeamEvent,
      squads: squads || [],
      unassignedParticipants: unassignedParticipants || [],
      unassignedTeams: unassignedTeams || [],
      squadParticipants: squadParticipants || {},
      squadTeamsData: squadTeamsData || {},
      pendingAssignmentChanges: pendingAssignmentChanges || {},
      pendingTeamAssignmentChanges: pendingTeamAssignmentChanges || {},
    });

  const selectedRoundCompetitionLabel = getCompetitionMethodDisplayLabel(
    selectedRoundCompetitionMethod,
    {
      roundId: selectedRoundId ?? undefined,
      relationships: roundRelationships,
    }
  );

  const selectedRoundBracketMode = useMemo(
    () => getSelectedRoundBracketMode(eventComplete?.rounds, selectedRoundId),
    [eventComplete?.rounds, selectedRoundId]
  );

  const selectedRoundPodSize = useMemo(
    () => getSelectedRoundPodSize(eventComplete?.rounds, selectedRoundId),
    [eventComplete?.rounds, selectedRoundId]
  );

  const selectedRoundPositionRoundGame = useMemo(
    () => getSelectedRoundPositionRoundGame(eventComplete?.rounds, selectedRoundId),
    [eventComplete?.rounds, selectedRoundId]
  );

  const selectedRoundScheduledGames = useMemo(
    () => getSelectedRoundScheduledGames(eventComplete?.rounds, selectedRoundId),
    [eventComplete?.rounds, selectedRoundId]
  );

  const { lanePreviewLanesByTeamId, laneBoardPairsInPlay } = useBakerLeagueLanePreview({
    eventId,
    selectedRoundId,
    enabled: Boolean(showBakerLeagueReconcile),
    scheduledGames: selectedRoundScheduledGames,
    fallbackGameCount: getCurrentRoundGameCount(),
    positionRoundGame: selectedRoundPositionRoundGame,
    positionRoundLanePlacement: String(
      selectedRoundMethodConfig?.position_round_lane_placement ?? 'start_low'
    ),
  });

  const standingPlaceByTeamId = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of roundStandingsParticipants || []) {
      const teamId = Number(row.team_id);
      const place = Number(row.position);
      if (teamId > 0 && place > 0) map.set(teamId, place);
    }
    return map;
  }, [roundStandingsParticipants]);

  const adjustRoundGameCountMutation = useAdjustRoundGameCount(
    eventId,
    selectedRoundId,
    selectedRoundId
  );
  const canAdjustGameCount =
    isAuthorizedForManagement &&
    selectedRoundCompetitionMethod === 'eliminator' &&
    Boolean(selectedRoundId);
  const gameCountAdjustControls = canAdjustGameCount ? (
    <RoundGameCountControls
      gameCount={getCurrentRoundGameCount()}
      canAdjust
      isPending={adjustRoundGameCountMutation.isPending}
      games={squadGames}
      onIncrement={() =>
        adjustRoundGameCountMutation.mutate({
          delta: 1,
          confirm_delete_scored: false,
        })
      }
      onDecrement={(confirmDeleteScored) =>
        adjustRoundGameCountMutation.mutate({
          delta: -1,
          confirm_delete_scored: confirmDeleteScored,
        })
      }
    />
  ) : undefined;

  const { data: orderedEntrantsResponse } = useQuery({
    queryKey: ['orderedTargetRoundEntrants', selectedRoundId],
    queryFn: () => AdvancementPoolAPI.getOrderedEntrants(selectedRoundId as number),
    enabled:
      !!selectedRoundId &&
      scoringSurface &&
      selectedRoundCompetitionMethod !== 'eliminator',
  });

  const scoringVisualParticipants = useMemo(
    () =>
      buildScoringVisualParticipants({
        orderedEntrants: orderedEntrantsResponse?.ordered_entrants,
        scoringRosterParticipants: scoringRosterData?.participants,
        unassignedParticipants,
        poolTeamsForRound,
      }),
    [
      orderedEntrantsResponse?.ordered_entrants,
      poolTeamsForRound,
      scoringRosterData?.participants,
      unassignedParticipants,
    ]
  );

  const scoringVisualDiagnostics = useMemo(
    () =>
      buildScoringVisualDiagnostics({
        rows: scoringVisualParticipants,
        hasIncomingRelationships,
        orderedDiagnostics: orderedEntrantsResponse?.diagnostics,
      }),
    [hasIncomingRelationships, orderedEntrantsResponse?.diagnostics, scoringVisualParticipants]
  );

  const scoringEmptyReason = useMemo(
    () =>
      deriveScoringEmptyReason({
        scoringSurface,
        participants: scoringVisualParticipants,
        isLoading:
          loadingPoolParticipants || isLoadingSquadParticipants || loadingGames,
        hasIncomingRelationships,
        diagnostics: scoringVisualDiagnostics,
      }),
    [
      scoringSurface,
      scoringVisualParticipants,
      loadingPoolParticipants,
      isLoadingSquadParticipants,
      loadingGames,
      hasIncomingRelationships,
      scoringVisualDiagnostics,
    ]
  );



  // Check if current round can be edited


  if (!isAuthorizedForManagement) {
    return (
      <Alert
        variant="warning"
        message={permissionMessage}
      />
    );
  }

  if (loadingSquads || loadingParticipants) {
    return <Loading size="large" />;
  }

  if (squadsError) {
    return (
      <Alert
        variant="error"
        message="Failed to load squad information. Please try again."
      />
    );
  }

  const selectedRoundHasGameCount =
    Array.isArray(eventComplete?.rounds) && selectedRoundId
      ? Boolean(
          eventComplete.rounds.find((r: { id: number }) => r.id === selectedRoundId)?.game_count
        )
      : false;
  const addSquadDisabled =
    createRoundSquadMutation.isPending || !selectedRoundHasGameCount;
  const addSquadButtonTitle = !selectedRoundHasGameCount
    ? 'Configure this round’s game count before adding squads.'
    : undefined;

  return (
    <div className="space-y-6">
      <EventRoundTabChrome
        eventId={eventId}
        title={surfaceTitle}
        subtitle={surfaceSubtitle}
        successMessage={successMessage}
        onDismissSuccess={() => setSuccessMessage(null)}
        assignmentError={assignmentError}
        onDismissAssignmentError={() => setAssignmentError(null)}
        roundsForSelector={sortedRounds}
        selectedRoundId={selectedRoundId}
        onRoundChange={handleRoundSelectionChange}
        getRoundStatus={getRoundStatus}
        isLoadingRoundStatus={isLoadingRoundStatus}
        showRoundSelector={
          !forceHideRoundSelector &&
          Array.isArray(eventComplete?.rounds) &&
          eventComplete.rounds.length > 1
        }
      />

      {/* Main Content */}
      <div>
        {squadsSurface && (
          <>
            <RoundControls
              allSquadsLockedIn={allSquadsLockedIn}
              anySquadLockedIn={anySquadLockedIn}
              selectedRoundId={selectedRoundId}
              eventComplete={eventComplete}
              onUnlockRound={handleUnlockAllSquads}
              isUnlocking={unlockFromRoundManagement}
              areAllParticipantsAssigned={areAllParticipantsAssigned()}
              unassignedCount={isTeamEvent ? unassignedTeams.length : (unassignedParticipants?.length || 0)}
              showUnlockConfirm={showUnlockConfirm}
              onShowUnlockConfirm={setShowUnlockConfirm}
              getRoundStatus={getRoundStatus}
              isLoadingRoundStatus={isLoadingRoundStatus}
              totalParticipantsCount={totalParticipantsCount}
              roundRealtimeStatus={selectedRoundRealtimeStatus ?? null}
              onCompleteRound={completeRound}
              isCompletingRound={isCompletingRound}
              onAddSquad={
                isAuthorizedForManagement &&
                selectedRoundId &&
                !eventComplete?.tournament?.is_sa_only
                  ? openCreateSquadModal
                  : undefined
              }
              addSquadDisabled={addSquadDisabled}
              addSquadButtonTitle={addSquadButtonTitle}
            />
          </>
        )}

        {squadsSurface && (
          <>
            {hasAnyPendingChanges() && (
              <EventRoundPendingChangesBar
                hasGamePending={hasAnyGamePendingChanges()}
                hasAssignmentPending={hasAnyAssignmentPendingChanges()}
                isCreatingGames={temporaryGames.isCreatingGames}
                isBusy={
                  assignParticipantMutation.isPending ||
                  batchAssignMutation.isPending ||
                  batchRemoveMutation.isPending ||
                  batchReentryMutation.isPending ||
                  temporaryGames.isCreatingGames ||
                  isSavingTeamAssignments ||
                  batchUnassignAllMutation.isPending
                }
                isLoading={
                  temporaryGames.isCreatingGames ||
                  isSavingTeamAssignments ||
                  batchUnassignAllMutation.isPending ||
                  batchRemoveMutation.isPending ||
                  batchAssignMutation.isPending
                }
                onDiscard={handleDiscardAllChanges}
                onSave={handleSubmitAllChanges}
              />
            )}
            {hasIncomingRelationships &&
            unassignedParticipants.length > 0 &&
            assignableAdvancerSquad ? (
              <AdvancerAssignBanner
                unassignedCount={unassignedParticipants.length}
                roundLabel={selectedRoundDisplayLabel}
                onAssignAll={handleAssignAllAdvancersToSquad}
              />
            ) : null}
            {isTeamEvent ? (
              <TeamAssignment
                categories={createDragDropCategories}
                onDrop={handleDragDropTeamAssignment}
                renderItem={renderTeamItem}
                isLoading={loadingSquads || loadingParticipants || (isTeamEvent && (loadingTeams || loadingSquadTeams))}
                onReEntryModalOpen={handleReEntryModalOpen}
                isReEntryAllowed={isReEntryAllowed()}
                reEntryModalOpen={reEntryModalOpen}
                onReEntryModalClose={() => {
                  setReEntryModalOpen(false);
                  setSelectedSquadForReEntry(null);
                }}
                onReEnterParticipants={handleReEnterParticipantsWrapper}
                participants={teams as unknown as EventParticipantWithUser[]}
                isSquadReEntryAllowed={isSquadReEntryAllowed}
                emptyMessage={isTeamEvent ? 'No teams available' : 'No participants available'}
                className="assignment-table"
                onMoveSelected={handleMoveSelectedTeams}
                canEditSquads={isAuthorizedForManagement}
                squads={squads}
                canLockSquads={isAuthorizedForManagement}
                onLockSquad={lockSquad}
                onRequestUnlockSquad={setSquadUnlockConfirmId}
                lockingSquadId={isLockingSquadId}
                unlockingSquadId={isUnlockingSquadId}
                onEditSquad={openEditSquadModal}
              />
            ) : (
              <IndividualAssignment
                categories={createDragDropCategories}
                onDrop={handleDragDropAssignment}
                renderItem={renderParticipantItem}
                isLoading={loadingSquads || loadingParticipants || (isTeamEvent && (loadingTeams || loadingSquadTeams))}
                onReEntryModalOpen={handleReEntryModalOpen}
                isReEntryAllowed={isReEntryAllowed()}
                reEntryModalOpen={reEntryModalOpen}
                onReEntryModalClose={() => {
                  setReEntryModalOpen(false);
                  setSelectedSquadForReEntry(null);
                }}
                onReEnterParticipants={handleReEnterParticipantsWrapper}
                participants={participants}
                isSquadReEntryAllowed={isSquadReEntryAllowed}
                emptyMessage={isTeamEvent ? 'No teams available' : 'No participants available'}
                className="assignment-table"
                onMoveSelected={handleMoveSelectedIndividuals}
                canEditSquads={isAuthorizedForManagement}
                squads={squads}
                canLockSquads={isAuthorizedForManagement}
                onLockSquad={lockSquad}
                onRequestUnlockSquad={setSquadUnlockConfirmId}
                lockingSquadId={isLockingSquadId}
                unlockingSquadId={isUnlockingSquadId}
                onEditSquad={openEditSquadModal}
              />
            )}
          </>
        )}
        {scoringSurface && (
          <ScoringTabOrderProvider tabMode={tabMode}>
            {!anySquadLockedIn && (
              <div className="bg-surface-light border border-border border-l-4 border-l-accent rounded-lg p-4 mb-6 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <SportsIcon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-text">No Locked Squads Yet</h3>
                    <p className="text-sm text-text-muted mt-1">
                      Lock at least one squad to enable {selectedRoundCompetitionLabel.toLowerCase()}{' '}
                      game scoring.
                      {hasIncomingRelationships && (unassignedParticipants?.length ?? 0) > 0
                        ? ' Assign advancers from the pool on the Squads tab first.'
                        : ' Match-play visual editors still render so you can review structure and matchups.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* Unified Pending Changes Warning Bar */}
            {anySquadLockedIn && hasAnyPendingChanges() && (
              <EventRoundPendingChangesBar
                hasGamePending={hasAnyGamePendingChanges()}
                hasAssignmentPending={hasAnyAssignmentPendingChanges()}
                isCreatingGames={temporaryGames.isCreatingGames}
                isBusy={
                  assignParticipantMutation.isPending ||
                  batchAssignMutation.isPending ||
                  batchRemoveMutation.isPending ||
                  batchReentryMutation.isPending ||
                  temporaryGames.isCreatingGames ||
                  isSavingGameScores ||
                  isSavingTeamAssignments ||
                  batchUnassignAllMutation.isPending
                }
                isLoading={
                  temporaryGames.isCreatingGames ||
                  isSavingGameScores ||
                  isSavingTeamAssignments ||
                  batchUnassignAllMutation.isPending ||
                  batchRemoveMutation.isPending ||
                  batchAssignMutation.isPending
                }
                onDiscard={handleDiscardAllChanges}
                onSave={handleSubmitAllChanges}
              />
            )}

            {scoringSurface && selectedRoundId && (
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <RoundScoreCsvControls
                  roundId={selectedRoundId}
                  roundNumber={
                    eventComplete?.rounds?.find(
                      (r: { id: number }) => r.id === selectedRoundId
                    )?.round_number ?? selectedRoundId
                  }
                  isTeamEvent={isTeamEvent}
                  teamScoringMode={effectiveTeamScoringMode}
                  isBakerRound={selectedRoundIsBaker}
                  disabled={!isAuthorizedForManagement || !anySquadLockedIn}
                  onAfterSuccessfulUpload={onAfterSuccessfulSave}
                />
                <ScoringModeControls
                  scoringTabMode={tabMode}
                  onScoringTabModeChange={setTabMode}
                  showParticipantSort={
                    ['eliminator', 'pods'].includes(selectedRoundCompetitionMethod) &&
                    !(showBakerLeagueReconcile && scoringViewMode !== 'entry')
                  }
                  participantSortOrder={participantSortOrder}
                  onParticipantSortOrderChange={setParticipantSortOrder}
                  scoringViewMode={
                    showBakerLeagueReconcile ? scoringViewMode : undefined
                  }
                  onScoringViewModeChange={
                    showBakerLeagueReconcile ? setScoringViewMode : undefined
                  }
                  isTeamEvent={isTeamEvent && !selectedRoundIsBaker}
                  teamScoringMode={effectiveTeamScoringMode}
                  onTeamScoringModeChange={
                    isTeamEvent && !selectedRoundIsBaker ? setTeamScoringMode : undefined
                  }
                />
              </div>
            )}

            {scoringEmptyReason && (
              <Alert
                variant="info"
                message={scoringEmptyReason}
              />
            )}

            {scoringSurface &&
              (showBakerLeagueReconcile && scoringViewMode === 'reconcile' ? (
                <BakerLeagueReconcileView
                  squadCategories={createSquadCategories()}
                  allGames={squadGames}
                  gameCount={getCurrentRoundGameCount()}
                  scheduledGames={selectedRoundScheduledGames}
                  positionRoundGame={selectedRoundPositionRoundGame}
                  roundParticipants={roundStandingsParticipants}
                  bonusPinsByTeamId={bonusPinsByTeamId}
                  teamScoringMode={effectiveTeamScoringMode}
                />
              ) : showBakerLeagueReconcile && scoringViewMode === 'lanes' ? (
                <BakerLeagueLaneAssignmentsView
                  squadCategories={createSquadCategories()}
                  allGames={squadGames}
                  gameCount={getCurrentRoundGameCount()}
                  scheduledGames={selectedRoundScheduledGames}
                  laneLabelLookup={laneLabelLookup}
                  roundParticipants={roundStandingsParticipants}
                  previewLanesByTeamId={lanePreviewLanesByTeamId}
                  positionRoundGame={selectedRoundPositionRoundGame}
                  positionRoundLanePlacement={String(
                    selectedRoundMethodConfig?.position_round_lane_placement ?? 'start_low'
                  )}
                  pairsInPlay={laneBoardPairsInPlay}
                  roundId={selectedRoundId}
                />
              ) : (
                <ScoringSurfaceRouter
                  method={selectedRoundCompetitionMethod}
                  isTeamEvent={isTeamEvent}
                  squadCategories={createSquadCategories()}
                  gameCount={getCurrentRoundGameCount()}
                  incomingRelationships={incomingRelationships}
                  advancementDestinationMap={advancementDestinationMap}
                  onGameScoreChange={handleGameScoreChange}
                  onTemporaryGameScoreChange={handleTemporaryGameScoreChange}
                  pendingGameChanges={pendingGameChanges}
                  expandedCategories={expandedCategories}
                  onToggleCategory={toggleCategory}
                  isLoadingSquadParticipants={isLoadingSquadParticipants}
                  loadingGames={loadingGames}
                  getCurrentRoundGameCount={getCurrentRoundGameCount}
                  getPendingGameValue={getPendingGameValue}
                  hasGamePendingChanges={hasGamePendingChanges}
                  getParticipantGames={getParticipantGames}
                  getGameIdForParticipantAndGameNumber={getGameIdForParticipantAndGameNumber}
                  getTeamGames={getTeamGames}
                  getTeamGameIdForTeamAndGameNumber={getTeamGameIdForTeamAndGameNumber}
                  allGames={squadGames}
                  squads={squads}
                  tabMode={tabMode}
                  participantSortOrder={participantSortOrder}
                  teamScoringMode={effectiveTeamScoringMode}
                  isBakerRound={selectedRoundIsBaker}
                  handicapEnabled={(eventComplete?.handicap_percentage ?? 0) > 0}
                  handicapBaseScore={eventComplete?.handicap_base_score ?? 200}
                  handicapPercentage={eventComplete?.handicap_percentage ?? 0}
                  selectedRoundId={selectedRoundId}
                  eventId={eventId}
                  matchSeries={roundMatchSeriesData?.match_series ?? []}
                  isLoadingMatchSeries={isLoadingRoundMatchSeries}
                  roundParticipants={scoringVisualParticipants as any[]}
                  bracketMode={selectedRoundBracketMode}
                  podSize={selectedRoundPodSize}
                  podMembership={
                    Array.isArray(selectedRoundMethodConfig?.pod_membership)
                      ? (selectedRoundMethodConfig?.pod_membership as number[][])
                      : null
                  }
                  advanceBySize={
                    (selectedRoundMethodConfig?.advance_by_size as Record<string, number>) ?? null
                  }
                  positionRoundGame={selectedRoundPositionRoundGame}
                  scheduledGames={selectedRoundScheduledGames}
                  carryOverTotalsByRelationshipId={carryOverTotalsByRelationshipId}
                  gameCountAdjustControls={gameCountAdjustControls}
                  laneLabelLookup={laneLabelLookup}
                  previewLanesByTeamId={lanePreviewLanesByTeamId}
                  standingPlaceByTeamId={standingPlaceByTeamId}
                  positionRoundLanePlacement={String(
                    selectedRoundMethodConfig?.position_round_lane_placement ?? 'start_low'
                  )}
                  pairsInPlay={laneBoardPairsInPlay}
                  bonusPinsEnabled={bonusPinsEnabled}
                  bonusPinsByTeamId={bonusPinsByTeamId}
                />
              ))}
          </ScoringTabOrderProvider>
        )}
      </div>

      <SquadNameDatetimeModal
        isOpen={squadNameDtModalMode !== null}
        onClose={closeSquadNameDatetimeModal}
        mode={squadNameDtModalMode === 'edit' ? 'edit' : 'create'}
        eventStartDate={eventComplete?.start_date}
        eventEndDate={eventComplete?.end_date}
        initialName={
          squadBeingEdited?.name ??
          (squadNameDtModalMode === 'create' ? expectedSquadNameForRound : undefined)
        }
        initialStartDatetime={squadBeingEdited?.start_datetime}
        isSubmitting={createRoundSquadMutation.isPending || updateRoundSquadMutation.isPending}
        errorMessage={squadModalServerError}
        onClearError={clearSquadModalServerError}
        onSubmit={handleSquadNameDatetimeSubmit}
      />

      {/* Re-entry Modal */}
      <ReEntryModal
        isOpen={reEntryModalOpen}
        onClose={() => {
          setReEntryModalOpen(false);
          setSelectedSquadForReEntry(null);
        }}
        participants={participants}
        onReEnterParticipants={handleReEnterParticipantsWrapper}
        isLoading={assignParticipantMutation.isPending}
      />

      <SquadUnlockConfirmDialog
        squadId={squadUnlockConfirmId}
        onClose={() => setSquadUnlockConfirmId(null)}
        onConfirmUnlock={unlockSquad}
      />

    </div>
  );
};

export default EventRoundWorkspace;