import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RoundsAPI, RoundRealTimeStatus } from '../api/rounds';
import { SquadsAPI } from '../api/squads';
import { getErrorMessage } from '../api/apiErrors';
import { useRoundRealtimeStatuses } from './useRoundRealtimeStatuses';
import { getMostRelevantRound } from '../features/rounds/roundRelevance';
import { displayLabelForRealtimeRoundStatus } from '../utils/statusUtils';

interface UseRoundManagementProps {
  eventId: number;
  selectedRoundId: number | null;
  eventComplete: any;
  allSquads: any[];
  /** @deprecated Real-time API is source of truth; no longer used */
  squadGames?: any[];
  /** @deprecated Real-time API is source of truth; no longer used */
  squadParticipants?: { [squadId: number]: any[] };
  /** Surface lock/unlock failures in the Squads tab (replaces console-only errors). */
  onSquadActionError?: (message: string) => void;
}

interface UseRoundManagementReturn {
  /** Every squad in the selected round has locked_in (mirrors round.locked_in from API). */
  allSquadsLockedIn: boolean;
  /** At least one squad in the selected round is locked in. */
  anySquadLockedIn: boolean;
  selectedRoundId: number | null;
  currentActiveRound: any;
  handleUnlockRound: () => void;
  isUnlocking: boolean;
  lockSquad: (squadId: number) => void;
  unlockSquad: (squadId: number) => void;
  isLockingSquadId: number | null;
  isUnlockingSquadId: number | null;
  setSelectedRoundId: (roundId: number | null) => void;
  getRoundStatus: (roundId: number) => string | null;
  roundStatusData: { [roundId: number]: any } | null;
  isLoadingRoundStatus: boolean;
  refreshRoundStatus: () => void;
  completeRound: () => void;
  isCompletingRound: boolean;
  selectedRoundRealtimeStatus: RoundRealTimeStatus | undefined;
}

