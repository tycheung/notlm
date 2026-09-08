import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SideActionsAPI } from '@/api/side-actions';
import HighSetStandingsModal from '@/components/side_actions/HighSetStandingsModal';
import { SideActionStatus } from '@/types/side_action';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const standings = (name: string, poolId?: number) => ({
  report_type: 'high_set_standings',
  side_action_id: 8,
  side_action_name: 'High Series',
  event_id: 3,
  handicap_mode: 'scratch' as const,
  series_mode: 'best_n' as const,
  best_n: 2,
  game_numbers: [1, 4, 5],
  fund: {
    entry_count: 2,
    entry_fee: 10,
    collected: 20,
    expenses: 0,
    prize_fund: 20,
    places_sum: 5,
    places_sum_all_games: 5,
    payout_ready: false,
    overcommitted: false,
  },
  pool_funds: [],
  pools: [
    {
      pool_id: poolId ?? 10,
      squad_id: poolId ?? 1,
      squad_name: name,
      division: 'open',
      label: `${name} · Series`,
      entry_count: 2,
      is_complete: false,
      prize_fund: 20,
      places_sum: 5,
      series_mode: 'best_n' as const,
      best_n: 2,
      fund: {
        pool_id: poolId ?? 10,
        squad_id: poolId ?? 1,
        entry_count: 2,
        entry_fee: 10,
        collected: 20,
        expenses: 0,
        prize_fund: 20,
        places_sum: 5,
        places_sum_all_games: 5,
        payout_ready: false,
        overcommitted: false,
      },
      rows: [
        {
          user_id: 1,
          display_name: `${name} Leader`,
          score: 480,
          game_scores: { '1': 240, '4': 240, '5': null },
          place: 1,
          payout: 0,
          provisional_payout: 5,
          is_complete: false,
        },
      ],
    },
  ],
});

describe('HighSetStandingsModal', () => {
  beforeEach(() => {
    vi.spyOn(SideActionsAPI, 'getSideActionPools').mockResolvedValue([
      {
        id: 10,
        side_action_id: 8,
        squad_id: 1,
        squad_name: 'Squad A',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [1, 4, 5],
        entry_fee: 10,
      },
      {
        id: 11,
        side_action_id: 8,
        squad_id: 2,
        squad_name: 'Squad B',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {
          game_numbers: [2, 6],
          type_config: { series_mode: 'best_n', best_n: 2 },
        },
        game_numbers: [2, 6],
        entry_fee: 10,
      },
    ]);
    vi.spyOn(SideActionsAPI, 'getHighSetStandings').mockImplementation(
      async (_id, params) =>
        params?.pool_id === 11
          ? standings('Squad B', 11)
          : standings('All squads')
    );
  });

  it('shows best-N provisional results for one selected squad pool', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <HighSetStandingsModal
          isOpen
          onClose={vi.fn()}
          sideActionId={8}
          sideActionName="High Series"
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Varies by squad')).toBeInTheDocument();
    expect(screen.getByText('$5.00 provisional')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Squad B' }));

    expect(await screen.findByText('Squad B Leader')).toBeInTheDocument();
    expect(screen.getByText(/Best 2 selected games/)).toBeInTheDocument();
    expect(screen.getByText(/Collected \$20\.00/)).toBeInTheDocument();
    expect(screen.getAllByText(/Games 2, 6/).length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: 'G2' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'G6' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'G4' })).not.toBeInTheDocument();
    expect(screen.queryByText('All squads Leader')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(SideActionsAPI.getHighSetStandings).toHaveBeenCalledWith(8, {
        pool_id: 11,
      });
    });
  });
});
