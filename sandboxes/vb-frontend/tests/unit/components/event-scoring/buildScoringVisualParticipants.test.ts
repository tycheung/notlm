import { describe, expect, it } from 'vitest';
import {
  getSelectedRoundBracketMode,
  getSelectedRoundCompetitionMethod,
  getSelectedRoundPodSize,
} from '../../../../src/components/event-scoring/visual/selectedRoundScoringConfig';
import {
  buildScoringVisualDiagnostics,
  buildScoringVisualParticipants,
  deriveScoringEmptyReason,
} from '../../../../src/components/event-scoring/visual/buildScoringVisualParticipants';

describe('selectedRoundScoringConfig', () => {
  const rounds = [
    {
      id: 1,
      competition_method: 'bracket',
      competition_method_config: { bracket_mode: 'double_elimination', pod_size: 4 },
    },
    { id: 2, competition_method: 'pods', competition_method_config: { pod_size: 3 } },
    { id: 3, competition_method: 'eliminator' },
  ];

  it('resolves competition method and bracket/pod config', () => {
    expect(getSelectedRoundCompetitionMethod(rounds, 1)).toBe('bracket');
    expect(getSelectedRoundBracketMode(rounds, 1)).toBe('double_elimination');
    expect(getSelectedRoundPodSize(rounds, 2)).toBe(3);
    expect(getSelectedRoundCompetitionMethod(rounds, 3)).toBe('eliminator');
    expect(getSelectedRoundPodSize(rounds, 3)).toBeNull();
  });
});

describe('buildScoringVisualParticipants', () => {
  it('merges roster and pool rows, preferring locked roster and canonical order', () => {
    const rows = buildScoringVisualParticipants({
      orderedEntrants: [
        { event_participant_id: 10, pool_position: 2 },
        { event_participant_id: 11, pool_position: 1 },
      ],
      scoringRosterParticipants: [
        {
          event_participant_id: 10,
          user_name: 'Alice',
          can_edit: true,
          squad_locked_in: true,
        },
      ],
      unassignedParticipants: [
        { id: 11, user_name: 'Bob', advancement_position: 1 },
        { id: 10, user_name: 'Alice Dup' },
      ],
      poolTeamsForRound: [],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].event_participant_id).toBe(10);
    expect(rows[0].row_source).toBe('assigned_roster');
    expect(rows[1].event_participant_id).toBe(11);
    expect(rows[1].canonical_order).toBe(1);
  });

  it('prefers team aggregate roster rows over individual members for the same team_id', () => {
    const rows = buildScoringVisualParticipants({
      scoringRosterParticipants: [
        {
          event_participant_id: 112,
          team_id: 3,
          user_name: 'Hawley Test4',
          display_name: 'Hawley Test4',
          can_edit: true,
          squad_locked_in: true,
        },
        {
          team_id: 3,
          team_name: 'Team Hawley',
          display_name: 'Team Hawley',
          can_edit: true,
          squad_locked_in: true,
          team_members: [{ event_participant_id: 109, display_name: 'Hunter Hawley' }],
        },
      ],
      unassignedParticipants: [],
      poolTeamsForRound: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].team_id).toBe(3);
    expect(rows[0].team_name).toBe('Team Hawley');
    expect(rows[0].display_name).toBe('Team Hawley');
    expect(rows[0].team_members).toHaveLength(1);
  });

  it('harvests member event_participant_ids when the team aggregate omits them', () => {
    const rows = buildScoringVisualParticipants({
      scoringRosterParticipants: [
        {
          event_participant_id: 201,
          team_id: 9,
          user_name: 'TeamBowler 1',
          display_name: 'TeamBowler 1',
          can_edit: true,
          squad_locked_in: true,
        },
        {
          event_participant_id: 202,
          team_id: 9,
          user_name: 'TeamBowler 2',
          display_name: 'TeamBowler 2',
          can_edit: true,
          squad_locked_in: true,
        },
        {
          team_id: 9,
          team_name: 'E2E Team A',
          display_name: 'E2E Team A',
          can_edit: true,
          squad_locked_in: true,
          team_members: [{ user_id: 1, display_name: 'TeamBowler 1' }],
        },
      ],
      unassignedParticipants: [],
      poolTeamsForRound: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].team_name).toBe('E2E Team A');
    expect(rows[0].team_members).toEqual([
      { event_participant_id: 201, display_name: 'TeamBowler 1' },
      { event_participant_id: 202, display_name: 'TeamBowler 2' },
    ]);
  });

  it('builds diagnostics and empty-state copy for incoming rounds', () => {
    const rows = buildScoringVisualParticipants({
      orderedEntrants: [],
      scoringRosterParticipants: [],
      unassignedParticipants: [],
      poolTeamsForRound: [],
    });
    const diagnostics = buildScoringVisualDiagnostics({
      rows,
      hasIncomingRelationships: true,
      orderedDiagnostics: {
        order_source: 'pool',
        ordered_entrant_count: 0,
        structure_state: 'awaiting_sync',
        fallback_reasons: ['no_shells'],
      },
    });
    expect(diagnostics.mergedCount).toBe(0);
    expect(diagnostics.structureState).toBe('awaiting_sync');

    const reason = deriveScoringEmptyReason({
      scoringSurface: true,
      participants: rows,
      isLoading: false,
      hasIncomingRelationships: true,
      diagnostics,
    });
    expect(reason).toMatch(/No assigned roster or advancement pool/);
    expect(reason).toContain('fallbacks=no_shells');
  });

  it('returns null empty reason while loading or when rows exist', () => {
    expect(
      deriveScoringEmptyReason({
        scoringSurface: true,
        participants: [],
        isLoading: true,
        hasIncomingRelationships: false,
        diagnostics: buildScoringVisualDiagnostics({
          rows: [],
          hasIncomingRelationships: false,
        }),
      })
    ).toBeNull();
  });
});
