import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PublicLiveRoundsList from '../../../src/components/tournament/PublicLiveRoundsList';
import type { RoundRead } from '../../../src/types/round';

vi.mock('../../../src/hooks/useRoundRealtimeStatuses', () => ({
  useRoundRealtimeStatuses: () => ({
    data: {
      1: { round_id: 1, status: 'NOT STARTED', all_scored: false },
      2: { round_id: 2, status: 'IN PROGRESS', all_scored: false },
      3: { round_id: 3, status: 'COMPLETE', all_scored: true },
    },
    isLoading: false,
  }),
}));

const rounds: RoundRead[] = [
  {
    id: 1,
    event_id: 10,
    round_number: 1,
    friendly_name: 'Qualifying',
    status: 'scheduled',
    game_count: 3,
    format_id: 1,
    tiebreaker_rule: 'manual',
  } as RoundRead,
  {
    id: 2,
    event_id: 10,
    round_number: 2,
    friendly_name: 'Match play',
    status: 'in_progress',
    game_count: 3,
    format_id: 1,
    tiebreaker_rule: 'manual',
  } as RoundRead,
  {
    id: 3,
    event_id: 10,
    round_number: 3,
    friendly_name: 'Finals',
    status: 'completed',
    game_count: 3,
    format_id: 1,
    tiebreaker_rule: 'manual',
  } as RoundRead,
];

describe('PublicLiveRoundsList', () => {
  it('lists rounds with status labels and opens scores on click', () => {
    const onRoundSelect = vi.fn();

    render(
      <PublicLiveRoundsList eventId={10} rounds={rounds} onRoundSelect={onRoundSelect} />
    );

    expect(screen.getByText('Qualifying')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Match play/i }));
    expect(onRoundSelect).toHaveBeenCalledWith(2);
  });
});
