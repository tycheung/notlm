import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SideActionsAPI } from '@/api/side-actions';
import SideActionReportsMenuModal from '@/components/side_actions/SideActionReportsMenuModal';
import {
  SideActionStatus,
  SideActionType,
  type SideActionPool,
} from '@/types/side_action';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const pools: SideActionPool[] = [
  {
    id: 10,
    side_action_id: 7,
    squad_id: 100,
    squad_name: 'Morning',
    is_enabled: true,
    status: SideActionStatus.REGISTRATION_OPEN,
    override_config: {},
    game_numbers: [1, 2, 3],
    entry_fee: 10,
  },
  {
    id: 20,
    side_action_id: 7,
    squad_id: 200,
    squad_name: 'Evening',
    is_enabled: true,
    status: SideActionStatus.REGISTRATION_OPEN,
    override_config: {},
    game_numbers: [4, 5, 6],
    entry_fee: 10,
  },
];

function renderMenu(sideActionType: SideActionType) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SideActionReportsMenuModal
        isOpen
        onClose={vi.fn()}
        sideActionId={7}
        sideActionName="Pool Pot"
        sideActionType={sideActionType}
        tournamentId={1}
        eventId={2}
      />
    </QueryClientProvider>
  );
}

function openReport(label: string) {
  const row = screen.getByText(label).closest('li');
  expect(row).not.toBeNull();
  fireEvent.click(within(row!).getByRole('button'));
}

describe('SideActionReportsMenuModal pool requirements', () => {
  it('keeps High Series Preview disabled through pool loading and until selection', async () => {
    let resolvePools!: (value: SideActionPool[]) => void;
    vi.spyOn(SideActionsAPI, 'getSideActionPools').mockReturnValue(
      new Promise((resolve) => {
        resolvePools = resolve;
      })
    );
    renderMenu(SideActionType.HIGH_SET);

    openReport('High Series Report');
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
    expect(screen.getByText('Loading squad pools…')).toBeInTheDocument();

    resolvePools(pools);
    expect(await screen.findByRole('button', { name: 'Evening' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Evening' }));
    expect(screen.getByRole('button', { name: 'Preview' })).toBeEnabled();
  });

  it('requires a pool for one Eliminator entry summary but not all eliminators', async () => {
    vi.spyOn(SideActionsAPI, 'getSideActionPools').mockResolvedValue(pools);
    renderMenu(SideActionType.ELIMINATOR);

    openReport('Eliminator Entry Summary');
    expect(await screen.findByRole('button', { name: 'Morning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();

    fireEvent.click(
      screen.getByRole('radio', { name: /All eliminators on this event/ })
    );
    await waitFor(() =>
      expect(screen.queryByText('Squad pool')).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Preview' })).toBeEnabled();
  });

  it('returns from preview to the same options with selections intact', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('about:blank');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(SideActionsAPI, 'getSideActionPools').mockResolvedValue(pools);
    vi.spyOn(SideActionsAPI, 'getPayoutReport').mockResolvedValue({
      report_type: 'payout',
      tournament_id: 1,
      tournament_name: 'Tournament',
      event_id: 2,
      event_name: 'Event',
      side_actions: [],
      rows: [],
    });
    renderMenu(SideActionType.BRACKET);

    openReport('Side Action Payout Report');
    const entered = screen.getByRole('checkbox', { name: /Entered/ });
    fireEvent.click(entered);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(await screen.findByText('Optional columns')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Entered/ })).not.toBeChecked();
  });
});
