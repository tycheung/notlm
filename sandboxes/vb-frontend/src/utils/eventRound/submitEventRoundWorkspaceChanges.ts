/**
 * Extracted from EventRoundWorkspace to keep the workspace under the god-component ceiling.
 * Orchestrates game-score + assignment batch saves and query invalidation.
 */
import type { QueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "../../api/apiErrors";
import {
  buildPendingGameScorePayloads,
  chunkArray,
  evaluateBatchSaveOutcome,
  persistPendingGameScores,
} from "../pendingGameScoreSave";
import {
  ASSIGNMENT_BATCH_CHUNK_SIZE,
  buildIndividualAssignmentSavePlan,
  formatSkippedRemovalError,
} from "./buildIndividualAssignmentSavePlan";
import {
  formatGameBatchErrors,
  workspaceGameSaveQueryKeys,
  workspacePostSaveQueryKeys,
} from "./workspaceSaveHelpers";
import type { PendingAssignmentChanges } from "../../services/assignmentService";
import type { TeamScoringMode } from "../../hooks/useScoringTabMode";

export type SubmitEventRoundWorkspaceChangesDeps = {
  hasAnyGamePendingChanges: () => boolean;
  hasAnyAssignmentPendingChanges: () => boolean;
  temporaryGames: {
    hasAnyTemporaryGames: () => boolean;
    getTemporaryGameShells: () => Record<string, unknown>;
  };
  squadGames: unknown[];
  pendingGameChanges: Record<number | string, unknown>;
  isTeamEvent: boolean;
  effectiveTeamScoringMode: TeamScoringMode;
  setIsSavingGameScores: (v: boolean) => void;
  clearGameChanges: () => void;
  queryClient: QueryClient;
  eventId: number;
  setAssignmentError: (msg: string | null) => void;
  setIsSavingTeamAssignments: (v: boolean) => void;
  executeTeamAssignmentChanges: () => Promise<void>;
  clearTeamAssignmentChanges: () => void;
  selectedRoundId: number | null;
  pendingAssignmentChanges: PendingAssignmentChanges;
  squadParticipants: Record<string, unknown> | null | undefined;
  isInitialRound: boolean;
  batchUnassignAllMutation: { mutateAsync: (args: any) => Promise<any> };
  batchRemoveMutation: { mutateAsync: (args: any) => Promise<any> };
  batchAssignMutation: { mutateAsync: (args: any) => Promise<any> };
  setPendingAssignmentChanges: (
    updater: (prev: PendingAssignmentChanges) => PendingAssignmentChanges
  ) => void;
  setSuccessMessage: (msg: string | null) => void;
  batchReentryMutation: { mutateAsync: (args: any) => Promise<any> };
  clearAssignmentChanges: () => void;
  onAfterSuccessfulSave?: () => void;
};

export async function submitEventRoundWorkspaceChanges(
  deps: SubmitEventRoundWorkspaceChangesDeps
): Promise<void> {
  const {
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
  } = deps;

    try {
      // First, save game changes if any
      if (hasAnyGamePendingChanges()) {
        try {
          const temporaryShells = temporaryGames.hasAnyTemporaryGames()
            ? temporaryGames.getTemporaryGameShells()
            : {};

          const payloads = buildPendingGameScorePayloads({
            squadGames,
            pendingGameChanges,
            temporaryShells,
            isTeamEvent,
            teamScoringMode: effectiveTeamScoringMode,
          });

          const hadPayload =
            payloads.teamMemberScores.length > 0 ||
            payloads.temporaryShellsData.length > 0 ||
            payloads.gameUpdates.length > 0;

          setIsSavingGameScores(true);
          let response;
          try {
            response = await persistPendingGameScores(payloads, temporaryShells);
          } finally {
            setIsSavingGameScores(false);
          }

          const { saveSucceeded, hasResults } = evaluateBatchSaveOutcome(response, hadPayload);

          if (saveSucceeded || hasResults) {
            // Clear staged edits immediately — round completion / Redis pub-sub can make
            // post-save refetch slow, which otherwise leaves the "unsaved changes" bar stuck.
            clearGameChanges();

            try {
              await Promise.all(
                workspaceGameSaveQueryKeys(eventId).map((queryKey) =>
                  queryClient.invalidateQueries({ queryKey: [...queryKey] })
                )
              );
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['roundGames'] }),
                queryClient.refetchQueries({ queryKey: ['squadGames'] }),
                queryClient.refetchQueries({ queryKey: ['roundGames'] }),
              ]);
            } catch (invalidateError) {
              console.warn('Post-save query refresh failed:', invalidateError);
            }

            // Log any errors but don't fail the operation if some succeeded
            if (response.errors && response.errors.length > 0) {
              console.warn('Some games had errors:', response.errors);
              setAssignmentError(`Some games had errors: ${formatGameBatchErrors(response.errors)}`);
              setTimeout(() => setAssignmentError(null), 8000);
            }
          } else {
            // No games were created/updated - show detailed error
            const errorDetails = formatGameBatchErrors(response.errors);
            
            const errorMessage = response.message || errorDetails || 'Failed to save game changes';
            console.error('Game save failed - no games processed:', {
              response,
              errors: response.errors,
              temporaryShellsCount: payloads.temporaryShellsData.length,
              gameUpdatesCount: payloads.gameUpdates.length,
              teamMemberScoresCount: payloads.teamMemberScores.length
            });
            setAssignmentError(errorMessage);
            setTimeout(() => setAssignmentError(null), 10000);
            return; // Don't proceed with other changes if game save failed
          }
        } catch (error: any) {
          console.error('Error saving game changes:', error);
          const errorMessage = getErrorMessage(error, 'Failed to save game changes. Please check that all required fields are present.');
          setAssignmentError(errorMessage);
          setTimeout(() => setAssignmentError(null), 5000);
          return; // Don't proceed if game save failed
        }
      }

      // Then, save assignment changes using batch endpoints
      if (hasAnyAssignmentPendingChanges()) {
        if (isTeamEvent) {
          setIsSavingTeamAssignments(true);
          try {
            await executeTeamAssignmentChanges();
            clearTeamAssignmentChanges();

            // Invalidate in parallel. TanStack Query v5 refetches active queries on invalidate by default;
            // avoid a second sequential refetchQueries pass (was ~2× network work and long wall time).
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['squadParticipants'] }),
              queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] }),
              queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] }),
              queryClient.invalidateQueries({ queryKey: ['eventTeams', eventId] }),
              queryClient.invalidateQueries({ queryKey: ['squadTeams', selectedRoundId] }),
            ]);
          } finally {
            setIsSavingTeamAssignments(false);
          }
        } else {
          const {
            removals,
            assignments,
            reentries,
            initialRoundUnassignIds,
            skippedRemovalLookups,
          } = buildIndividualAssignmentSavePlan({
            pendingAssignmentChanges,
            squadParticipants: squadParticipants || {},
            isInitialRound,
          });

        if (skippedRemovalLookups.length > 0) {
          setAssignmentError(formatSkippedRemovalError(skippedRemovalLookups));
          setTimeout(() => setAssignmentError(null), 10000);
          return;
        }

        if (import.meta.env.DEV) {
          console.info('[EventRoundWorkspace] singles save assignment batch', {
            isInitialRound,
            initialRoundUnassignCount: initialRoundUnassignIds.length,
            removalsCount: removals.length,
            assignmentsCount: assignments.length,
            reentriesCount: reentries.length,
          });
        }

        if (initialRoundUnassignIds.length > 0) {
          const uniqueInitial = [...new Set(initialRoundUnassignIds)];
          const unassignChunks = chunkArray(uniqueInitial, ASSIGNMENT_BATCH_CHUNK_SIZE);
          for (const unassignChunk of unassignChunks) {
            const batchUnassignResponse = await batchUnassignAllMutation.mutateAsync({
              event_participant_ids: unassignChunk
            });
            if (batchUnassignResponse.failed_count > 0) {
              const failed = batchUnassignResponse.results.filter(r => !r.success);
              console.error('Some batch unassign-all operations failed:', failed);
              setAssignmentError(
                `Failed to unassign ${batchUnassignResponse.failed_count} participant(s) from squads. See console for details.`
              );
              setTimeout(() => setAssignmentError(null), 8000);
              return;
            }
          }
        }
        
        // Execute batch operations sequentially to prevent race conditions
        // Execute removals first
        if (removals.length > 0) {
          const removalChunks = chunkArray(removals, ASSIGNMENT_BATCH_CHUNK_SIZE);
          for (const removalChunk of removalChunks) {
            const removalResponse = await batchRemoveMutation.mutateAsync({ removals: removalChunk });
            
            // Check if any removals failed
            if (removalResponse.failed_count > 0) {
              const failedRemovals = removalResponse.results.filter(r => !r.success);
              console.error('Some removals failed:', failedRemovals);
              setAssignmentError(`Failed to remove ${removalResponse.failed_count} participants. Please check the console for details.`);
              setTimeout(() => setAssignmentError(null), 5000);
              return; // Don't proceed if removals failed
            }
          }
          
        }
        
        // Execute assignments after removals
        if (assignments.length > 0) {
          const assignmentChunks = chunkArray(assignments, ASSIGNMENT_BATCH_CHUNK_SIZE);
          for (const assignmentChunk of assignmentChunks) {
            const assignmentResponse = await batchAssignMutation.mutateAsync({ assignments: assignmentChunk });
            
            // Process assignment results
            const successfulAssignments = assignmentResponse.results.filter(r => r.success);
            const failedAssignments = assignmentResponse.results.filter(r => !r.success);

            // Clear successful and "already assigned" failures immediately
            setPendingAssignmentChanges((prev: PendingAssignmentChanges) => {
              const newChanges = { ...prev };
              successfulAssignments.forEach(success => {
                delete newChanges[success.event_participant_id];
              });
              failedAssignments.forEach(failed => {
                if (failed.error?.includes("already assigned")) {  // Looser match for safety
                  delete newChanges[failed.event_participant_id];
                }
              });
              return newChanges;
            });

            // Refetch after state update
            setTimeout(async () => {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['squadParticipants'] }),
                queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] }),
                queryClient.invalidateQueries({ queryKey: ['eventSquads', eventId] }),
              ]);
            }, 100);

            if (assignmentResponse.failed_count > 0) {
              console.error('Some assignments failed:', failedAssignments);
              
              // Log detailed error information
              failedAssignments.forEach((failed, index) => {
                console.error(`Failed assignment ${index + 1}:`, {
                  participantId: failed.event_participant_id,
                  squadId: failed.squad_id,
                  error: failed.error,
                  success: failed.success
                });
              });
              
              setAssignmentError(`Failed to assign ${assignmentResponse.failed_count} participants. Check console for details.`);
              setTimeout(() => setAssignmentError(null), 5000);
              return;
            } else {
              setSuccessMessage('Assignments saved successfully!');
            }
          }

          // Always invalidate and refetch queries after assignment attempt to sync state
          // queryClient.invalidateQueries({ queryKey: ['squadParticipants'] }); // This is now handled by the setTimeout
          // queryClient.invalidateQueries({ queryKey: ['eventParticipants', eventId] }); // This is now handled by the setTimeout
          // await queryClient.refetchQueries({ queryKey: ['squadParticipants'] }); // This is now handled by the setTimeout
          // await queryClient.refetchQueries({ queryKey: ['eventParticipants', eventId] }); // This is now handled by the setTimeout
          
        }
        
        // Execute re-entries after assignments
        if (reentries.length > 0) {
          const reentryChunks = chunkArray(reentries, ASSIGNMENT_BATCH_CHUNK_SIZE);
          for (const reentryChunk of reentryChunks) {
            const reentryResponse = await batchReentryMutation.mutateAsync({ reentries: reentryChunk });
            
            // Check if any re-entries failed
            if (reentryResponse.failed_count > 0) {
              const failedReentries = reentryResponse.results.filter(r => !r.success);
              console.error('Some re-entries failed:', failedReentries);
              setAssignmentError(`Failed to register ${reentryResponse.failed_count} re-entries. Please check the console for details.`);
              setTimeout(() => setAssignmentError(null), 5000);
              return; // Don't proceed if re-entries failed
            }
          }
          
        }
        
        clearAssignmentChanges();
        }
      }

      // Invalidate all relevant queries after all operations complete (team + singles paths).
      // Parallelize; rely on invalidate refetching active queries (no duplicate refetchQueries pass).
      await Promise.all(
        workspacePostSaveQueryKeys(eventId, selectedRoundId).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [...queryKey] })
        )
      );

      setSuccessMessage('All changes saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      onAfterSuccessfulSave?.();
    } catch (error) {
      console.error('Failed to save changes:', error);
      setAssignmentError(getErrorMessage(error, 'Failed to save changes. Please try again.'));
      setTimeout(() => setAssignmentError(null), 5000);
    }
}
