import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import LaneBoardGrid from '@/components/event-lane/LaneBoardGrid';

const onApplyAssignments = vi.fn();

describe('LaneBoardGrid', () => {
  afterEach(cleanup);

  beforeEach(() => {
    onApplyAssignments.mockClear();
  });

  it('renders lane columns and unassigned zone', () => {
    render(
      <LaneBoardGrid
        lanes={[
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
        ]}
        unassigned={[
          {
            squad_participant_id: 2,
            squad_id: 10,
            event_participant_id: 101,
            display_name: 'Bob',
            assigned_lane: null,
          },
        ]}
        maxPerLane={1}
        onApplyAssignments={onApplyAssignments}
      />
    );

    expect(screen.getByText('Lane 1 (1-2)')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Unassigned')).toBeTruthy();
  });
});
