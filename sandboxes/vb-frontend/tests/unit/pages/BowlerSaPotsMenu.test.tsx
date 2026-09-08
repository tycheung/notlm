import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import BowlerSaPotsMenu from '@/pages/dashboard/BowlerSaPotsMenu';

describe('BowlerSaPotsMenu', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens a pot breakdown when the amount is clicked', () => {
    render(
      <BowlerSaPotsMenu
        label="Side action"
        amountDisplay="$50.00"
        pots={[
          {
            side_action_id: 9,
            name: 'High Game',
            entries: 1,
            fees: 50,
            winnings: 25,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '$50.00' }));
    expect(screen.getByRole('dialog', { name: 'Side action pots' })).toBeInTheDocument();
    expect(screen.getByText('High Game')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
  });

  it('stays plain text when there are no pots', () => {
    render(
      <BowlerSaPotsMenu label="Side action" amountDisplay="—" pots={[]} disabled />
    );
    expect(screen.queryByRole('button', { name: '—' })).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
