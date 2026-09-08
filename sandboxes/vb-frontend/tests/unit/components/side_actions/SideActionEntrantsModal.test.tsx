import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SideActionEntrantsModal from '@/components/side_actions/SideActionEntrantsModal';

afterEach(cleanup);

describe('SideActionEntrantsModal', () => {
  it('groups entrant tickets by squad and filters a squad tab', () => {
    render(
      <SideActionEntrantsModal
        isOpen
        onClose={vi.fn()}
        sideActionName="Bracket Pot"
        entrants={[
          {
            user_id: 1,
            display_name: 'Pat Bowler',
            entry_count: 3,
            pools: [
              {
                pool_id: 10,
                squad_id: 100,
                squad_name: 'Squad A',
                entry_count: 2,
              },
              {
                pool_id: 20,
                squad_id: 200,
                squad_name: 'Squad B',
                entry_count: 1,
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('Squad A', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('Squad B', { selector: 'td' })).toBeInTheDocument();
    const allTab = screen.getByRole('tab', { name: 'All squads' });
    const squadATab = screen.getByRole('tab', { name: 'Squad A' });
    expect(allTab).toHaveAttribute('aria-controls');
    expect(allTab).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(allTab, { key: 'ArrowRight' });
    expect(squadATab).toHaveFocus();
    expect(squadATab).toHaveAttribute('aria-selected', 'true');
    expect(squadATab).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', squadATab.id);
    fireEvent.click(screen.getByRole('tab', { name: 'Squad B' }));
    expect(
      screen.queryByText('Squad A', { selector: 'td' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Squad B', { selector: 'td' })).toBeInTheDocument();
  });

  it('does not leak a legacy fallback entrant into another pool tab', () => {
    render(
      <SideActionEntrantsModal
        isOpen
        onClose={vi.fn()}
        sideActionName="Bracket Pot"
        entrants={[
          {
            user_id: 1,
            display_name: 'Pool Bowler',
            entry_count: 1,
            pools: [
              { pool_id: 10, squad_id: 100, squad_name: 'Squad A', entry_count: 1 },
              { pool_id: 20, squad_id: 200, squad_name: 'Squad B', entry_count: 0 },
            ],
          },
          {
            user_id: 2,
            display_name: 'Legacy Squad A',
            entry_count: 1,
            pool_id: 10,
            squad_name: 'Squad A',
            pools: [],
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Squad B' }));
    expect(screen.queryByText('Legacy Squad A')).not.toBeInTheDocument();
  });

  it('builds accessible pool tabs from legacy-only entrant metadata', () => {
    render(
      <SideActionEntrantsModal
        isOpen
        onClose={vi.fn()}
        sideActionName="Legacy Pot"
        entrants={[
          {
            user_id: 1,
            display_name: 'Morning Bowler',
            entry_count: 1,
            pool_id: 10,
            squad_id: 100,
            squad_name: 'Morning',
            pools: [],
          },
          {
            user_id: 2,
            display_name: 'Evening Bowler',
            entry_count: 2,
            pool_id: 20,
            squad_id: 200,
            squad_name: 'Evening',
            pools: [],
          },
        ]}
      />
    );

    const allTab = screen.getByRole('tab', { name: 'All squads' });
    fireEvent.keyDown(allTab, { key: 'End' });

    const morningTab = screen.getByRole('tab', { name: 'Morning' });
    expect(morningTab).toHaveFocus();
    expect(screen.getByText('Morning Bowler')).toBeInTheDocument();
    expect(screen.queryByText('Evening Bowler')).not.toBeInTheDocument();
  });
});
