import { describe, expect, it } from 'vitest';
import {
  flattenLaneBoardRows,
  sortLaneAssignmentRows,
  type EventLaneAssignmentRow,
} from '@/features/lanes/useEventLaneBoard';

describe('lane assignment roster sorting', () => {
  const rows: EventLaneAssignmentRow[] = [
    {
      event_participant_id: 1,
      squad_participant_id: 11,
      squad_id: 1,
      display_name: 'Charlie',
      assigned_lane: 3,
    },
    {
      event_participant_id: 2,
      squad_participant_id: 12,
      squad_id: 1,
      display_name: 'Alice',
      assigned_lane: null,
    },
    {
      event_participant_id: 3,
      squad_participant_id: 13,
      squad_id: 1,
      display_name: 'Bob',
      assigned_lane: 1,
    },
    {
      event_participant_id: 4,
      squad_participant_id: 14,
      squad_id: 1,
      display_name: 'Dana',
      assigned_lane: null,
    },
  ];

  it('sorts alphabetically by name', () => {
    expect(sortLaneAssignmentRows(rows, 'name').map((r) => r.display_name)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
      'Dana',
    ]);
  });

  it('sorts by name descending', () => {
    expect(sortLaneAssignmentRows(rows, 'name', 'desc').map((r) => r.display_name)).toEqual([
      'Dana',
      'Charlie',
      'Bob',
      'Alice',
    ]);
  });

  it('sorts by lane with unassigned last alphabetically', () => {
    expect(sortLaneAssignmentRows(rows, 'lane').map((r) => r.display_name)).toEqual([
      'Bob',
      'Charlie',
      'Alice',
      'Dana',
    ]);
  });

  it('sorts by lane descending with unassigned still last', () => {
    expect(sortLaneAssignmentRows(rows, 'lane', 'desc').map((r) => r.display_name)).toEqual([
      'Charlie',
      'Bob',
      'Alice',
      'Dana',
    ]);
  });

  it('sorts same lane by slot letter (1A, 1B, 1C)', () => {
    const sameLane: EventLaneAssignmentRow[] = [
      {
        event_participant_id: 1,
        squad_participant_id: 1,
        squad_id: 1,
        display_name: 'Williams',
        assigned_lane: 1,
        lane_slot: 2,
        lane_label: '1C',
      },
      {
        event_participant_id: 2,
        squad_participant_id: 2,
        squad_id: 1,
        display_name: 'Lowe',
        assigned_lane: 1,
        lane_slot: 1,
        lane_label: '1B',
      },
      {
        event_participant_id: 3,
        squad_participant_id: 3,
        squad_id: 1,
        display_name: 'Teeple',
        assigned_lane: 1,
        lane_slot: 0,
        lane_label: '1A',
      },
      {
        event_participant_id: 4,
        squad_participant_id: 4,
        squad_id: 1,
        display_name: 'Zed',
        assigned_lane: 2,
        lane_slot: 0,
        lane_label: '2A',
      },
    ];
    expect(sortLaneAssignmentRows(sameLane, 'lane').map((r) => r.lane_label)).toEqual([
      '1A',
      '1B',
      '1C',
      '2A',
    ]);
    expect(sortLaneAssignmentRows(sameLane, 'lane', 'desc').map((r) => r.lane_label)).toEqual([
      '2A',
      '1A',
      '1B',
      '1C',
    ]);
  });

  it('falls back to lane_label letter when lane_slot is missing', () => {
    const labeled: EventLaneAssignmentRow[] = [
      {
        event_participant_id: 1,
        squad_participant_id: 1,
        squad_id: 1,
        display_name: 'C',
        assigned_lane: 1,
        lane_label: '1C',
      },
      {
        event_participant_id: 2,
        squad_participant_id: 2,
        squad_id: 1,
        display_name: 'A',
        assigned_lane: 1,
        lane_label: '1A',
      },
    ];
    expect(sortLaneAssignmentRows(labeled, 'lane').map((r) => r.lane_label)).toEqual([
      '1A',
      '1C',
    ]);
  });

  it('flattens board lanes and unassigned', () => {
    const flat = flattenLaneBoardRows(
      [
        {
          assignments: [
            {
              squad_participant_id: 1,
              squad_id: 9,
              event_participant_id: 5,
              display_name: 'Eve',
              assigned_lane: 2,
            },
          ],
        },
      ],
      [
        {
          squad_participant_id: 2,
          squad_id: 9,
          event_participant_id: 6,
          display_name: 'Frank',
          assigned_lane: null,
        },
      ]
    );
    expect(flat).toHaveLength(2);
    expect(flat[0].display_name).toBe('Eve');
    expect(flat[1].display_name).toBe('Frank');
  });
});
