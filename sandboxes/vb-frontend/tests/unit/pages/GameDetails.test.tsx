import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GameDetails from '../../../src/pages/games/GameDetails';

const verifyGame = vi.fn().mockResolvedValue({ id: 9, verified: true, status: 'verified' });
const rejectGame = vi.fn().mockResolvedValue({ success: true });
const getGameWithFrames = vi.fn().mockResolvedValue({
  id: 9,
  game_number: 1,
  user_id: 5,
  event_participant_id: 1,
  score: 212,
  handicap: 18,
  verified: false,
  status: 'completed',
  is_complete: true,
  is_shell: false,
  created_at: '2026-01-01T00:00:00',
  frames: [
    {
      frame: 1,
      first_ball: 'X',
      second_ball: null,
      is_strike: true,
      is_spare: false,
    },
  ],
  user_name: 'Test Bowler',
});

vi.mock('../../../src/api/games', () => ({
  GamesAPI: {
    getGameWithFrames: (...args: unknown[]) => getGameWithFrames(...args),
    verifyGame: (...args: unknown[]) => verifyGame(...args),
    rejectGame: (...args: unknown[]) => rejectGame(...args),
  },
}));

vi.mock('../../../src/api/rounds', () => ({
  RoundsAPI: { getRoundWithEvent: vi.fn() },
}));

vi.mock('../../../src/api/squads', () => ({
  SquadsAPI: { getSquadWithEvent: vi.fn() },
}));

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 42, role: 'tournament_director' } }),
}));

vi.mock('../../../src/utils/roleBasedRouting', () => ({
  useRoleAwareNavigation: () => ({
    getRoleAwarePath: (p: string) => p,
    getTournamentPath: (id: number) => `/tournaments/${id}`,
    getEventPath: (id: number) => `/events/${id}`,
    getRoundPath: (id: number) => `/rounds/${id}`,
    getSquadPath: (id: number) => `/squads/${id}`,
  }),
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/games/9']}>
        <Routes>
          <Route path="/games/:id" element={<GameDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('GameDetails', () => {
  beforeEach(() => {
    verifyGame.mockClear();
    rejectGame.mockClear();
    getGameWithFrames.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders typed status and frame rows without any-casts', async () => {
    renderPage();

    expect(await screen.findAllByText(/Test Bowler/)).toHaveLength(2);
    expect(screen.getAllByText(/Game #1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(
      screen.queryByText(/No frame-by-frame data available/i)
    ).not.toBeInTheDocument();
  });

  it('lets a TD verify a scored game', async () => {
    renderPage();

    const verifyButton = await screen.findByRole('button', { name: /Verify score/i });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(verifyGame).toHaveBeenCalledWith(9, 42);
    });
    await waitFor(() => {
      expect(verifyButton).not.toHaveAttribute('disabled');
    });
  });

  it('lets a TD reject a scored game with a reason', async () => {
    renderPage();

    expect(await screen.findAllByText(/Test Bowler/)).toHaveLength(2);
    const rejectLabel = await screen.findByText('Reject score');
    fireEvent.click(rejectLabel.closest('button') ?? rejectLabel);
    fireEvent.change(await screen.findByLabelText(/Rejection reason/i), {
      target: { value: 'Pinfall mismatch' },
    });
    fireEvent.click(screen.getByText('Confirm reject').closest('button')!);

    await waitFor(() => {
      expect(rejectGame).toHaveBeenCalledWith(9, 'Pinfall mismatch', {
        synchronous: true,
      });
    });
  });
});
