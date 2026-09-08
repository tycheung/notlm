import { normalizeSquadCategoryId } from '../../hooks/useAssignmentChanges';

export const ASSIGNMENT_BATCH_CHUNK_SIZE = 200;

export type AssignmentRemoval = {
  squad_id: number;
  squad_participant_id: number;
};

export type AssignmentCreate = {
  event_participant_id: number;
  squad_id: number;
  is_reentry: boolean;
  notes?: string;
};

export type AssignmentReentry = {
  event_participant_id: number;
  squad_id: number;
  notes: string;
};

export type SkippedRemovalLookup = {
  context: string;
  effectiveId: number;
  squadId: number;
};

export type IndividualAssignmentSavePlan = {
  removals: AssignmentRemoval[];
  assignments: AssignmentCreate[];
  reentries: AssignmentReentry[];
  initialRoundUnassignIds: number[];
  skippedRemovalLookups: SkippedRemovalLookup[];
};

type SquadParticipantRow = {
  id: number;
  event_participant_id: number;
};

type PendingAssignmentChange = {
  originalId?: number;
  isRemoval?: boolean;
  fromSquadId?: string | null;
  toSquadId?: string | null;
  is_reentry?: boolean;
  squadParticipantId?: number;
  isPoolParticipant?: boolean;
  poolEntryId?: number;
};

function resolveSquadParticipantList(
  squadParticipants: Record<number, SquadParticipantRow[]> | Record<string, SquadParticipantRow[]>,
  squadId: number
): SquadParticipantRow[] {
  return (
    (squadParticipants as Record<number, SquadParticipantRow[]>)[squadId] ??
    (squadParticipants as Record<string, SquadParticipantRow[]>)[String(squadId)] ??
    []
  );
}

/**
 * Build removals / assignments / re-entries from pending individual assignment changes.
 * Mutating APIs stay in the caller; this is pure planning.
 */
export function buildIndividualAssignmentSavePlan(input: {
  pendingAssignmentChanges: Record<string | number, PendingAssignmentChange | undefined>;
  squadParticipants: Record<number, SquadParticipantRow[]> | Record<string, SquadParticipantRow[]>;
  isInitialRound: boolean;
}): IndividualAssignmentSavePlan {
  const { pendingAssignmentChanges, squadParticipants, isInitialRound } = input;

  const participantKeys = Object.keys(pendingAssignmentChanges).map((key) => parseInt(key, 10));

  const removals: AssignmentRemoval[] = [];
  const assignments: AssignmentCreate[] = [];
  const reentries: AssignmentReentry[] = [];
  const initialRoundUnassignIds: number[] = [];
  const skippedRemovalLookups: SkippedRemovalLookup[] = [];

  for (const participantKey of participantKeys) {
    const change = pendingAssignmentChanges[participantKey];
    if (!change) {
      continue;
    }

    const effectiveId = change.originalId ?? participantKey;

    if (change.isRemoval) {
      if (change.fromSquadId) {
        const originalSquadId = parseInt(change.fromSquadId, 10);
        let squadParticipantId: number | undefined;

        if (change.is_reentry && change.squadParticipantId) {
          squadParticipantId = change.squadParticipantId;
        } else if (change.is_reentry && participantKey !== effectiveId) {
          squadParticipantId = participantKey;
        } else {
          const squadParticipant = resolveSquadParticipantList(
            squadParticipants,
            originalSquadId
          ).find((sp) => sp.event_participant_id === effectiveId);

          if (squadParticipant) {
            squadParticipantId = squadParticipant.id;
          } else {
            skippedRemovalLookups.push({
              context: 'staged removal',
              effectiveId,
              squadId: originalSquadId,
            });
            continue;
          }
        }

        if (squadParticipantId != null) {
          removals.push({
            squad_id: originalSquadId,
            squad_participant_id: squadParticipantId,
          });
        }
      }
      continue;
    }

    if (normalizeSquadCategoryId(change.toSquadId) === null) {
      if (!isInitialRound) {
        if (change.fromSquadId && change.fromSquadId !== 'unassigned') {
          const originalSquadId = parseInt(change.fromSquadId, 10);
          const squadParticipant = resolveSquadParticipantList(
            squadParticipants,
            originalSquadId
          ).find((sp) => sp.event_participant_id === effectiveId);

          if (squadParticipant) {
            removals.push({
              squad_id: originalSquadId,
              squad_participant_id: squadParticipant.id,
            });
          } else {
            skippedRemovalLookups.push({
              context: 'move to unassigned (non-initial round)',
              effectiveId,
              squadId: originalSquadId,
            });
          }
        }
      } else {
        initialRoundUnassignIds.push(effectiveId);
      }
    } else if (
      change.fromSquadId &&
      change.fromSquadId !== 'unassigned' &&
      normalizeSquadCategoryId(change.toSquadId) !== null
    ) {
      const originalSquadId = parseInt(change.fromSquadId, 10);
      let squadParticipantId: number | undefined;

      if (change.is_reentry && change.squadParticipantId) {
        squadParticipantId = change.squadParticipantId;
      } else if (change.is_reentry && participantKey !== effectiveId) {
        squadParticipantId = participantKey;
      } else {
        const squadParticipant = resolveSquadParticipantList(
          squadParticipants,
          originalSquadId
        ).find((sp) => sp.event_participant_id === effectiveId);
        if (squadParticipant) {
          squadParticipantId = squadParticipant.id;
        } else {
          skippedRemovalLookups.push({
            context: 'squad-to-squad move (remove from origin)',
            effectiveId,
            squadId: originalSquadId,
          });
          continue;
        }
      }

      if (squadParticipantId != null) {
        removals.push({
          squad_id: originalSquadId,
          squad_participant_id: squadParticipantId,
        });
      }
    }

    if (normalizeSquadCategoryId(change.toSquadId) !== null) {
      const targetSquadId = parseInt(String(change.toSquadId), 10);

      if (change.isPoolParticipant && change.poolEntryId) {
        assignments.push({
          event_participant_id: effectiveId,
          squad_id: targetSquadId,
          is_reentry: false,
          notes: `Assigned from advancement pool (entry ${change.poolEntryId})`,
        });
      } else if (change.is_reentry) {
        reentries.push({
          event_participant_id: effectiveId,
          squad_id: targetSquadId,
          notes: `Re-entry to squad ${targetSquadId}`,
        });
      } else {
        assignments.push({
          event_participant_id: effectiveId,
          squad_id: targetSquadId,
          is_reentry: false,
        });
      }
    }
  }

  return {
    removals,
    assignments,
    reentries,
    initialRoundUnassignIds,
    skippedRemovalLookups,
  };
}

export function formatSkippedRemovalError(skipped: SkippedRemovalLookup[]): string {
  const sample = skipped
    .slice(0, 5)
    .map((s) => `${s.context}: participant ${s.effectiveId} (squad ${s.squadId})`)
    .join('; ');
  const more = skipped.length > 5 ? ` (+${skipped.length - 5} more)` : '';
  return `Could not resolve ${skipped.length} squad row(s) for removal. Try refreshing or re-selecting the round. ${sample}${more}`;
}
