import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SideActionsAPI } from '@/api/side-actions';
import HighGameStandingsModal from '@/components/side_actions/HighGameStandingsModal';
import { SideActionStatus } from '@/types/side_action';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const standings = (name: string, poolId?: number) => ({
  report_type: 'high_game_standings',
  side_action_id: 7,
  side_action_name: 'High Game',
  event_id: 3,
  payout_mode: 'per_game' as const,
  handicap_mode: 'scratch' as const,
  game_numbers: [1, 4, 5],
  fund: {
    entry_count: poolId ? 2 : 4,
    entry_fee: 10,
    collected: poolId ? 20 : 40,
    expenses: 0,
    prize_fund: poolId ? 20 : 40,
    places_sum: poolId ? 5 : 10,
    places_sum_all_games: poolId ? 15 : 30,
    payout_ready: true,
    overcommitted: false,
  },
  pool_funds: [],
  pools: [
    {
      pool_id: poolId ?? 10,
      squad_id: poolId ?? 1,
      squad_name: name,
      division: 'open',
      game_number: 1,
      label: `${name} · Game 1`,
      entry_count: 2,
      is_complete: true,
      game_numbers: poolId ? [2, 6] : [1, 4, 5],
      scoring_mode: poolId ? ('combined' as const) : ('per_game' as const),
      rows: [
        {
          user_id: 1,
          display_name: `${name} Winner`,
          game_number: 1,
          score: 250,
          place: 1,
          payout: 5,
          provisional_payout: 0,
          is_complete: true,
        },
      ],
    },
  ],
});

describe('HighGameStandingsModal', () => {
  beforeEach(() => {
    vi.spyOn(SideActionsAPI, 'getSideActionPools').mockResolvedValue([
      {
        id: 10,
        side_action_id: 7,
        squad_id: 1,
        squad_name: 'Squad A',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [2, 6],
      },
      {
        id: 11,
        side_action_id: 7,
        squad_id: 2,
        squad_name: 'Squad B',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [1, 4, 5],
      },
    ]);
    vi.spyOn(SideActionsAPI, 'getHighGameStandings').mockImplementation(
      async (_id, params) =>
        params?.pool_id === 11
          ? standings('Squad B', 11)
          : standings('All squads')
    );
  });

  it('loads an isolated standings query for the selected squad pool', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <HighGameStandingsModal
          isOpen
          onClose={vi.fn()}
          sideActionId={7}
          sideActionName="High Game"
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText('All squads Winner')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Squad B' }));

    expect(await screen.findByText('Squad B Winner')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Combined list · Games 2, 6/).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Collected \$20\.00/)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Game' })).toBeInTheDocument();
    await waitFor(() => {
      expect(SideActionsAPI.getHighGameStandings).toHaveBeenCalledWith(7, {
        pool_id: 11,
      });
    });
  });

  it('labels the name column Team when the pot is a team unit', async () => {
    vi.spyOn(SideActionsAPI, 'getHighGameStandings').mockResolvedValue({
      ...standings('Squad A', 10),
      entry_unit: 'team',
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <HighGameStandingsModal
          isOpen
          onClose={vi.fn()}
          sideActionId={7}
          sideActionName="Team High Game"
        />
      </QueryClientProvider>
    );
    expect(await screen.findByRole('columnheader', { name: 'Team' })).toBeInTheDocument();
  });
});
