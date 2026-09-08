import { describe, it, expect } from 'vitest';
import { buildAdvancementDestinationMap } from '../../../src/utils/advancementDestinations';

describe('buildAdvancementDestinationMap', () => {
  it('maps pool rows to participant and team keys', () => {
    const map = buildAdvancementDestinationMap({
      selectedRoundId: 1,
      outgoingRelationships: [{ id: 10, target_round_id: 2 }],
      poolByRelationshipId: {
        10: [
          {
            id: 1,
            event_id: 1,
            source_round_id: 1,
            target_round_id: 2,
            event_participant_id: 100,
            user_id: 5,
            advancement_relationship_id: 10,
            advancement_position: 1,
            advancement_criteria_type: 'highest_average',
            advancement_criteria_value: 200,
            is_assigned_to_squad: false,
            assigned_squad_id: null,
            created_at: '',
            updated_at: '',
          },
        ],
      },
      rounds: [{ id: 2, friendly_name: 'Semifinals', round_number: 2 }],
      finalNodes: [],
      teams: [
        {
          id: 50,
          event_id: 1,
          team_number: 1,
          members: [{ event_participant_id: 100, user_id: 5 }],
        } as any,
      ],
    });

    expect(map.get('ep:100')).toEqual([
      { kind: 'round', label: 'Semifinals', relationshipId: 10 },
    ]);
    expect(map.get('team:50')).toEqual([
      { kind: 'round', label: 'Semifinals', relationshipId: 10 },
    ]);
  });

  it('maps championship placements to final_node destinations', () => {
    const map = buildAdvancementDestinationMap({
      selectedRoundId: 3,
      outgoingRelationships: [{ id: 20, final_node_id: 99 }],
      poolByRelationshipId: {},
      championshipResults: {
        event_id: 1,
        final_nodes: [
          {
            final_node_id: 99,
            final_node_name: 'Championship',
            source_round_id: 3,
            placements: [
              {
                id: 1,
                event_id: 1,
                final_node_id: 99,
                source_round_id: 3,
                placement: 1,
                criteria_type: 'highest_average',
                criteria_value: 220,
                tiebreaker_rule: 'highest_game',
                winner: { event_participant_id: 200, display_name: 'Winner' },
                team_members: [],
                created_at: '',
              },
            ],
          },
        ],
      },
      rounds: [],
      finalNodes: [{ id: 99, name: 'Championship Payout', event_id: 1 } as any],
    });

    const dests = map.get('ep:200');
    expect(dests?.[0].kind).toBe('final_node');
    expect(dests?.[0].label).toContain('Championship Payout');
    expect(dests?.[0].label).toContain('1st');
  });
});
