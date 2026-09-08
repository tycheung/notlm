import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SideActionsAPI } from '@/api/side-actions';
import EliminatorStandingsModal from '@/components/side_actions/EliminatorStandingsModal';
import { SideActionStatus } from '@/types/side_action';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const projection = {
  entry_count: 3,
  game_numbers: [2, 3],
  drop_mode: 'flat' as const,
  drop_amount: 1,
  round_mode: null,
  steps: [
    {
      game_number: 2,
      role: 'cut' as const,
      starting_alive: 3,
      dropped: 1,
      surviving: 2,
    },
    {
      game_number: 3,
      role: 'payout' as const,
      starting_alive: 2,
      dropped: 0,
      surviving: 2,
    },
  ],
  final_alive: 2,
  payout_game: 3,
  zero_at_final: false,
  emptied_before_final: false,
  has_warning: false,
};

const standings = (poolId?: number) => {
  const isAfternoon = poolId === 12;
  const squadName = isAfternoon ? 'Squad B' : 'Squad A';
  const displayName = isAfternoon ? 'Afternoon Survivor' : 'Morning Survivor';
  return {
    report_type: 'eliminator_standings',
    side_action_id: 9,
    side_action_name: 'Eliminator',
    event_id: 3,
    handicap_mode: 'scratch' as const,
    game_numbers: isAfternoon ? [2, 3] : [1, 2, 3],
    drop_mode: isAfternoon ? ('flat' as const) : ('percentage' as const),
    drop_amount: isAfternoon ? 1 : 50,
    round_mode: isAfternoon ? null : ('down' as const),
    projection,
    warning: null,
    fund: {
      entry_count: 3,
      entry_fee: isAfternoon ? 9 : 8,
      collected: isAfternoon ? 27 : 24,
      expenses: 0,
      prize_fund: isAfternoon ? 27 : 24,
      places_sum: 20,
      payout_ready: true,
      overcommitted: false,
    },
    pool_funds: [],
    pools: [
      {
        pool_id: isAfternoon ? 12 : 11,
        squad_id: isAfternoon ? 2 : 1,
        squad_name: squadName,
        game_numbers: isAfternoon ? [2, 3] : [1, 2, 3],
        projection,
        warning: null,
        fund: {
          pool_id: isAfternoon ? 12 : 11,
          squad_id: isAfternoon ? 2 : 1,
          entry_count: 3,
          entry_fee: isAfternoon ? 9 : 8,
          collected: isAfternoon ? 27 : 24,
          expenses: 0,
          prize_fund: isAfternoon ? 27 : 24,
          places_sum: 20,
          payout_ready: true,
          overcommitted: false,
        },
        rounds: [
          {
            game_number: isAfternoon ? 2 : 1,
            role: 'cut' as const,
            label: `${squadName} cut`,
            starting_alive: 3,
            dropped: 1,
            surviving: 2,
            rows: [
              {
                user_id: isAfternoon ? 2 : 1,
                display_name: displayName,
                squad_id: isAfternoon ? 2 : 1,
                squad_name: squadName,
                score: 245,
                rank: 1,
                status: 'alive' as const,
                payout: 0,
                provisional_payout: 0,
                place: null,
              },
            ],
          },
        ],
        final_alive: 2,
        payout_game: 3,
        is_complete: true,
      },
    ],
    rounds: [],
    final_alive: 2,
    payout_game: 3,
  };
};

describe('EliminatorStandingsModal', () => {
  beforeEach(() => {
    vi.spyOn(SideActionsAPI, 'getSideActionPools').mockResolvedValue([
      {
        id: 11,
        side_action_id: 9,
        squad_id: 1,
        squad_name: 'Squad A',
        is_enabled: true,
        status: SideActionStatus.IN_PROGRESS,
        override_config: {},
        game_numbers: [1, 2, 3],
        entry_fee: 8,
      },
      {
        id: 12,
        side_action_id: 9,
        squad_id: 2,
        squad_name: 'Squad B',
        is_enabled: true,
        status: SideActionStatus.IN_PROGRESS,
        override_config: {
          game_numbers: [2, 3],
          entry_fee: 9,
          type_config: { drop_mode: 'flat', drop_amount: 1 },
        },
        game_numbers: [2, 3],
        entry_fee: 9,
      },
    ]);
    vi.spyOn(SideActionsAPI, 'getEliminatorStandings').mockImplementation(
      async (_id, params) => standings(params?.pool_id)
    );
  });

  it('shows only the selected pool with its effective games and drop rule', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <EliminatorStandingsModal
          isOpen
          onClose={vi.fn()}
          sideActionId={9}
          sideActionName="Eliminator"
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Morning Survivor')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Squad B' }));

    expect(await screen.findByText('Afternoon Survivor')).toBeInTheDocument();
    expect(screen.getByText(/Games 2, 3 · Drop 1 flat/)).toBeInTheDocument();
    expect(screen.getByText(/Collected \$27\.00/)).toBeInTheDocument();
    expect(screen.queryByText('Morning Survivor')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(SideActionsAPI.getEliminatorStandings).toHaveBeenCalledWith(9, {
        pool_id: 12,
      });
    });
  });
});
