import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
import { afterEach } from 'vitest';
import GameScoringTab from '../../../../src/components/event-round/tabs/GameScoringTab';
import { SideActionsAPI } from '../../../../src/api/side-actions';

const tabSpy = vi.fn();

vi.mock('../../../../src/components/event-round/EventRoundWorkspace', () => ({
  default: (props: { isAuthorizedForManagement: boolean }) => {
    tabSpy(props);
    return <div data-testid="mock-event-round-workspace" />;
  },
}));

vi.mock('../../../../src/api/side-actions', () => ({
  SideActionsAPI: {
    getEventLockStatus: vi.fn(async () => ({
      event_id: 1,
      active_count: 1,
      unlocked_count: 1,
      all_locked: false,
      unlocked_ids: [7],
      unlocked_names: ['Event Brackets'],
    })),
    lockAllEventEntries: vi.fn(async () => ({
      event_id: 1,
      locked_count: 1,
      already_locked_count: 0,
      locked_ids: [7],
      already_locked_ids: [],
      all_locked: true,
    })),
  },
}));

function renderTab(props: Partial<ComponentProps<typeof GameScoringTab>> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GameScoringTab
        eventId={1}
        eventComplete={{ tournament_id: 1, rounds: [] }}
        isAuthorizedForManagement={true}
        scoringUnlocked={false}
        {...props}
      />
    </QueryClientProvider>
  );
}

describe('GameScoringTab', () => {
  afterEach(cleanup);

  beforeEach(() => {
    tabSpy.mockClear();
    vi.mocked(SideActionsAPI.lockAllEventEntries).mockClear();
  });

  it('shows lock warning banner when scoring is not unlocked', () => {
    renderTab({ scoringUnlocked: false });

    expect(
      screen.getByText('Lock at least one squad on the Squads tab to enter scores.')
    ).toBeTruthy();
  });

  it('shows future-start banner and hides squad-lock banner', () => {
    renderTab({
      scoringUnlocked: false,
      scoringBlockedUntilStart: true,
      isAuthorizedForManagement: false,
    });

    expect(
      screen.getByText(
        /Scoring opens at the event start date and time/i
      )
    ).toBeTruthy();
    expect(
      screen.queryByText('Lock at least one squad on the Squads tab to enter scores.')
    ).toBeNull();
  });

  it('keeps workspace authorized so roster and score grid still render', () => {
    renderTab({ scoringUnlocked: false });

    expect(screen.getAllByTestId('mock-event-round-workspace').length).toBeGreaterThan(0);
    const lastCall = tabSpy.mock.calls[tabSpy.mock.calls.length - 1]?.[0];
    expect(lastCall.isAuthorizedForManagement).toBe(true);
  });

  it('authorizes scoring workspace when squads unlocked and no open side actions', () => {
    renderTab({ scoringUnlocked: true });

    const lastCall = tabSpy.mock.calls[tabSpy.mock.calls.length - 1]?.[0];
    expect(lastCall.isAuthorizedForManagement).toBe(true);
  });

  it('warns when lock status cannot be verified before scoring', async () => {
    vi.mocked(SideActionsAPI.getEventLockStatus).mockRejectedValueOnce(
      new Error('Lock service unavailable')
    );

    renderTab({ scoringUnlocked: true });

    expect(await screen.findByText('Lock service unavailable')).toBeInTheDocument();
  });

  it('does not offer event locking when no lock-gated side actions exist', async () => {
    vi.mocked(SideActionsAPI.getEventLockStatus).mockResolvedValueOnce({
      event_id: 1,
      active_count: 0,
      unlocked_count: 0,
      all_locked: true,
      unlocked_ids: [],
      unlocked_names: [],
    });

    renderTab({ scoringUnlocked: true });

    await waitFor(() =>
      expect(SideActionsAPI.getEventLockStatus).toHaveBeenCalledWith(1)
    );
    expect(
      screen.queryByRole('button', { name: 'Lock event entries' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Score saves will be rejected/)).not.toBeInTheDocument();
  });

  it('locks only the current event from the scoring warning', async () => {
    renderTab({ eventId: 42, scoringUnlocked: true });

    fireEvent.click(await screen.findByRole('button', { name: 'Lock event entries' }));
    const lockButtons = screen.getAllByRole('button', { name: 'Lock event entries' });
    fireEvent.click(lockButtons[lockButtons.length - 1]);

    await waitFor(() =>
      expect(SideActionsAPI.lockAllEventEntries).toHaveBeenCalledWith(42)
    );
  });
});
