import { describe, expect, it } from 'vitest';

import type { EventComplete } from '../../../src/types/event';
import type { UserEventFormatTemplateRead } from '../../../src/types/eventFormatTemplate';
import type { RoundRelationshipRead } from '../../../src/types/roundRelationship';
import {
  findMatchingFormatTemplateId,
  resolveAppliedFormatTemplateId,
  resolveAppliedStructureFormatLabel,
  summarizeEventRoundStructure,
} from '../../../src/utils/eventAppliedFormatDisplay';

const baseEvent = (overrides: Partial<EventComplete> = {}): EventComplete =>
  ({
    id: 1,
    name: 'Test',
    tournament_id: 1,
    start_date: '2026-01-01T10:00:00',
    end_date: '2026-01-01T18:00:00',
    event_format: 'singles',
    rounds: [],
    final_nodes: [],
    tournament: { id: 1, name: 'T' } as EventComplete['tournament'],
    ...overrides,
  }) as EventComplete;

const template = (
  partial: Partial<UserEventFormatTemplateRead> & Pick<UserEventFormatTemplateRead, 'id' | 'name'>
): UserEventFormatTemplateRead => ({
  user_id: 1,
  event_format_scope: 'both',
  payload: {},
  is_favorite: false,
  is_default: false,
  is_system: false,
  ...partial,
});

describe('eventAppliedFormatDisplay', () => {
  it('summarizes round friendly names in order', () => {
    const label = summarizeEventRoundStructure(
      baseEvent({
        rounds: [
          {
            id: 2,
            round_number: 2,
            friendly_name: 'Bracket',
            competition_method: 'bracket',
            game_count: 1,
            number_of_squads: 1,
          },
          {
            id: 1,
            round_number: 1,
            friendly_name: 'Qualifying',
            competition_method: 'eliminator',
            game_count: 3,
            number_of_squads: 2,
          },
        ] as EventComplete['rounds'],
      })
    );
    expect(label).toBe('Qualifying → Bracket');
  });

  it('uses qualifier for an unnamed eliminator round that leads to another round', () => {
    const event = baseEvent({
      rounds: [
        {
          id: 1,
          round_number: 1,
          competition_method: 'eliminator',
          game_count: 3,
          number_of_squads: 1,
        },
        {
          id: 2,
          round_number: 2,
          competition_method: 'eliminator',
          game_count: 3,
          number_of_squads: 1,
        },
      ] as EventComplete['rounds'],
    });
    const relationships = [
      { source_round_id: 1, target_round_id: 2 },
    ] as RoundRelationshipRead[];

    expect(summarizeEventRoundStructure(event, relationships)).toBe(
      'Qualifier → Eliminator'
    );
  });

  it('resolves label from selected template id', () => {
    const templates = [
      template({
        id: 5,
        name: 'Standard Stepladder',
        payload: { rounds: [], final_nodes: [] },
      }),
    ];
    expect(
      resolveAppliedStructureFormatLabel({
        event: baseEvent(),
        templates,
        selectedTemplateId: 5,
      })
    ).toBe('Standard Stepladder');
  });

  it('matches template by structural signature', () => {
    const payload = {
      version: 2,
      rounds: [
        {
          ref: 'q',
          round_number: 1,
          game_count: 3,
          number_of_squads: 1,
          competition_method: 'eliminator',
          squads: [{ name: 'Squad 1', max_participants: 24 }],
        },
      ],
      relationships: [],
      final_nodes: [],
    };
    const templates = [
      template({ id: 9, name: 'My Qualifier', payload }),
      template({ id: 10, name: 'Other', payload: { rounds: [], final_nodes: [] } }),
    ];
    const event = baseEvent({
      rounds: [
        {
          id: 100,
          round_number: 1,
          game_count: 3,
          number_of_squads: 1,
          competition_method: 'eliminator',
          friendly_name: 'Q',
        },
      ] as EventComplete['rounds'],
    });
    expect(findMatchingFormatTemplateId(event, templates)).toBe(9);
    expect(
      resolveAppliedStructureFormatLabel({
        event,
        templates,
        selectedTemplateId: null,
      })
    ).toBe('My Qualifier');
  });

  it('resolveAppliedFormatTemplateId prefers explicit selection', () => {
    const templates = [template({ id: 3, name: 'A', payload: {} })];
    expect(
      resolveAppliedFormatTemplateId({
        event: baseEvent(),
        templates,
        selectedTemplateId: 3,
        persistedTemplateId: 99,
      })
    ).toBe(3);
  });
});
