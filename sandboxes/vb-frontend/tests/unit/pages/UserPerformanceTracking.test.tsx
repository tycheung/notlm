import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UserPerformanceTracking from '@/pages/user/UserPerformanceTracking';
import { Role, type UserRead } from '@/types/user';

const useAuthMock = vi.fn();
const getUserPerformanceMetricsMock = vi.fn();
const getUserBowledEventsMock = vi.fn();
const getUserTournamentsMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/api/users', () => ({
  UsersAPI: {
    getUserPerformanceMetrics: (...args: unknown[]) => getUserPerformanceMetricsMock(...args),
    getUserBowledEvents: (...args: unknown[]) => getUserBowledEventsMock(...args),
    getUserFinancialEvents: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/api/tournaments', () => ({
  TournamentsAPI: {
    getUserTournaments: (...args: unknown[]) => getUserTournamentsMock(...args),
  },
}));

const bowler: UserRead = {
  id: 3,
  first_name: 'John',
  last_name: 'Bowler',
  email: 'john@example.com',
  role: Role.BOWLER,
  created_at: '2026-01-01T00:00:00',
  is_active: true,
  is_verified: true,
  can_claim: false,
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UserPerformanceTracking />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Stats event history', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('offers Report on each bowled event', async () => {
    useAuthMock.mockReturnValue({ user: bowler });
    getUserPerformanceMetricsMock.mockResolvedValue({
      average_lifetime_score: null,
      average_90day_score: null,
      high_game: null,
      tournament_wins: 0,
      tournaments_participated: 1,
    });
    getUserBowledEventsMock.mockResolvedValue([
      {
        event_id: 21,
        event_name: 'Saturday Singles',
        tournament_id: 10,
        tournament_name: 'Spring Scratch',
        start_date: '2026-08-01T09:00:00',
        games: [{ game_number: 1, score: 180 }],
        place: 2,
        pinfall: 180,
        handicap: 12,
      },
    ]);
    getUserTournamentsMock.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Saturday Singles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saturday Singles' })).toHaveAttribute(
      'href',
      '/tournaments/10?tab=live&eventId=21'
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
