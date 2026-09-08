import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EliminatorConfigForm from '@/components/side_actions/EliminatorConfigForm';

afterEach(cleanup);

describe('EliminatorConfigForm', () => {
  it('configures non-consecutive ordered stage games', async () => {
    const onChange = vi.fn();
    render(
      <EliminatorConfigForm
        config={{
          handicap_mode: 'scratch',
          game_numbers: [1],
          drop_mode: 'flat',
          drop_amount: 1,
        }}
        eventGameCount={5}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Game 4'));
    fireEvent.click(screen.getByLabelText('Game 5'));

    expect(screen.getByText(/Stage order: 1, 4, 5/)).toBeInTheDocument();
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          game_numbers: [1, 4, 5],
        })
      );
    });
  });

  it('opens varied cut schedule editor', async () => {
    const onChange = vi.fn();
    render(
      <EliminatorConfigForm
        config={{
          handicap_mode: 'scratch',
          game_numbers: [1, 2, 3],
          drop_mode: 'flat',
          drop_amount: 2,
          drop_schedule: 'uniform',
        }}
        eventGameCount={5}
        entryCount={20}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText(/Varied by game/i));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          drop_schedule: 'varied',
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Edit cut schedule/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Drop for game 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Drop for game 2')).toBeInTheDocument();
    expect(screen.queryByLabelText('Drop for game 3')).not.toBeInTheDocument();
  });
});
