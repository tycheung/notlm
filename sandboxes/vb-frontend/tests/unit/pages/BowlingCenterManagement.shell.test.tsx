import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import BowlingCenterManagement from '@/pages/tournament_director/BowlingCenterManagement';
import { Role, type UserRead } from '@/types/user';

const useAuthMock = vi.fn();
const getBowlingCentersMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/api/bowling-centers', () => ({
  BowlingCentersAPI: {
    getBowlingCenters: (...args: unknown[]) => getBowlingCentersMock(...args),
    deleteBowlingCenter: vi.fn(),
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
  return render(
    <MemoryRouter initialEntries={['/director/bowling-centers']}>
      <BowlingCenterManagement />
    </MemoryRouter>
  );
}

describe('BowlingCenterManagement shell', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders management heading and center list', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getBowlingCentersMock.mockResolvedValue([
      {
        id: 3,
        name: 'Victory Lanes',
        city: 'Columbus',
        state: 'OH',
        lane_count: 32,
        address1: '100 Bowl Way',
        postal_code: '43000',
        is_active: true,
      },
    ]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Bowling Center Management' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Victory Lanes')).toBeInTheDocument();
    });
  });
});
