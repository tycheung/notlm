import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Dashboard from '@/pages/dashboard/Dashboard';
import { Role, type UserRead } from '@/types/user';

const useAuthMock = vi.fn();
const getUserMock = vi.fn();
const getUserHomeEventsMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/api/users', () => ({
  UsersAPI: {
    getUser: (...args: unknown[]) => getUserMock(...args),
    getUserHomeEvents: (...args: unknown[]) => getUserHomeEventsMock(...args),
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

function localDatePlus(days: number): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).toString().padStart(2, '0');
  return `${year}-${month}-${day}T09:00:00`;
}

function homeEvent(partial: Record<string, unknown>) {
  return {
    tournament_id: 10,
    tournament_name: 'Spring Scratch',
    start_date: localDatePlus(8),
    end_date: localDatePlus(9),
    registration_status: 'approved',
    squad_label: 'not assigned',
    squad_start: null,
    lane_label: 'not assigned',
    pair_label: 'not assigned',
    ...partial,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Bowler Dashboard shell', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows one upcoming row per event, including pending with not assigned lanes', async () => {
    useAuthMock.mockReturnValue({ user: bowler, isAuthenticated: true });
    getUserMock.mockResolvedValue(bowler);
    getUserHomeEventsMock.mockResolvedValue({
      in_progress: [],
      upcoming: [
        homeEvent({ id: 21, name: 'Saturday Singles' }),
        homeEvent({
          id: 22,
          name: 'Sunday Doubles',
          start_date: localDatePlus(9),
          end_date: localDatePlus(9),
        }),
        homeEvent({
          id: 24,
          name: 'Pending Scratch',
          start_date: localDatePlus(11),
          end_date: localDatePlus(11),
          registration_status: 'pending',
        }),
      ],
      completed: [
        homeEvent({
          id: 11,
          name: 'Winter Classic Singles',
          tournament_id: 11,
          tournament_name: 'Winter Classic',
          start_date: localDatePlus(-20),
          end_date: localDatePlus(-18),
        }),
      ],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'My Upcoming Tournaments' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Completed Tournaments' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Saturday Singles')).toBeInTheDocument();
    });
    expect(screen.getByText('Sunday Doubles')).toBeInTheDocument();
    expect(screen.getByText('Pending Scratch')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Winter Classic Singles')).toBeInTheDocument();
    expect(screen.queryByText('Catalog Open')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'In Progress' })).not.toBeInTheDocument();
    expect(screen.queryByText('Browse Tournaments')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Browse events' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Director dashboard' })).toBeInTheDocument();
    expect(screen.getAllByText('Lane: not assigned').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No Results').length).toBeGreaterThan(0);
  });

  it('shows in-progress assignment row and Live scores only after registration is accepted', async () => {
    useAuthMock.mockReturnValue({ user: bowler, isAuthenticated: true });
    getUserMock.mockResolvedValue(bowler);
    getUserHomeEventsMock.mockResolvedValue({
      in_progress: [
        homeEvent({
          id: 21,
          name: 'Saturday Singles',
          start_date: localDatePlus(0),
          end_date: localDatePlus(0),
          squad_label: 'Squad A',
          squad_start: localDatePlus(0),
          lane_label: 'not assigned',
          pair_label: 'not assigned',
        }),
      ],
      upcoming: [],
      completed: [],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'In Progress' })).toBeInTheDocument();
    expect(screen.getByText('Saturday Singles')).toBeInTheDocument();
    expect(screen.getByText(/Squad: Squad A/)).toBeInTheDocument();
    expect(screen.getByText('Lane: not assigned')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Live scores' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Event' })).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
  });

  it('limits pending in-progress events to public Open Event, not Live scores', async () => {
    useAuthMock.mockReturnValue({ user: bowler, isAuthenticated: true });
    getUserMock.mockResolvedValue(bowler);
    getUserHomeEventsMock.mockResolvedValue({
      in_progress: [
        homeEvent({
          id: 21,
          name: 'Saturday Singles',
          start_date: localDatePlus(0),
          end_date: localDatePlus(0),
          registration_status: 'pending',
        }),
      ],
      upcoming: [],
      completed: [],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'In Progress' })).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Event' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Live scores' })).not.toBeInTheDocument();
  });

  it('shows a large Browse events button when the bowler has no home events', async () => {
    useAuthMock.mockReturnValue({ user: bowler, isAuthenticated: true });
    getUserMock.mockResolvedValue(bowler);
    getUserHomeEventsMock.mockResolvedValue({
      in_progress: [],
      upcoming: [],
      completed: [],
    });

    renderPage();

    expect(await screen.findByRole('button', { name: /Browse events/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My Upcoming Tournaments' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My Completed Tournaments' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Director dashboard' })).toBeInTheDocument();
  });
});
