import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import TournamentDirectorDashboard from '@/pages/tournament_director/TournamentDirectorDashboard';
import { Role, type UserRead } from '@/types/user';

const useAuthMock = vi.fn();
const getBowlingCentersMock = vi.fn();
const getEventWithRoundsMock = vi.fn();
const getHomeSummaryMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/api/bowling-centers', () => ({
  BowlingCentersAPI: {
    getBowlingCenters: (...args: unknown[]) => getBowlingCentersMock(...args),
  },
}));

vi.mock('@/api/events', () => ({
  EventsAPI: {
    getEventWithRounds: (...args: unknown[]) => getEventWithRoundsMock(...args),
  },
}));

vi.mock('@/api/directors', () => ({
  DirectorsAPI: {
    getHomeSummary: (...args: unknown[]) => getHomeSummaryMock(...args),
  },
}));

vi.mock('@/pages/tournaments/TournamentCreate', () => ({
  default: () => <div data-testid="tournament-create-modal" />,
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

function localDatePlus(days: number): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T09:00:00`;
}

const managedTournament = {
  id: 10,
  name: 'Spring Open',
  organizer_id: 1,
  bowling_center_id: 2,
  is_active: true,
  start_date: localDatePlus(20),
  end_date: localDatePlus(22),
  lanes_reserved: 8,
  pending_registrations: 2,
  current_entries: 4,
};

function homeSummary(overrides: Record<string, unknown> = {}) {
  return {
    owned_tournaments: [managedTournament],
    delegated_tournaments: [],
    events: [],
    pending_signups: [],
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/director']}>
        <TournamentDirectorDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TournamentDirectorDashboard shell', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function mockHomeApis(overrides: Record<string, unknown> = {}) {
    getHomeSummaryMock.mockResolvedValue(homeSummary(overrides));
    getEventWithRoundsMock.mockResolvedValue({ rounds: [] });
  }

  it('renders dashboard heading and managed tournament after data loads', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([
      { id: 2, name: 'Victory Lanes', city: 'Columbus', state: 'OH', is_active: true },
    ]);
    mockHomeApis();

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Tournament Director Dashboard' })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Spring Open')).toBeInTheDocument();
    });
    expect(screen.getByText('Active Tournaments')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Actions Needed/ })).toHaveAttribute(
      'href',
      '/director/actions-needed'
    );
    expect(screen.getByRole('link', { name: /Manage Tournaments/ })).toHaveAttribute(
      'href',
      '/director/tournaments'
    );
    expect(screen.getByRole('link', { name: /House averages/ })).toHaveAttribute(
      'href',
      '/director/averages'
    );
    expect(screen.getByRole('link', { name: /Bowler lookup/ })).toHaveAttribute(
      'href',
      '/director/bowlers'
    );
    expect(screen.queryByText("Today's events")).not.toBeInTheDocument();
    expect(screen.queryByText('Manage Bowling Centers')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage bowling centers' })).toHaveAttribute(
      'href',
      '/director/bowling-centers'
    );
    const ownedRow = screen.getByRole('row', { name: /Spring Open/ });
    expect(within(ownedRow).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Happening Today / In Progress' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Coming Up (next 10 days)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bowling Centers' })).not.toBeInTheDocument();
  });

  it('shows error alert when tournament fetch fails', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getHomeSummaryMock.mockRejectedValue(new Error('network'));
    getBowlingCentersMock.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText('Failed to load tournament data. Please log out and back in again.')
    ).toBeInTheDocument();
  });

  it('shows happening today above my tournaments when an event includes today', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([]);
    mockHomeApis({
      events: [
        {
          id: 21,
          name: 'Saturday Scratch',
          tournament_id: 10,
          start_date: localDatePlus(0),
          end_date: localDatePlus(0),
        },
      ],
    });
    getEventWithRoundsMock.mockResolvedValue({
      rounds: [{ status: 'in_progress', friendly_name: 'Match Play', round_number: 2 }],
    });

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Happening Today / In Progress' })
    ).toBeInTheDocument();
    expect(screen.getByText('Saturday Scratch')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Game Scoring' })).toBeInTheDocument();
    expect(screen.getByText('Current status')).toBeInTheDocument();
    expect(await screen.findByText('Match Play in progress')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bowling Centers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Coming Up (next 10 days)' })).not.toBeInTheDocument();
  });

  it('shows coming up for events that start within the next 10 days', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([]);
    mockHomeApis({
      events: [
        {
          id: 22,
          name: 'Next Weekend Doubles',
          tournament_id: 10,
          start_date: localDatePlus(8),
          end_date: localDatePlus(9),
        },
      ],
    });

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Coming Up (next 10 days)' })
    ).toBeInTheDocument();
    expect(screen.getByText('Next Weekend Doubles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Event' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Happening Today / In Progress' })).not.toBeInTheDocument();
  });

  it('uses a sign-ups jump when happening today is still in registration', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([]);
    mockHomeApis({
      events: [
        {
          id: 21,
          name: 'Saturday Scratch',
          tournament_id: 10,
          start_date: localDatePlus(0),
          end_date: localDatePlus(0),
          published_at: '2026-08-01T00:00:00',
          signups_manually_closed: false,
        },
      ],
    });
    getEventWithRoundsMock.mockResolvedValue({ rounds: [{ status: 'scheduled' }] });

    renderPage();

    expect(await screen.findByRole('button', { name: 'Sign-ups' })).toBeInTheDocument();
    expect(screen.getByText('Sign-ups open')).toBeInTheDocument();
  });

  it('shows delegated tournaments under my tournaments', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([
      { id: 2, name: 'Victory Lanes', city: 'Columbus', state: 'OH' },
    ]);
    mockHomeApis({
      delegated_tournaments: [
        {
          id: 44,
          name: 'Assistant Classic',
          organizer_id: 99,
          bowling_center_id: 2,
          is_active: true,
          start_date: '2026-09-01T00:00:00',
          end_date: '2026-09-02T00:00:00',
          current_entries: 12,
          pending_registrations: 1,
        },
      ],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Delegated Tournaments' })).toBeInTheDocument();
    expect(screen.getByText('Assistant Classic')).toBeInTheDocument();
    const delegatedRow = screen.getByRole('row', { name: /Assistant Classic/ });
    expect(within(delegatedRow).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(within(delegatedRow).getByRole('button', { name: 'Details/Manage' })).toBeInTheDocument();
  });

  it('links the pending registrations card to actions needed', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([]);
    mockHomeApis({
      pending_signups: [
        {
          event_id: 21,
          event_name: 'Saturday Scratch',
          tournament_id: 10,
          tournament_name: 'Spring Open',
          pending_count: 2,
        },
      ],
    });

    renderPage();

    const card = await screen.findByRole('link', { name: 'View pending registrations' });
    expect(card).toHaveAttribute('href', '/director/actions-needed');
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('links a tournament pending count to that event when only one event is pending', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([]);
    mockHomeApis({
      pending_signups: [
        {
          event_id: 21,
          event_name: 'Saturday Scratch',
          tournament_id: 10,
          tournament_name: 'Spring Open',
          pending_count: 2,
        },
      ],
    });

    renderPage();

    const pendingLink = await screen.findByRole('link', { name: '2 pending' });
    expect(pendingLink).toHaveAttribute('href', '/director/events/21?tab=participants');
  });

  it('links happening-today pending counts to participant management', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([]);
    mockHomeApis({
      events: [
        {
          id: 21,
          name: 'Saturday Scratch',
          tournament_id: 10,
          start_date: localDatePlus(0),
          end_date: localDatePlus(0),
        },
      ],
      pending_signups: [
        {
          event_id: 21,
          event_name: 'Saturday Scratch',
          tournament_id: 10,
          tournament_name: 'Spring Open',
          pending_count: 3,
        },
      ],
    });

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Happening Today / In Progress' })
    ).toBeInTheDocument();
    const pendingLinks = await screen.findAllByRole('link', { name: '3 pending' });
    expect(pendingLinks.length).toBeGreaterThanOrEqual(1);
    pendingLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/director/events/21?tab=participants');
    });
  });

  it('collapses recently finished owned tournaments off the main table', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([]);
    mockHomeApis({
      owned_tournaments: [
        {
          ...managedTournament,
          id: 12,
          name: 'Winter Classic',
          start_date: localDatePlus(-20),
          end_date: localDatePlus(-18),
        },
      ],
    });

    renderPage();

    expect(await screen.findByText('Completed Tournaments')).toBeInTheDocument();
    expect(screen.getByText('Winter Classic')).toBeInTheDocument();
    expect(screen.getByText('No live or upcoming tournaments.')).toBeInTheDocument();
  });
});
