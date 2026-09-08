import { useState, useCallback } from 'react';
import { EventTeamWithMembers } from '../types/event_team';
import { SquadRead, BatchTeamSquadOperation } from '../types/squad';
import { SquadsAPI } from '../api/squads';
import { normalizeSquadCategoryId } from './useAssignmentChanges';

const TEAM_BATCH_CHUNK_SIZE = 200;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

interface PendingTeamAssignmentChanges {
  [teamId: number]: {
    fromSquadId: string | null;
    toSquadId: string | null;
    team: EventTeamWithMembers;
    is_reentry: boolean;
    originalId?: number;
    isRemoval?: boolean;
  };
}

interface UseTeamAssignmentChangesProps {
  squadTeams: { [squadId: number]: EventTeamWithMembers[] };
  squads: SquadRead[];
  selectedRoundId: number | null;
  unassignedTeams: EventTeamWithMembers[];
  teams: EventTeamWithMembers[];
}

export const useTeamAssignmentChanges = ({
  squadTeams,
  squads,
  selectedRoundId,
  unassignedTeams,
  teams
}: UseTeamAssignmentChangesProps) => {
  const [pendingTeamAssignmentChanges, setPendingTeamAssignmentChanges] = useState<PendingTeamAssignmentChanges>({});

  /** Squad id string or null (unassigned), from server state only — mirrors getOriginalSquadAssignment for singles. */
  const getOriginalTeamSquadAssignment = useCallback(
    (teamId: number): string | null => {
      if (!teamId) return null;
      for (const squadIdKey of Object.keys(squadTeams)) {
        const list = squadTeams[Number(squadIdKey)] ?? [];
        if (!list.some((t) => t.id === teamId)) continue;
        const squad = squads?.find((s) => s.id.toString() === squadIdKey);
        if (selectedRoundId != null) {
          if (squad && squad.round_id !== selectedRoundId) continue;
        }
        return squadIdKey;
      }
      return null;
    },
    [squadTeams, squads, selectedRoundId]
  );

  const getCurrentSquadTeamAssignment = useCallback(
    (teamId: number): string | null => {
      const pendingChange = pendingTeamAssignmentChanges[teamId];
      if (pendingChange) {
        return normalizeSquadCategoryId(pendingChange.toSquadId);
      }
      return normalizeSquadCategoryId(getOriginalTeamSquadAssignment(teamId));
    },
    [pendingTeamAssignmentChanges, getOriginalTeamSquadAssignment]
  );

  // Handle drag and drop assignment for teams
  const handleDragDropTeamAssignment = useCallback((result: any) => {
    const { item, fromCategoryId, toCategoryId } = result;
    
    if (!item || !item.data) {
      console.warn('Invalid drag drop result:', result);
      return;
    }

    const team = item.data as EventTeamWithMembers;
    if (!team || !team.id) {
      console.warn('Invalid team data:', team);
      return;
    }

    if (fromCategoryId === toCategoryId) {
      return;
    }

    const fromSquadId = normalizeSquadCategoryId(
      fromCategoryId === 'unassigned' ? null : String(fromCategoryId)
    );
    const dest = normalizeSquadCategoryId(
      toCategoryId === 'unassigned' ? null : String(toCategoryId)
    );

    const currentCat = getCurrentSquadTeamAssignment(team.id);
    if (currentCat === dest) {
      return;
    }

    const squadCategoryLocked = (catId: string | null): boolean => {
      if (catId == null || catId === 'unassigned') return false;
      const n = parseInt(String(catId), 10);
      if (!Number.isFinite(n)) return false;
      const sq = squads.find((s) => s.id === n);
      return Boolean(sq?.locked_in);
    };
    if (squadCategoryLocked(fromSquadId) || squadCategoryLocked(dest)) {
      return;
    }

    if (dest) {
      const targetSquadTeams = squadTeams[parseInt(dest, 10)] || [];
      if (targetSquadTeams.some((t) => t.id === team.id)) {
        return;
      }
    }

    setPendingTeamAssignmentChanges((prev) => {
      const newChanges = { ...prev };
      
      if (newChanges[team.id]) {
        const existingChange = newChanges[team.id];
        
        if (dest === null) {
          newChanges[team.id] = {
            ...existingChange,
            toSquadId: null,
            isRemoval: true
          };
        } else {
          newChanges[team.id] = {
            ...existingChange,
            toSquadId: dest
          };
        }
      } else {
        newChanges[team.id] = {
          fromSquadId,
          toSquadId: dest,
          team: team,
          is_reentry: team.is_reentry || false,
          originalId: team.id,
          isRemoval: dest === null
        };
      }

      return newChanges;
    });
  }, [squadTeams, squads, getCurrentSquadTeamAssignment]);

  // Handle re-entering teams
  const handleReEnterTeams = useCallback((selectedTeamIds: number[], targetSquadId: number) => {

    if (squads?.some((s) => s.id === targetSquadId && s.locked_in)) {
      return;
    }

    const teamsToReEnter = teams?.filter(team => selectedTeamIds.includes(team.id)) || [];
    
    if (teamsToReEnter.length === 0) {
      console.warn('No teams found to re-enter');
      return;
    }

    setPendingTeamAssignmentChanges(prev => {
      const newChanges = { ...prev };
      
      teamsToReEnter.forEach(team => {
        // Create a re-entry team (copy with new entry number)
        const reEntryTeam: EventTeamWithMembers = {
          ...team,
          id: team.id + 10000, // Temporary ID for re-entry
          entry_number: (team.entry_number || 1) + 1,
          is_reentry: true
        };

        newChanges[reEntryTeam.id] = {
          fromSquadId: null,
          toSquadId: targetSquadId.toString(),
          team: reEntryTeam,
          is_reentry: true,
          originalId: team.id
        };
      });


      return newChanges;
    });
  }, [teams, squads]);

  // Clear all assignment changes
  const clearTeamAssignmentChanges = useCallback(() => {
    setPendingTeamAssignmentChanges({});
  }, []);

  // Stage team for removal (for re-entries)
  const handleStageTeamReEntryRemoval = useCallback((teamKey: number, team: EventTeamWithMembers) => {

    setPendingTeamAssignmentChanges(prev => {
      const newChanges = { ...prev };
      
      // Find the current squad assignment
      const currentSquadId = getCurrentSquadTeamAssignment(team.id);
      
      if (currentSquadId) {
        const n = parseInt(String(currentSquadId), 10);
        if (Number.isFinite(n) && squads?.some((s) => s.id === n && s.locked_in)) {
          return prev;
        }
        newChanges[teamKey] = {
          fromSquadId: currentSquadId,
          toSquadId: null,
          team: team,
          is_reentry: team.is_reentry || false,
          originalId: team.id,
          isRemoval: true
        };
      }

      return newChanges;
    });
  }, [getCurrentSquadTeamAssignment, squads]);

  // Undo team removal
  const handleUndoTeamRemoval = useCallback((teamKey: number) => {

    setPendingTeamAssignmentChanges(prev => {
      const newChanges = { ...prev };
      delete newChanges[teamKey];
      return newChanges;
    });
  }, []);

  // One HTTP request for all team ops (POST /squads/batch-team-operations)
  const executeTeamAssignmentChanges = useCallback(async () => {
    const changes = Object.values(pendingTeamAssignmentChanges);
    if (changes.length === 0) return;

    const operations: BatchTeamSquadOperation[] = [];
    for (const change of changes) {
      const toNorm = normalizeSquadCategoryId(change.toSquadId);
      if (toNorm !== null) {
        operations.push({
          action: 'assign',
          team_id: change.team.id,
          squad_id: parseInt(toNorm, 10),
        });
        continue;
      }
      const fromNorm = normalizeSquadCategoryId(change.fromSquadId);
      if (fromNorm !== null) {
        operations.push({
          action: 'remove',
          team_id: change.team.id,
          squad_id: parseInt(fromNorm, 10),
        });
        continue;
      }
      console.warn(
        'Skipping team assignment change: removal to unassigned requires fromSquadId',
        { teamId: change.team.id, fromSquadId: change.fromSquadId, toSquadId: change.toSquadId }
      );
    }

    if (operations.length === 0) return;

    const operationChunks = chunkArray(operations, TEAM_BATCH_CHUNK_SIZE);
    for (const operationChunk of operationChunks) {
      const res = await SquadsAPI.batchTeamSquadOperations({ operations: operationChunk });

      const conflicts = res.results.filter(
        (r) => !r.success && (r.error?.includes('CONFLICT') ?? false)
      );
      conflicts.forEach((r) =>
        console.warn(`⚠️ Team ${r.team_id} batch row conflict — skipped`, r)
      );

      const hardFailures = res.results.filter(
        (r) => !r.success && !(r.error?.includes('CONFLICT') ?? false)
      );
      if (hardFailures.length > 0) {
        const msg = hardFailures.map((r) => `team ${r.team_id}: ${r.error}`).join('; ');
        throw new Error(`Some team squad changes failed: ${msg}`);
      }
    }
  }, [pendingTeamAssignmentChanges]);

  return {
    pendingTeamAssignmentChanges,
    handleDragDropTeamAssignment,
    handleReEnterTeams,
    getCurrentSquadTeamAssignment,
    clearTeamAssignmentChanges,
    handleStageTeamReEntryRemoval,
    handleUndoTeamRemoval,
    executeTeamAssignmentChanges
  };
};
