import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import HighSetConfigForm from '@/components/side_actions/HighSetConfigForm';

afterEach(cleanup);

describe('HighSetConfigForm', () => {
  it('configures non-consecutive best-N scoring', async () => {
    const onChange = vi.fn();
    render(
      <HighSetConfigForm
        config={{
          handicap_mode: 'scratch',
          game_numbers: [1],
          series_mode: 'sum',
        }}
        eventGameCount={5}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Game 4'));
    fireEvent.click(screen.getByLabelText('Game 5'));
    fireEvent.click(screen.getByLabelText('Use the best N selected games'));
    fireEvent.change(screen.getByLabelText('Best games counted'), {
      target: { value: '2' },
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          game_numbers: [1, 4, 5],
          series_mode: 'best_n',
          best_n: 2,
        })
      );
    });
  });
});
