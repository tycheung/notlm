import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Login from '@/pages/auth/Login';

const loginMock = vi.fn();
const completeTwoFactorLoginMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: (...args: unknown[]) => loginMock(...args),
    completeTwoFactorLogin: (...args: unknown[]) => completeTwoFactorLoginMock(...args),
  }),
}));

vi.mock('@/hooks/useForm', () => ({
  useForm: () => ({
    values: { email: 'bowler@example.com', password: 'secret123' },
    handleChange: vi.fn(),
    fieldErrors: {},
    isSubmitting: false,
    setFieldRules: vi.fn(),
    handleSubmit: (fn: () => Promise<void>) => (event: { preventDefault: () => void }) => {
      event.preventDefault();
      return fn();
    },
  }),
}));

describe('Login 2FA flow', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows 2FA step when login requires_2fa, then completes verification', async () => {
    loginMock.mockResolvedValueOnce({ status: 'requires_2fa', sessionId: 'temp-session' });
    completeTwoFactorLoginMock.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/authentication code/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify and sign in/i }));

    await waitFor(() => {
      expect(completeTwoFactorLoginMock).toHaveBeenCalledWith('123456', 'temp-session');
    });
  });
});
