import type { ReactElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SideActionForm from '@/components/side_actions/SideActionForm';
import { SideActionType } from '@/types/side_action';
import { SquadsAPI } from '@/api/squads';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  vi.spyOn(SquadsAPI, 'getAllEventSquads').mockResolvedValue([]);
});

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={['/director/events/2']}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('SideActionForm High Series configuration', () => {
  it('settles after mounting without an update-depth render loop', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithQueryClient(
      <SideActionForm
        tournamentId={1}
        eventId={2}
        fixedSideActionType={SideActionType.HIGH_SET}
        onSubmit={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('High Series')).toBeInTheDocument();
    });
    expect(
      consoleError.mock.calls.some((call) =>
        String(call[0]).includes('Maximum update depth exceeded')
      )
    ).toBe(false);

    consoleError.mockRestore();
  });

  it('preserves a legacy women-only division configuration', () => {
    const view = renderWithQueryClient(
      <SideActionForm
        tournamentId={1}
        eventId={2}
        fixedSideActionType={SideActionType.HIGH_SET}
        initialData={{
          side_action_type: SideActionType.HIGH_SET,
          type_config: { divisions: ['Women'] },
        }}
        onSubmit={vi.fn()}
      />
    );

    expect(view.getByLabelText('Men')).not.toBeChecked();
    expect(view.getByLabelText('Women')).toBeChecked();
  });
});

describe('SideActionForm entry unit', () => {
  it('shows Bowler vs Team on High Game and hides it when team pots are not allowed', async () => {
    const { unmount } = renderWithQueryClient(
      <SideActionForm
        tournamentId={1}
        eventId={2}
        fixedSideActionType={SideActionType.HIGH_GAME}
        onSubmit={vi.fn()}
      />
    );
    expect(await screen.findByText('Who enters this pot?')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    unmount();

    renderWithQueryClient(
      <SideActionForm
        tournamentId={1}
        eventId={2}
        fixedSideActionType={SideActionType.HIGH_GAME}
        allowTeamEntry={false}
        onSubmit={vi.fn()}
      />
    );
    expect(await screen.findByText('High Game')).toBeInTheDocument();
    expect(screen.queryByText('Who enters this pot?')).not.toBeInTheDocument();
  });

  it.each([
    SideActionType.BRACKET,
    SideActionType.HIGH_SET,
    SideActionType.ELIMINATOR,
  ])('shows the Team toggle for %s', async (type) => {
    renderWithQueryClient(
      <SideActionForm
        tournamentId={1}
        eventId={2}
        fixedSideActionType={type}
        onSubmit={vi.fn()}
      />
    );
    expect(await screen.findByText('Who enters this pot?')).toBeInTheDocument();
  });
});
