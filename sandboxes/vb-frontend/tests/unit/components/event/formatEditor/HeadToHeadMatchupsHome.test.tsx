import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HeadToHeadMatchupsHome from '@/components/event/formatEditor/HeadToHeadMatchupsHome';
import { AdvancementMethod } from '@/types/roundRelationship';

vi.mock('@/api/round-match-series', () => ({
  RoundMatchSeriesAPI: {
    list: vi.fn().mockResolvedValue({
      round_id: 1,
      match_series: [
        {
          id: 10,
          round_id: 1,
          event_id: 1,
          race_to_wins: 1,
          max_games: 1,
          status: 'pending',
          wins_side_0: 0,
          wins_side_1: 0,
          winner_side: null,
          display_order: 0,
          bracket_template: 'stepladder',
          match_label: 'Match 1',
          participants: [
            { side: 0, seed_order: 5, event_participant_id: null, team_id: null },
            { side: 1, seed_order: 4, event_participant_id: null, team_id: null },
          ],
        },
      ],
    }),
    getStructureReadiness: vi.fn().mockResolvedValue({
      ready: true,
      code: 'ok',
      message: '',
      is_initial_round: true,
      roster_units: 5,
      roster_capacity: null,
      incomplete_source_rounds: [],
    }),
    syncMatchStructure: vi.fn(),
    generateStepladder: vi.fn(),
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

describe('HeadToHeadMatchupsHome', () => {
  it('lists stepladder shells and shows generate control', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <HeadToHeadMatchupsHome
          eventId={1}
          isTeamEvent={false}
          round={
            {
              id: 1,
              competition_method: AdvancementMethod.STEPLADDER,
              competition_method_config: { series_decision_mode: 'games_total', game_count: 2 },
              format_id: 1,
            } as any
          }
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/stepladder matchups/i)).toBeInTheDocument();
    expect(await screen.findByText('Match 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate stepladder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sync structure/i })).toBeInTheDocument();
  });
});
