import { describe, expect, it } from 'vitest';

import type {
  RosterSideActionColumn,
  RosterSideActionPoolColumn,
  RosterSideActionSignupRow,
} from '@/api/side-actions';
import { eligibleBracketSetsForSquad } from '@/components/event/RosterRolloverControl';

function column(
  id: number,
  entryUnit: 'bowler' | 'team',
  squadId = 1
): RosterSideActionColumn {
  return {
    side_action_id: id,
    name: `Set ${id}`,
    side_action_type: 'bracket',
    entry_fee: 5,
    input_type: 'number',
    max_entries_per_user: 20,
    entry_unit: entryUnit,
    pools: [
      {
        pool_id: id * 10,
        squad_id: squadId,
        squad_name: 'Squad A',
      } as RosterSideActionPoolColumn,
    ],
  };
}

describe('eligibleBracketSetsForSquad', () => {
  const teamA = column(1, 'team');
  const teamB = column(2, 'team');
  const bowlerA = column(3, 'bowler');
  const bowlerB = column(4, 'bowler');

  it('returns bowler bracket sets for a squad', () => {
    const eligible = eligibleBracketSetsForSquad(
      [teamA, teamB, bowlerA, bowlerB],
      1,
      undefined,
      'bowler'
    );
    expect(eligible.map((col) => col.side_action_id)).toEqual([3, 4]);
  });

  it('excludes bracket sets the bowler is not eligible for', () => {
    const open = column(5, 'bowler');
    const senior = column(6, 'bowler');
    const row = {
      user_id: 1,
      participant_id: 1,
      name: 'Test Bowler',
      signups: {
        '5': {
          quantity: 8,
          entry_ids: [],
          pools: [{ pool_id: 50, squad_id: 1, squad_name: 'Squad A', is_eligible: true }],
        },
        '6': {
          quantity: 0,
          entry_ids: [],
          pools: [{ pool_id: 60, squad_id: 1, squad_name: 'Squad A', is_eligible: false }],
        },
      },
      total_owed: 0,
      total_paid: 0,
    } as RosterSideActionSignupRow;

    const eligible = eligibleBracketSetsForSquad([open, senior], 1, row, 'bowler');
    expect(eligible.map((col) => col.side_action_id)).toEqual([5]);
  });
});
