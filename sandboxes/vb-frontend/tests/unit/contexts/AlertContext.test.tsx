import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';

import { AlertProvider, useAlert } from '@/contexts/AlertContext';

function Probe() {
  const { showAlert } = useAlert();
  return (
    <button type="button" onClick={() => showAlert('Team registered successfully!', 'success')}>
      Trigger
    </button>
  );
}

describe('AlertContext', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders a visible global alert when showAlert is called', () => {
    render(
      <AlertProvider>
        <Probe />
      </AlertProvider>
    );

    expect(screen.queryByTestId('global-alert')).not.toBeInTheDocument();
    act(() => {
      screen.getByRole('button', { name: 'Trigger' }).click();
    });
    expect(screen.getByTestId('global-alert')).toBeInTheDocument();
    expect(screen.getByText('Team registered successfully!')).toBeInTheDocument();
  });

  it('auto-hides the alert after the timeout', () => {
    vi.useFakeTimers();
    render(
      <AlertProvider>
        <Probe />
      </AlertProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Trigger' }).click();
    });
    expect(screen.getByTestId('global-alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByTestId('global-alert')).not.toBeInTheDocument();
  });
});
