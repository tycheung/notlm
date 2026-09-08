import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BracketConfigForm from '@/components/side_actions/BracketConfigForm';

afterEach(cleanup);

describe('BracketConfigForm', () => {
  it('emits non-consecutive bracket round games', async () => {
    const onChange = vi.fn();
    render(
      <BracketConfigForm
        config={{
          participant_count: 8,
          bye_handling: 'none',
          tiebreaker_method: 'both_advance',
          game_numbers: [1, 2, 3],
        }}
        eventGameCount={5}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Game 2'));
    fireEvent.click(screen.getByLabelText('Game 4'));

    expect(screen.getByText(/Stage order: 1, 3, 4/)).toBeInTheDocument();
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          game_numbers: [1, 3, 4],
          round_count: 3,
        })
      );
    });
  });
});
