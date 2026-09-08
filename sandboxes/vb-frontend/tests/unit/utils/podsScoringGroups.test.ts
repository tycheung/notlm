import { describe, expect, it } from 'vitest';
import { buildPodsScoringCategories, buildPodsMembershipPreview } from '@/utils/podsScoringGroups';

describe('podsScoringGroups', () => {
  it('groups squad participants by pod membership seeds', () => {
    const categories = buildPodsScoringCategories({
      squadCategories: [
        {
          id: '9',
          name: 'Pods Squad',
          participants: [
            { id: 101, event_participant_id: 101, user_name: 'Amy' },
            { id: 102, event_participant_id: 102, user_name: 'Bob' },
            { id: 103, event_participant_id: 103, user_name: 'Cal' },
            { id: 104, event_participant_id: 104, user_name: 'Don' },
            { id: 105, event_participant_id: 105, user_name: 'Eve' },
          ],
        },
      ],
      roundParticipants: [
        { event_participant_id: 101, advancement_position: 1 },
        { event_participant_id: 102, advancement_position: 2 },
        { event_participant_id: 103, advancement_position: 3 },
        { event_participant_id: 104, advancement_position: 4 },
        { event_participant_id: 105, advancement_position: 5 },
      ],
      podMembership: [[1, 2, 3, 4, 5]],
      advanceBySize: { '5': 2 },
      isTeamEvent: false,
    });

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Pod 1');
    expect(categories[0].participants).toHaveLength(5);
    expect(categories[0].advanceCount).toBe(2);
    expect(categories[0].scoringSquadId).toBe(9);
    expect(categories[0].participants.map((p) => p.user_name)).toEqual([
      'Amy',
      'Bob',
      'Cal',
      'Don',
      'Eve',
    ]);
  });

  it('maps seeds from squad round_entry_number when standings are empty', () => {
    const categories = buildPodsScoringCategories({
      squadCategories: [
        {
          id: '9',
          name: 'Pods Squad',
          participants: [
            { event_participant_id: 201, user_name: 'Zed', round_entry_number: 3 },
            { event_participant_id: 202, user_name: 'Amy', round_entry_number: 1 },
            { event_participant_id: 203, user_name: 'Bob', round_entry_number: 2 },
          ],
        },
      ],
      roundParticipants: [],
      podMembership: [[1, 2], [3]],
      isTeamEvent: false,
    });

    expect(categories).toHaveLength(2);
    expect(categories[0].participants.map((p) => p.user_name)).toEqual(['Amy', 'Bob']);
    expect(categories[1].participants.map((p) => p.user_name)).toEqual(['Zed']);
  });

  it('buildPodsMembershipPreview preserves seed order and resolves names', () => {
    const preview = buildPodsMembershipPreview({
      squadParticipants: [
        { event_participant_id: 201, user_name: 'Zed', round_entry_number: 3 },
        { event_participant_id: 202, user_name: 'Amy', round_entry_number: 1 },
        { event_participant_id: 203, user_name: 'Bob', round_entry_number: 2 },
      ],
      roundParticipants: [],
      podMembership: [[1, 24], [3]],
      advanceBySize: { '2': 1 },
      isTeamEvent: false,
    });

    expect(preview).toHaveLength(2);
    expect(preview[0].members.map((m) => m.name)).toEqual(['Amy', '']);
    expect(preview[0].members[0].resolved).toBe(true);
    expect(preview[0].members[1].resolved).toBe(false);
    expect(preview[1].members.map((m) => m.name)).toEqual(['Zed']);
    expect(preview[0].advanceCount).toBe(1);
  });

  it('returns no categories when membership is missing', () => {
    const categories = buildPodsScoringCategories({
      squadCategories: [
        {
          id: '9',
          name: 'Pods Squad',
          participants: [{ event_participant_id: 201, user_name: 'Amy' }],
        },
      ],
      roundParticipants: [],
      podMembership: [],
      isTeamEvent: false,
    });
    expect(categories).toHaveLength(0);
  });
});
