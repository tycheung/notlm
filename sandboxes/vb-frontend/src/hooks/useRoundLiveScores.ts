import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/apiErrors';
import { EventsAPI } from '../api/events';
import { EventRoundLiveScoresSnapshot } from '../types/event';
import {
  isLiveScoresCdnEnabled,
  liveBoardPath,
  livePointerPath,
  nextLivePollDelayMs,
  shouldPollLiveBoard,
  type LivePointer,
} from '../utils/liveScoresCdn';

interface UseRoundLiveScoresResult {
  data: EventRoundLiveScoresSnapshot | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  refresh: () => Promise<void>;
  mayBeDelayed: boolean;
}

async function fetchJson<T>(
  url: string
): Promise<{ ok: boolean; status: number; body: T | null }> {
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404 || res.status === 403) {
    return { ok: false, status: res.status, body: null };
  }
  if (!res.ok) {
    throw new Error(`Live scores request failed (${res.status})`);
  }
  return { ok: true, status: res.status, body: (await res.json()) as T };
}

export function useRoundLiveScores(
  eventId: number,
  roundId: number | null,
  enabled: boolean,
  options?: { eventPublished?: boolean }
): UseRoundLiveScoresResult {
  const [data, setData] = useState<EventRoundLiveScoresSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mayBeDelayed, setMayBeDelayed] = useState(false);
  const mountedRef = useRef(false);
  const versionRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const unpublished = options?.eventPublished === false;
  const useCdn = isLiveScoresCdnEnabled() && !unpublished;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadRest = useCallback(async () => {
    if (!roundId) return;
    const snapshot = await EventsAPI.getRoundLiveScores(eventId, roundId);
    if (!mountedRef.current) return;
    versionRef.current = snapshot.version;
    setData(snapshot);
    setError(null);
  }, [eventId, roundId]);

  const loadCdn = useCallback(async (): Promise<string | undefined> => {
    if (!roundId) return undefined;
    const pointerRes = await fetchJson<LivePointer>(livePointerPath(eventId, roundId));
    if (!pointerRes.ok || !pointerRes.body?.version) {
      await loadRest();
      if (mountedRef.current) {
        setMayBeDelayed(true);
        setIsConnected(false);
      }
      return undefined;
    }
    const pointer = pointerRes.body;
    if (mountedRef.current) {
      setMayBeDelayed(false);
      setIsConnected(true);
    }
    if (versionRef.current !== pointer.version) {
      const boardRes = await fetchJson<EventRoundLiveScoresSnapshot>(
        liveBoardPath(eventId, roundId, pointer.version)
      );
      if (!boardRes.ok || !boardRes.body) {
        await loadRest();
        if (mountedRef.current) {
          setMayBeDelayed(true);
          setIsConnected(false);
        }
        return pointer.status;
      }
      if (!mountedRef.current) return pointer.status;
      versionRef.current = pointer.version;
      setData(boardRes.body);
      setError(null);
    }
    return pointer.status;
  }, [eventId, loadRest, roundId]);

  const refresh = useCallback(async () => {
    if (!roundId || !enabled) return;
    setError(null);
    try {
      if (useCdn) {
        await loadCdn();
      } else {
        await loadRest();
        if (mountedRef.current) setIsConnected(false);
      }
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      setError(getErrorMessage(e, 'Could not load live scores.'));
      setIsConnected(false);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [enabled, loadCdn, loadRest, roundId, useCdn]);

  useEffect(() => {
    mountedRef.current = true;
    versionRef.current = null;
    if (!enabled || !roundId) {
      setIsLoading(false);
      setData(null);
      setError(null);
      setIsConnected(false);
      setMayBeDelayed(false);
      return () => {
        mountedRef.current = false;
        clearTimer();
      };
    }

    setIsLoading(true);
    let cancelled = false;

    const scheduleIfNeeded = (status: string | undefined) => {
      if (cancelled || !useCdn) return;
      if (!shouldPollLiveBoard(status, document.visibilityState)) return;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        void tick();
      }, nextLivePollDelayMs());
    };

    const tick = async () => {
      if (cancelled || !mountedRef.current) return;
      try {
        if (useCdn) {
          const status = await loadCdn();
          if (mountedRef.current) setIsLoading(false);
          scheduleIfNeeded(status);
          return;
        }
        await loadRest();
        if (mountedRef.current) {
          setIsConnected(false);
          setIsLoading(false);
        }
      } catch (e: unknown) {
        if (!mountedRef.current) return;
        setError(getErrorMessage(e, 'Could not load live scores.'));
        setIsConnected(false);
        setIsLoading(false);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void tick();
      } else {
        clearTimer();
      }
    };

    void tick();
    if (useCdn) {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clearTimer, enabled, loadCdn, loadRest, roundId, useCdn]);

  return {
    data,
    isLoading,
    error,
    isConnected,
    refresh,
    mayBeDelayed,
  };
}
