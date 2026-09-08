import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SideActionsAPI } from '@/api/side-actions';
import ReportPoolScopeField from '@/components/side_actions/reports/ReportPoolScopeField';
import { SideActionStatus } from '@/types/side_action';

vi.mock('@/api/side-actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/side-actions')>();
  return {
    ...actual,
    SideActionsAPI: {
      ...actual.SideActionsAPI,
      getSideActionPools: vi.fn(),
    },
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReportPoolScopeField', () => {
  it('selects an isolated squad pool', async () => {
    vi.mocked(SideActionsAPI.getSideActionPools).mockResolvedValue([
      {
        id: 10,
        side_action_id: 1,
        squad_id: 100,
        squad_name: 'Squad A',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [1, 4, 5],
        entry_fee: 10,
      },
      {
        id: 20,
        side_action_id: 1,
        squad_id: 200,
        squad_name: 'Squad B',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [1, 4, 5],
        entry_fee: 10,
      },
    ]);
    const onChange = vi.fn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <ReportPoolScopeField
          sideActionId={1}
          value={null}
          onChange={onChange}
        />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Squad B' }));
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it('removes all-squads and requires one pool for bracket reports', async () => {
    vi.mocked(SideActionsAPI.getSideActionPools).mockResolvedValue([
      {
        id: 10,
        side_action_id: 1,
        squad_id: 100,
        squad_name: 'Squad A',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [1, 4, 5],
        entry_fee: 10,
      },
      {
        id: 20,
        side_action_id: 1,
        squad_id: 200,
        squad_name: 'Squad B',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [2, 3, 6],
        entry_fee: 12,
      },
    ]);
    const onChange = vi.fn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <ReportPoolScopeField
          sideActionId={1}
          value={null}
          onChange={onChange}
          required
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/Choose one squad pool/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All squads' })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('auto-selects the only enabled pool when required', async () => {
    vi.mocked(SideActionsAPI.getSideActionPools).mockResolvedValue([
      {
        id: 10,
        side_action_id: 1,
        squad_id: 100,
        squad_name: 'Only Squad',
        is_enabled: true,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [1, 2, 3],
        entry_fee: 10,
      },
      {
        id: 20,
        side_action_id: 1,
        squad_id: 200,
        squad_name: 'Disabled Squad',
        is_enabled: false,
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        game_numbers: [1, 2, 3],
        entry_fee: 10,
      },
    ]);
    const onChange = vi.fn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <ReportPoolScopeField
          sideActionId={1}
          value={null}
          onChange={onChange}
          required
        />
      </QueryClientProvider>
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(10));
    expect(screen.queryByRole('button', { name: 'Disabled Squad' })).not.toBeInTheDocument();
  });
});
