import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ActionsNeeded from '@/pages/tournament_director/ActionsNeeded';
import { Role, type UserRead } from '@/types/user';

const useAuthMock = vi.fn();
const getTemporaryUsbcUsersMock = vi.fn();
const listClaimsMock = vi.fn();
const getPendingSignupEventsMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/api/users', () => ({
  UsersAPI: {
    getTemporaryUsbcUsers: (...args: unknown[]) => getTemporaryUsbcUsersMock(...args),
    assignUsbc: vi.fn(),
  },
}));

vi.mock('@/api/usbcClaims', () => ({
  UsbcClaimsAPI: {
    listClaims: (...args: unknown[]) => listClaimsMock(...args),
    reviewClaim: vi.fn(),
  },
}));

vi.mock('@/api/events', () => ({
  EventsAPI: {
    getPendingSignupEvents: (...args: unknown[]) => getPendingSignupEventsMock(...args),
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
      <MemoryRouter initialEntries={['/director/actions-needed']}>
        <ActionsNeeded />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ActionsNeeded shell', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders page title and empty placeholder sections', async () => {
    useAuthMock.mockReturnValue({ user: tdUser });
    getTemporaryUsbcUsersMock.mockResolvedValue([]);
    getPendingSignupEventsMock.mockResolvedValue([]);
    listClaimsMock.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Actions Needed' })).toBeInTheDocument();
    expect(screen.getByText('Pending sign-ups')).toBeInTheDocument();
    expect(screen.getByText('No pending event sign-ups right now.')).toBeInTheDocument();
    expect(screen.getByText('Temporary USBC IDs')).toBeInTheDocument();
    expect(screen.getByText('No temporary USBC placeholders right now.')).toBeInTheDocument();
    expect(screen.queryByText('USBC ID claims')).not.toBeInTheDocument();
  });
});
