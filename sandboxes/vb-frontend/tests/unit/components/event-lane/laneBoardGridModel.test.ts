import { describe, expect, it } from 'vitest';
import {
  buildDropAssignments,
  buildLaneGridColumns,
} from '@/components/event-lane/laneBoardGridModel';

describe('laneBoardGridModel', () => {
  const lanes = [
    {
      lane: 1,
      pair_low: 1,
      pair_high: 2,
      pair_label: '1-2',
      assignments: [
        {
          squad_participant_id: 1,
          squad_id: 10,
          event_participant_id: 100,
          display_name: 'Alice',
          assigned_lane: 1,
        },
      ],
      occupancy: 1,
      capacity: 1,
      over_capacity: false,
    },
    {
      lane: 3,
      pair_low: 3,
      pair_high: 4,
      pair_label: '3-4',
      assignments: [
        {
          squad_participant_id: 2,
          squad_id: 10,
          event_participant_id: 101,
          display_name: 'Bob',
          assigned_lane: 3,
        },
      ],
      occupancy: 1,
      capacity: 1,
      over_capacity: false,
    },
  ] as const;

  it('builds columns from board payload', () => {
    const grid = buildLaneGridColumns([...lanes], []);
    expect(grid.columns).toHaveLength(2);
    expect(grid.columns[0].chips[0].display_name).toBe('Alice');
  });

  it('swaps bowlers when dropping onto an occupied single-lane column', () => {
    const grid = buildLaneGridColumns([...lanes], []);
    const assignments = buildDropAssignments(1, 3, grid.columns, grid.unassigned, 1);
    expect(assignments).toEqual([
      { squad_participant_id: 1, assigned_lane: 3, lane_slot: null },
      { squad_participant_id: 2, assigned_lane: 1, lane_slot: null },
    ]);
  });

  it('unassigns when target lane is null', () => {
    const grid = buildLaneGridColumns([...lanes], []);
    const assignments = buildDropAssignments(1, null, grid.columns, grid.unassigned, 1);
    expect(assignments).toEqual([
      { squad_participant_id: 1, assigned_lane: null, lane_slot: null },
    ]);
  });

});
