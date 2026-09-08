import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SideActionsAPI } from '@/api/side-actions';
import { useBracketActions } from '@/components/side_actions/useBracketActions';
import { SideActionStatus, SideActionType, type SideAction } from '@/types/side_action';

afterEach(() => vi.restoreAllMocks());

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useBracketActions', () => {
  it('tracks concurrent generation independently by side action and pool', async () => {
    const first = deferred<Awaited<ReturnType<typeof SideActionsAPI.generateBracketPots>>>();
    const second = deferred<Awaited<ReturnType<typeof SideActionsAPI.generateBracketPots>>>();
    vi.spyOn(SideActionsAPI, 'generateBracketPots')
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useBracketActions(), { wrapper });

    act(() => {
      void result.current.handleGenerate(7, 11, 'Morning');
    });
    expect(result.current.generatingIds.has('7:11')).toBe(true);

    act(() => {
      void result.current.handleGenerate(7, 12, 'Evening');
    });
    expect([...result.current.generatingIds]).toEqual(['7:11', '7:12']);

    await act(async () => {
      first.resolve({} as Awaited<ReturnType<typeof SideActionsAPI.generateBracketPots>>);
      await first.promise;
    });
    expect([...result.current.generatingIds]).toEqual(['7:12']);

    await act(async () => {
      second.resolve({} as Awaited<ReturnType<typeof SideActionsAPI.generateBracketPots>>);
      await second.promise;
    });
    await waitFor(() => expect(result.current.generatingIds.size).toBe(0));
  });

  it('opens the bracket viewer with selected-pool prize overrides', async () => {
    const sync = deferred<Awaited<ReturnType<typeof SideActionsAPI.syncBracketScores>>>();
    vi.spyOn(SideActionsAPI, 'syncBracketScores').mockReturnValue(sync.promise);
    vi.spyOn(SideActionsAPI, 'getSideAction').mockResolvedValue({
      id: 7,
      name: 'Brackets',
      prize_distribution: { '1': 50, '2': 20 },
      type_config: { bye_prize_distribution: { '1': 30, '2': 10 } },
      pools: [
        {
          id: 12,
          side_action_id: 7,
          squad_id: 2,
          squad_name: 'Evening',
          is_enabled: true,
          status: SideActionStatus.IN_PROGRESS,
          game_numbers: [1, 2, 3],
          entry_fee: 10,
          override_config: {
            prize_distribution: { '1': 80, '2': 40 },
            type_config: { bye_prize_distribution: { '1': 60, '2': 25 } },
          },
          bracket_engine: { brackets: [] },
        },
      ],
      side_action_type: SideActionType.BRACKET,
    } as SideAction);
    const client = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useBracketActions(), { wrapper });

    let viewPromise!: Promise<void>;
    act(() => {
      viewPromise = result.current.handleViewSideAction(7, 'Brackets', 12, 'Evening');
    });
    expect(result.current.syncingScoresIds.has('7:12')).toBe(true);
    await act(async () => {
      sync.resolve({ side_action_id: 7, synced_games: [], details: [] });
      await viewPromise;
    });

    expect(result.current.viewingBrackets?.payouts).toEqual({
      first: 80,
      second: 40,
      third: 0,
      fourth: 0,
    });
    expect(result.current.viewingBrackets?.byePayouts).toEqual({
      first: 60,
      second: 25,
      third: 0,
      fourth: 0,
    });
    expect(result.current.syncingScoresIds.size).toBe(0);
  });
});
