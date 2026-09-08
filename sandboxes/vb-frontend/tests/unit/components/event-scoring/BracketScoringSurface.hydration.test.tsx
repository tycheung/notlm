import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BracketDiagramSurface from '../../../../src/components/match-play-diagram/surfaces/BracketDiagramSurface';
import type { FormatScoringSurfaceProps } from '../../../../src/components/event-scoring/types';

vi.mock('../../../../src/api/games', () => ({
  GamesAPI: {
    unifiedBatchGameOperation: vi.fn(async () => ({ created_games: [] })),
    batchTeamMemberScores: vi.fn(async () => ({ success: true })),
  },
}));

function buildProps(): FormatScoringSurfaceProps {
  return {
    method: 'bracket',
    isTeamEvent: false,
    squadCategories: [],
    gameCount: 1,
    incomingRelationships: [],
    advancementDestinationMap: new Map(),
    onGameScoreChange: vi.fn(),
    onTemporaryGameScoreChange: vi.fn(),
    pendingGameChanges: {},
    expandedCategories: {},
    onToggleCategory: vi.fn(),
    isLoadingSquadParticipants: false,
    loadingGames: false,
    getCurrentRoundGameCount: () => 1,
    getPendingGameValue: () => null,
    hasGamePendingChanges: () => false,
    getParticipantGames: () => [],
    getGameIdForParticipantAndGameNumber: () => null,
    getTeamGames: () => [],
    getTeamGameIdForTeamAndGameNumber: () => null,
    allGames: [
      {
        id: 101,
        event_participant_id: 10,
        is_team_game: false,
        match_series_id: 500,
        match_game_index: 1,
        score: 220,
      },
    ],
    squads: [],
    tabMode: 'vertical',
    teamScoringMode: 'individual',
    handicapEnabled: false,
    handicapBaseScore: 200,
    handicapPercentage: 90,
    selectedRoundId: 77,
    matchSeries: [
      {
        id: 500,
        round_id: 77,
        event_id: 1,
        race_to_wins: 1,
        max_games: 1,
        status: 'pending',
        wins_side_0: 0,
        wins_side_1: 0,
        winner_side: null,
        display_order: 0,
        bracket_template: 'single_elim',
        match_label: 'Final',
        bracket_round: 0,
        bracket_slot: 0,
        participants: [
          { side: 0, event_participant_id: 10, team_id: null },
          { side: 1, event_participant_id: 11, team_id: null },
        ],
      },
    ],
    isLoadingMatchSeries: false,
    roundParticipants: [
      { event_participant_id: 10, user_name: 'Alice' },
      { event_participant_id: 11, user_name: 'Bob' },
    ],
    bracketMode: 'single_elimination',
  };
}

describe('BracketDiagramSurface diagram hydration', () => {
  it('renders bracket columns and hydrates score from allGames', async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <BracketDiagramSurface {...buildProps()} />
      </QueryClientProvider>
    );

    expect(screen.getAllByText('Final').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    const scoreInputs = screen.getAllByDisplayValue('220');
    expect(scoreInputs.length).toBeGreaterThan(0);
  });

  it('does not crash when match series finish loading after the skeleton', () => {
    const client = new QueryClient();
    const loaded = buildProps();
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <BracketDiagramSurface {...loaded} isLoadingMatchSeries />
      </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={client}>
        <BracketDiagramSurface {...loaded} />
      </QueryClientProvider>
    );

    expect(screen.getAllByText('Final').length).toBeGreaterThan(0);
    expect(screen.queryByText(/failed to render/i)).toBeNull();
  });

  it('persists score via game_updates when shell exists', async () => {
    const { GamesAPI } = await import('../../../../src/api/games');
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <BracketDiagramSurface {...buildProps()} />
      </QueryClientProvider>
    );

    const scoreInput = screen.getAllByDisplayValue('220')[0];
    fireEvent.change(scoreInput, { target: { value: '225' } });
    fireEvent.blur(scoreInput);

    await waitFor(() => {
      expect(GamesAPI.unifiedBatchGameOperation).toHaveBeenCalled();
    });
  });
});
