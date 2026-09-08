import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import TournamentManagement from '@/pages/tournament_director/TournamentManagement';
import { Role, type UserRead } from '@/types/user';

const useAuthMock = vi.fn();
const getTournamentsMock = vi.fn();
const getMyTournamentsMock = vi.fn();
const getBowlingCentersMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/api/tournaments', () => ({
  TournamentsAPI: {
    getTournaments: (...args: unknown[]) => getTournamentsMock(...args),
    deleteTournament: vi.fn(),
  },
}));

vi.mock('@/api/directors', () => ({
  DirectorsAPI: {
    getMyTournaments: (...args: unknown[]) => getMyTournamentsMock(...args),
  },
}));

vi.mock('@/api/bowling-centers', () => ({
  BowlingCentersAPI: {
    getBowlingCenters: (...args: unknown[]) => getBowlingCentersMock(...args),
  },
}));

const tdUser: UserRead = {
  id: 1,
  first_name: 'Test',
  last_name: 'Director',
  email: 'td@example.com',
  role: Role.TD,
  created_at: '2026-01-01T00:00:00',
  is_active: true,
  is_verified: true,
  can_claim: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/director/tournaments']}>
        <TournamentManagement />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TournamentManagement shell', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders management heading and create action after data loads', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getMyTournamentsMock.mockResolvedValue([
      {
        id: 10,
        name: 'Spring Open',
        organizer_id: 1,
        organizer_name: 'Test Director',
        bowling_center_id: 2,
        is_active: true,
        start_date: '2026-07-01T00:00:00',
        end_date: '2026-07-03T00:00:00',
        lanes_reserved: 8,
      },
    ]);
    getBowlingCentersMock.mockResolvedValue([
      { id: 2, name: 'Victory Lanes', city: 'Columbus', state: 'OH' },
    ]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Tournament Management' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Tournament' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Spring Open')).toBeInTheDocument();
    });
    expect(screen.getByRole('columnheader', { name: 'TD' })).toBeInTheDocument();
    expect(screen.getAllByText('Test Director').length).toBeGreaterThan(0);
  });

  it('shows error alert when tournament fetch fails', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getMyTournamentsMock.mockRejectedValue(new Error('network'));
    getBowlingCentersMock.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText('Failed to load tournaments. Please log out and back in again.')
    ).toBeInTheDocument();
  });
});
