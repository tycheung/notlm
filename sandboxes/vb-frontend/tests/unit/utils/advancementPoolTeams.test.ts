import { describe, expect, it } from 'vitest';

import { buildPoolTeamsForRound } from '@/utils/advancementPoolTeams';

describe('buildPoolTeamsForRound', () => {
  const teams = [
    {
      id: 10,
      team_number: 1,
      team_name: 'Alpha',
      display_name: 'Team Alpha',
      members: [{ user_id: 100, event_participant_id: 1000 }],
    },
    {
      id: 11,
      team_number: 2,
      team_name: 'Beta',
      display_name: 'Team Beta',
      members: [{ user_id: 101, event_participant_id: 1001 }],
    },
  ] as any[];

  it('falls back to pool relationship ids when incoming relationships are stale', () => {
    const poolRows = [
      {
        id: 1,
        event_participant_id: 1000,
        user_id: 100,
        target_round_id: 55,
        advancement_relationship_id: 700,
        advancement_position: 1,
      },
      {
        id: 2,
        event_participant_id: 1001,
        user_id: 101,
        target_round_id: 55,
        advancement_relationship_id: 700,
        advancement_position: 2,
      },
    ];

    const result = buildPoolTeamsForRound(poolRows, teams, 55, []);
    expect(result.map((row) => row.id)).toEqual([10, 11]);
  });

  it('keeps target-round filtering while allowing missing relationship hydration', () => {
    const poolRows = [
      {
        id: 1,
        event_participant_id: 1000,
        user_id: 100,
        target_round_id: 55,
        advancement_relationship_id: 700,
        advancement_position: 1,
      },
      {
        id: 3,
        event_participant_id: 1001,
        user_id: 101,
        target_round_id: 56,
        advancement_relationship_id: 700,
        advancement_position: 1,
      },
    ];

    const result = buildPoolTeamsForRound(poolRows, teams, 55, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(10);
  });
});