export const useRoundManagement = ({
  eventId,
  selectedRoundId,
  eventComplete,
  allSquads,
  onSquadActionError,
}: UseRoundManagementProps): UseRoundManagementReturn => {
  const [selectedRoundIdState, setSelectedRoundIdState] = useState<number | null>(selectedRoundId);
  const queryClient = useQueryClient();

  const reportSquadActionError = useCallback(
    (error: unknown, fallback: string) => {
      const message = getErrorMessage(error, fallback);
      console.error(fallback, error);
      onSquadActionError?.(message);
    },
    [onSquadActionError]
  );

  const { data: roundStatusData, isLoading: isLoadingRoundStatus } = useRoundRealtimeStatuses(
    eventId,
    eventComplete?.rounds
  );

  const squadsForSelectedRound = useMemo(() => {
    if (!selectedRoundIdState) return [];
    return (allSquads || []).filter((s: any) => s.round_id === selectedRoundIdState);
  }, [allSquads, selectedRoundIdState]);

  const allSquadsLockedIn = useMemo(() => {
    if (!selectedRoundIdState || squadsForSelectedRound.length === 0) return false;
    return squadsForSelectedRound.every((s: any) => s.locked_in);
  }, [squadsForSelectedRound, selectedRoundIdState]);

  const anySquadLockedIn = useMemo(() => {
    return squadsForSelectedRound.some((s: any) => s.locked_in);
  }, [squadsForSelectedRound]);

  const completeRoundMutation = useMutation({
    mutationFn: async (roundId: number) => RoundsAPI.completeRound(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventRounds'] });
      queryClient.invalidateQueries({ queryKey: ['eventChampionshipResults', eventId] });
      queryClient.invalidateQueries({ queryKey: ['roundRelationships', eventId] });
      queryClient.invalidateQueries({ queryKey: ['allPoolParticipants'] });
    },
    onError: (error: unknown) => {
      reportSquadActionError(error, 'Failed to complete round');
    },
  });

  const unlockRoundMutation = useMutation({
    mutationFn: async (roundId: number) => {
      return RoundsAPI.unlockRound(roundId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      queryClient.invalidateQueries({ queryKey: ['squadGames'] });
      queryClient.invalidateQueries({ queryKey: ['squadParticipants'] });
      queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] });
      queryClient.invalidateQueries({ queryKey: ['allPoolParticipants'] });
      queryClient.invalidateQueries({ queryKey: ['roundRelationships', eventId] });
    },
    onError: (error: unknown) => {
      reportSquadActionError(error, 'Failed to unlock round');
    }
  });

  const lockSquadMutation = useMutation({
    mutationFn: async (squadId: number) => {
      return SquadsAPI.lockInSquad(squadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      queryClient.invalidateQueries({ queryKey: ['squadGames'] });
      queryClient.invalidateQueries({ queryKey: ['squadParticipants'] });
      queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] });
      queryClient.invalidateQueries({ queryKey: ['allPoolParticipants'] });
      queryClient.invalidateQueries({ queryKey: ['roundRelationships', eventId] });
      queryClient.invalidateQueries({ queryKey: ['roundScoringRoster'] });
      queryClient.invalidateQueries({ queryKey: ['roundMatchSeries'] });
      queryClient.invalidateQueries({ queryKey: ['orderedEntrants'] });
    },
    onError: (error: unknown) => {
      reportSquadActionError(error, 'Failed to lock squad');
    }
  });

  const unlockSquadMutation = useMutation({
    mutationFn: async (squadId: number) => {
      return SquadsAPI.unlockSquad(squadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
      queryClient.invalidateQueries({ queryKey: ['squadGames'] });
      queryClient.invalidateQueries({ queryKey: ['squadParticipants'] });
      queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] });
      queryClient.invalidateQueries({ queryKey: ['allPoolParticipants'] });
      queryClient.invalidateQueries({ queryKey: ['roundRelationships', eventId] });
      queryClient.invalidateQueries({ queryKey: ['roundScoringRoster'] });
      queryClient.invalidateQueries({ queryKey: ['roundMatchSeries'] });
      queryClient.invalidateQueries({ queryKey: ['orderedEntrants'] });
    },
    onError: (error: unknown) => {
      reportSquadActionError(error, 'Failed to unlock squad');
    }
  });

  const handleUnlockRound = useCallback(() => {
    if (selectedRoundIdState) {
      unlockRoundMutation.mutate(selectedRoundIdState);
    }
  }, [selectedRoundIdState, unlockRoundMutation]);

  const lockSquad = useCallback(
    (squadId: number) => {
      lockSquadMutation.mutate(squadId);
    },
    [lockSquadMutation]
  );

  const unlockSquad = useCallback(
    (squadId: number) => {
      unlockSquadMutation.mutate(squadId);
    },
    [unlockSquadMutation]
  );

  const findCurrentActiveRound = useCallback(() => {
    const relevance = getMostRelevantRound({
      rounds: eventComplete?.rounds,
      allSquads,
      roundStatusData,
    });
    return relevance.round;
  }, [eventComplete?.rounds, allSquads, roundStatusData]);

  const currentActiveRound = useMemo(() => findCurrentActiveRound(), [findCurrentActiveRound]);

  const getRoundStatus = useCallback((roundId: number) => {
    if (!roundStatusData) return null;

    const roundStatus = roundStatusData[roundId];
    if (!roundStatus) return null;

    return displayLabelForRealtimeRoundStatus(roundStatus.status);
  }, [roundStatusData]);

  useEffect(() => {
    setSelectedRoundIdState(selectedRoundId);
  }, [selectedRoundId]);

  useEffect(() => {
    if (currentActiveRound && !selectedRoundIdState) {
      setSelectedRoundIdState(currentActiveRound.id);
    }
  }, [currentActiveRound, selectedRoundIdState]);

  const isLockingSquadId =
    lockSquadMutation.isPending && lockSquadMutation.variables != null
      ? lockSquadMutation.variables
      : null;
  const isUnlockingSquadId =
    unlockSquadMutation.isPending && unlockSquadMutation.variables != null
      ? unlockSquadMutation.variables
      : null;

  const selectedRoundRealtimeStatus =
    selectedRoundIdState != null ? roundStatusData?.[selectedRoundIdState] : undefined;

  const completeRound = useCallback(() => {
    if (selectedRoundIdState) {
      completeRoundMutation.mutate(selectedRoundIdState);
    }
  }, [selectedRoundIdState, completeRoundMutation]);

  return {
    allSquadsLockedIn,
    anySquadLockedIn,
    selectedRoundId: selectedRoundIdState,
    currentActiveRound,
    handleUnlockRound,
    isUnlocking: unlockRoundMutation.isPending,
    lockSquad,
    unlockSquad,
    isLockingSquadId,
    isUnlockingSquadId,
    setSelectedRoundId: setSelectedRoundIdState,
    getRoundStatus,
    roundStatusData: roundStatusData || null,
    isLoadingRoundStatus,
    refreshRoundStatus: () => {
      queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] });
    },
    completeRound,
    isCompletingRound: completeRoundMutation.isPending,
    selectedRoundRealtimeStatus,
  };
};
