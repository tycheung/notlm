import { describe, expect, it } from 'vitest';
import {
  ASSIGNMENT_BATCH_CHUNK_SIZE,
  buildIndividualAssignmentSavePlan,
  formatSkippedRemovalError,
} from '../../../src/utils/eventRound/buildIndividualAssignmentSavePlan';

describe('buildIndividualAssignmentSavePlan', () => {
  it('exports the batch chunk size used by save execution', () => {
    expect(ASSIGNMENT_BATCH_CHUNK_SIZE).toBe(200);
  });

  it('plans a regular assignment from unassigned', () => {
    const plan = buildIndividualAssignmentSavePlan({
      isInitialRound: true,
      squadParticipants: {},
      pendingAssignmentChanges: {
        10: {
          fromSquadId: 'unassigned',
          toSquadId: '3',
          isRemoval: false,
        },
      },
    });

    expect(plan.assignments).toEqual([
      { event_participant_id: 10, squad_id: 3, is_reentry: false },
    ]);
    expect(plan.removals).toEqual([]);
    expect(plan.reentries).toEqual([]);
  });

  it('plans initial-round unassign-all when moving to unassigned', () => {
    const plan = buildIndividualAssignmentSavePlan({
      isInitialRound: true,
      squadParticipants: {
        3: [{ id: 99, event_participant_id: 10 }],
      },
      pendingAssignmentChanges: {
        10: {
          fromSquadId: '3',
          toSquadId: 'unassigned',
          isRemoval: false,
        },
      },
    });

    expect(plan.initialRoundUnassignIds).toEqual([10]);
    expect(plan.removals).toEqual([]);
  });

  it('plans squad-scoped removal for non-initial move to unassigned', () => {
    const plan = buildIndividualAssignmentSavePlan({
      isInitialRound: false,
      squadParticipants: {
        3: [{ id: 99, event_participant_id: 10 }],
      },
      pendingAssignmentChanges: {
        10: {
          fromSquadId: '3',
          toSquadId: 'unassigned',
          isRemoval: false,
        },
      },
    });

    expect(plan.removals).toEqual([{ squad_id: 3, squad_participant_id: 99 }]);
    expect(plan.initialRoundUnassignIds).toEqual([]);
  });

  it('plans squad-to-squad move as removal + assignment', () => {
    const plan = buildIndividualAssignmentSavePlan({
      isInitialRound: false,
      squadParticipants: {
        3: [{ id: 99, event_participant_id: 10 }],
      },
      pendingAssignmentChanges: {
        10: {
          fromSquadId: '3',
          toSquadId: '4',
          isRemoval: false,
        },
      },
    });

    expect(plan.removals).toEqual([{ squad_id: 3, squad_participant_id: 99 }]);
    expect(plan.assignments).toEqual([
      { event_participant_id: 10, squad_id: 4, is_reentry: false },
    ]);
  });

  it('records skipped removals when squad row cannot be resolved', () => {
    const plan = buildIndividualAssignmentSavePlan({
      isInitialRound: false,
      squadParticipants: {},
      pendingAssignmentChanges: {
        10: {
          fromSquadId: '3',
          toSquadId: '4',
          isRemoval: false,
        },
      },
    });

    expect(plan.skippedRemovalLookups).toHaveLength(1);
    expect(formatSkippedRemovalError(plan.skippedRemovalLookups)).toMatch(
      /Could not resolve 1 squad row/
    );
  });

  it('plans reentry assignment using squadParticipantId for staged removal', () => {
    const plan = buildIndividualAssignmentSavePlan({
      isInitialRound: false,
      squadParticipants: {},
      pendingAssignmentChanges: {
        500: {
          isRemoval: true,
          fromSquadId: '3',
          is_reentry: true,
          squadParticipantId: 500,
          originalId: 10,
        },
      },
    });

    expect(plan.removals).toEqual([{ squad_id: 3, squad_participant_id: 500 }]);
  });
});
