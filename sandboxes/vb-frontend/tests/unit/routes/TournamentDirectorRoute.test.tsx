import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import TournamentDirectorRoute from '@/routes/TournamentDirectorRoute';
import { Role, type UserRead } from '@/types/user';

const useAuthMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
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

function renderRoute(initialPath = '/director') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<TournamentDirectorRoute />}>
          <Route path="/director" element={<div>Director content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/dashboard" element={<div>Bowler dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TournamentDirectorRoute', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows loading state while auth is resolving', () => {
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: true,
    });

    renderRoute();
    expect(screen.getByText('Verifying permissions...')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', async () => {
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
    });

    renderRoute();
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('redirects bowlers to the dashboard', async () => {
    useAuthMock.mockReturnValue({
      user: { ...tdUser, role: Role.BOWLER },
      isAuthenticated: true,
      loading: false,
    });

    renderRoute();
    expect(await screen.findByText('Bowler dashboard')).toBeInTheDocument();
  });

  it('renders outlet for tournament directors', async () => {
    useAuthMock.mockReturnValue({
      user: tdUser,
      isAuthenticated: true,
      loading: false,
    });

    renderRoute();
    expect(await screen.findByText('Director content')).toBeInTheDocument();
  });

  it('allows admins through the director route guard', async () => {
    useAuthMock.mockReturnValue({
      user: { ...tdUser, role: Role.ADMIN },
      isAuthenticated: true,
      loading: false,
    });

    renderRoute();
    expect(await screen.findByText('Director content')).toBeInTheDocument();
  });
});
