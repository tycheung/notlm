import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import HighGameConfigForm from '@/components/side_actions/HighGameConfigForm';

afterEach(cleanup);

describe('HighGameConfigForm', () => {
  it('preserves non-consecutive selected games', async () => {
    const onChange = vi.fn();
    render(
      <HighGameConfigForm
        config={{
          handicap_mode: 'scratch',
          game_numbers: [1],
          payout_mode: 'per_game',
        }}
        eventGameCount={5}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Game 4'));
    fireEvent.click(screen.getByLabelText('Game 5'));

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ game_numbers: [1, 4, 5] })
      );
    });
    expect(screen.getByText('Stage order: 1, 4, 5')).toBeInTheDocument();
  });
});
