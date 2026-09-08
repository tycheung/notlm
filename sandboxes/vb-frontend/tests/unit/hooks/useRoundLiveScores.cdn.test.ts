import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoundLiveScores } from '../../../src/hooks/useRoundLiveScores';

const getRoundLiveScores = vi.fn();

vi.mock('../../../src/api/events', () => ({
  EventsAPI: {
    getRoundLiveScores: (...args: unknown[]) => getRoundLiveScores(...args),
  },
}));

describe('useRoundLiveScores CDN poll', () => {
  beforeEach(() => {
    getRoundLiveScores.mockReset();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads pointer then board and does not hit REST', async () => {
    const pointer = {
      event_id: 1,
      round_id: 2,
      version: '10',
      updated_at: '2026-08-19T12:00:00',
      status: 'in_progress',
    };
    const board = {
      event_id: 1,
      round_id: 2,
      version: '10',
      updated_at: '2026-08-19T12:00:00',
      round: {
        id: 2,
        round_number: 1,
        friendly_name: 'Qual',
        status: 'in_progress',
        game_count: 1,
      },
      squads: [],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/v.json')) {
        return { ok: true, status: 200, json: async () => pointer };
      }
      return { ok: true, status: 200, json: async () => board };
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result, unmount } = renderHook(() =>
      useRoundLiveScores(1, 2, true, { eventPublished: true })
    );
    await waitFor(() => expect(result.current.data?.version).toBe('10'));
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual([
      '/live/1/2/v.json',
      '/live/1/2/10.json',
    ]);
    expect(getRoundLiveScores).not.toHaveBeenCalled();
    unmount();
  });

  it('falls back to REST on CDN 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }))
    );
    getRoundLiveScores.mockResolvedValue({
      event_id: 1,
      round_id: 2,
      version: 'rest',
      updated_at: '2026-08-19T12:00:00',
      round: { status: 'in_progress' },
      squads: [],
    });

    const { result, unmount } = renderHook(() =>
      useRoundLiveScores(1, 2, true, { eventPublished: true })
    );
    await waitFor(() => expect(result.current.data?.version).toBe('rest'));
    expect(result.current.mayBeDelayed).toBe(true);
    expect(getRoundLiveScores).toHaveBeenCalledWith(1, 2);
    unmount();
  });

  it('stops the poll timer when the tab is hidden', async () => {
    let visibility: Document['visibilityState'] = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    const pointer = {
      event_id: 1,
      round_id: 2,
      version: '1',
      updated_at: '2026-08-19T12:00:00',
      status: 'in_progress',
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/v.json')) {
        return { ok: true, status: 200, json: async () => pointer };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ...pointer,
          round: { status: 'in_progress' },
          squads: [],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = renderHook(() =>
      useRoundLiveScores(1, 2, true, { eventPublished: true })
    );
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    const afterFirst = fetchMock.mock.calls.length;
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock.mock.calls.length).toBe(afterFirst);
    unmount();
  });
});
