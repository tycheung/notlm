import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ScoringSurfaceRouter from '@/components/event-scoring/ScoringSurfaceRouter';

afterEach(() => cleanup());

vi.mock('@/components/event-scoring/EliminatorScoringSurface', () => ({
  default: () => <div>score-sheet</div>,
}));
vi.mock('@/components/match-play-diagram/surfaces/BracketDiagramSurface', () => ({
  default: () => <div>bracket-diagram</div>,
}));
vi.mock('@/components/match-play-diagram/surfaces/StepladderDiagramSurface', () => ({
  default: () => <div>stepladder-diagram</div>,
}));
vi.mock('@/components/event-scoring/PodsPinfallScoringSurface', () => ({
  default: () => <div>pods-pinfall</div>,
}));
vi.mock('@/components/match-play-diagram/surfaces/RoundRobinDiagramSurface', () => ({
  default: () => <div>round-robin-diagram</div>,
}));
vi.mock('@/components/event-scoring/NonEliminatorErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const baseProps = {
  isTeamEvent: true,
  isBakerRound: true,
  squadCategories: [],
  gameCount: 1,
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
  allGames: [],
  squads: [],
  tabMode: 'vertical' as const,
  teamScoringMode: 'team' as const,
  handicapEnabled: false,
  handicapBaseScore: 200,
  handicapPercentage: 90,
  selectedRoundId: 15,
  matchSeries: [],
  isLoadingMatchSeries: false,
  roundParticipants: [],
};

describe('ScoringSurfaceRouter baker team surfaces', () => {
  it('scores baker team brackets on the match diagram so winners can advance', () => {
    render(<ScoringSurfaceRouter {...(baseProps as any)} method="bracket" />);
    expect(screen.getByText('bracket-diagram')).toBeInTheDocument();
    expect(screen.queryByText('score-sheet')).not.toBeInTheDocument();
  });

  it('keeps baker team league / qualifying on the team score sheet', () => {
    render(<ScoringSurfaceRouter {...(baseProps as any)} method="round_robin" />);
    expect(screen.getByText('score-sheet')).toBeInTheDocument();
  });

  it('scores all pods as simultaneous pinfall sheets grouped by pod', () => {
    render(<ScoringSurfaceRouter {...(baseProps as any)} method="pods" isBakerRound={false} />);
    expect(screen.getByText('pods-pinfall')).toBeInTheDocument();
  });

  it('keeps baker team pods on the pod pinfall sheet (not RR diagram)', () => {
    render(<ScoringSurfaceRouter {...(baseProps as any)} method="pods" />);
    expect(screen.getByText('pods-pinfall')).toBeInTheDocument();
    expect(screen.queryByText('score-sheet')).not.toBeInTheDocument();
  });

  it('scores baker team stepladder on the ladder diagram', () => {
    render(<ScoringSurfaceRouter {...(baseProps as any)} method="stepladder" />);
    expect(screen.getByText('stepladder-diagram')).toBeInTheDocument();
  });
});
