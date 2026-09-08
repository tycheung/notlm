import { describe, expect, it } from 'vitest';
import { buildParticipantOptions } from '../../../../../../src/components/event-scoring/visual/adapters/helpers';

describe('buildParticipantOptions', () => {
  it('maps participant identity kind from roster rows', () => {
    const options = buildParticipantOptions([
      { event_participant_id: 11, user_name: 'Alice', can_edit: true },
      { team_id: 7, display_name: 'Team Seven', can_edit: false },
    ]);

    expect(options).toHaveLength(2);
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 11,
          kind: 'participant',
          label: 'Alice',
        }),
        expect.objectContaining({
          id: 7,
          kind: 'team',
          label: 'Team Seven',
        }),
      ])
    );
  });

  it('prefers team aggregate name over individual member rows sharing team_id', () => {
    const options = buildParticipantOptions([
      {
        event_participant_id: 112,
        team_id: 3,
        user_name: 'Hawley Test4',
        display_name: 'Hawley Test4',
        team_name: null,
      },
      {
        event_participant_id: 109,
        team_id: 3,
        user_name: 'Hunter Hawley',
        display_name: 'Hunter Hawley',
        team_name: null,
      },
      {
        team_id: 3,
        team_name: 'Team Hawley',
        display_name: 'Team Hawley',
        team_members: [
          { event_participant_id: 109, display_name: 'Hunter Hawley' },
          { event_participant_id: 112, display_name: 'Hawley Test4' },
        ],
      },
    ]);

    expect(options).toHaveLength(1);
    expect(options[0]).toEqual(
      expect.objectContaining({
        id: 3,
        kind: 'team',
        label: 'Team Hawley',
      })
    );
    expect(options[0].teamMembers).toHaveLength(2);
  });
});
