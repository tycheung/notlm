import { useCallback, useMemo } from 'react';

export const STORAGE_PREFIX = 'vb:round-selection:event:';

export function getStorageKey(eventId: number | undefined): string | null {
  if (!eventId) return null;
  return `${STORAGE_PREFIX}${eventId}`;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function usePersistedRoundSelection(eventId: number | undefined) {
  const storageKey = useMemo(() => getStorageKey(eventId), [eventId]);

  const getPersistedRoundId = useCallback((): number | null => {
    if (!storageKey || !canUseLocalStorage()) return null;
    const raw = window.localStorage.getItem(storageKey);
    return parsePersistedRoundId(raw);
  }, [storageKey]);

  const setPersistedRoundId = useCallback(
    (roundId: number | null) => {
      if (!storageKey || !canUseLocalStorage()) return;
      if (roundId == null) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      window.localStorage.setItem(storageKey, String(roundId));
    },
    [storageKey]
  );

  const clearPersistedRoundId = useCallback(() => {
    if (!storageKey || !canUseLocalStorage()) return;
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    getPersistedRoundId,
    setPersistedRoundId,
    clearPersistedRoundId,
  };
}

export function parsePersistedRoundId(rawValue: string | null): number | null {
  if (!rawValue) return null;
  const parsed = parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
