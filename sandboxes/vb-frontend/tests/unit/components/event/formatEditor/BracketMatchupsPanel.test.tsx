import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BracketMatchupsPanel from '@/components/event/formatEditor/BracketMatchupsPanel';
import { AdvancementMethod } from '@/types/roundRelationship';

vi.mock('@/api/round-match-series', () => ({
  RoundMatchSeriesAPI: {
    list: vi.fn().mockResolvedValue({
      round_id: 15,
      match_series: [
        {
          id: 1,
          round_id: 15,
          event_id: 6,
          race_to_wins: 1,
          max_games: 1,
          status: 'pending',
          wins_side_0: 0,
          wins_side_1: 0,
          winner_side: null,
          display_order: 0,
          bracket_template: 'single_elim',
          match_label: null,
          bracket_round: 0,
          bracket_slot: 0,
          bracket_segment: 'winner',
          participants: [
            { side: 0, seed_order: 1, event_participant_id: null, team_id: 1 },
            { side: 1, seed_order: 2, event_participant_id: null, team_id: 2 },
          ],
        },
      ],
    }),
    getStructureReadiness: vi.fn().mockResolvedValue({
      ready: true,
      code: 'ok',
      message: '',
      is_initial_round: false,
      roster_units: 16,
      roster_capacity: 16,
      incomplete_source_rounds: [],
    }),
    syncMatchStructure: vi.fn(),
  },
}));

vi.mock('@/api/rounds', () => ({
  RoundsAPI: {
    getRoundParticipants: vi.fn().mockResolvedValue([]),
    updateRound: vi.fn(),
    getEventRounds: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/api/teams', () => ({
  TeamsAPI: {
    getEventTeams: vi.fn().mockResolvedValue([]),
  },
}));

describe('BracketMatchupsPanel', () => {
  it('renders matchups controls without crashing', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <BracketMatchupsPanel
          eventId={6}
          isTeamEvent
          round={
            {
              id: 15,
              round_number: 2,
              friendly_name: 'Match Play Finals',
              competition_method: AdvancementMethod.BRACKET,
              competition_method_config: {
                seed_mode: 'by_seed',
                bracket_mode: 'single_elimination',
                game_style: 'baker',
              },
              format_id: 5,
            } as any
          }
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/matchups/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /view bracket/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print bracket/i })).toBeInTheDocument();
  });
});
