import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ParticipantLaneAssignCell from '@/components/event-lane/ParticipantLaneAssignCell';

const assignMutate = vi.fn();

vi.mock('@/features/lanes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/lanes')>();
  return {
    ...actual,
    useEventLaneBoard: vi.fn(() => ({
      isLoading: false,
      isError: false,
      data: {
        lanes_in_play: [1, 2, 3, 4],
        max_per_lane: 3,
        lanes: [
          {
            assignments: [
              {
                event_participant_id: 10,
                squad_participant_id: 100,
                squad_id: 1,
                display_name: 'Pat Lane',
                assigned_lane: 3,
                lane_slot: 1,
                lane_label: '3B',
              },
            ],
          },
        ],
        unassigned: [],
      },
    })),
    useAssignEventLane: vi.fn(() => ({
      isPending: false,
      mutate: assignMutate,
    })),
  };
});

function renderCell(props: Partial<React.ComponentProps<typeof ParticipantLaneAssignCell>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ParticipantLaneAssignCell
        eventId={1}
        eventParticipantId={10}
        canManageLanes
        {...props}
      />
    </QueryClientProvider>
  );
}

describe('ParticipantLaneAssignCell', () => {
  afterEach(cleanup);

  beforeEach(() => {
    assignMutate.mockClear();
  });

  it('renders read-only label when canManageLanes is false', () => {
    renderCell({ canManageLanes: false });
    expect(screen.getByText('3B')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('unassigns when empty option is selected', () => {
    renderCell();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(assignMutate).toHaveBeenCalledWith({
      squad_participant_id: 100,
      assigned_lane: null,
      lane_slot: null,
    });
  });

  it('sends lane_slot when max_per_lane > 1', () => {
    renderCell();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '3:2' } });
    expect(assignMutate).toHaveBeenCalledWith({
      squad_participant_id: 100,
      assigned_lane: 3,
      lane_slot: 2,
    });
  });
});
