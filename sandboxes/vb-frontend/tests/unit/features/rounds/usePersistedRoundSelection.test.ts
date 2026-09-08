import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getStorageKey,
  parsePersistedRoundId,
  STORAGE_PREFIX,
  usePersistedRoundSelection,
} from '@/features/rounds/usePersistedRoundSelection';

beforeEach(() => {
  localStorage.clear();
});

describe('usePersistedRoundSelection hook', () => {
  it('persists round id in localStorage', () => {
    const { result } = renderHook(() => usePersistedRoundSelection(7));
    act(() => {
      result.current.setPersistedRoundId(3);
    });
    expect(localStorage.getItem(`${STORAGE_PREFIX}7`)).toBe('3');
    expect(result.current.getPersistedRoundId()).toBe(3);
  });

  it('clears storage', () => {
    const { result } = renderHook(() => usePersistedRoundSelection(7));
    act(() => {
      result.current.setPersistedRoundId(1);
    });
    act(() => {
      result.current.clearPersistedRoundId();
    });
    expect(localStorage.getItem(`${STORAGE_PREFIX}7`)).toBeNull();
  });

  it('no-ops without event id', () => {
    const { result } = renderHook(() => usePersistedRoundSelection(undefined));
    act(() => {
      result.current.setPersistedRoundId(1);
    });
    expect(result.current.getPersistedRoundId()).toBeNull();
  });

  it('removes item when round id is null', () => {
    const { result } = renderHook(() => usePersistedRoundSelection(2));
    act(() => {
      result.current.setPersistedRoundId(5);
    });
    act(() => {
      result.current.setPersistedRoundId(null);
    });
    expect(localStorage.getItem(`${STORAGE_PREFIX}2`)).toBeNull();
  });
});

describe('usePersistedRoundSelection helpers', () => {
  it('builds event-scoped local storage keys', () => {
    expect(getStorageKey(123)).toBe(`${STORAGE_PREFIX}123`);
    expect(getStorageKey(undefined)).toBeNull();
  });

  it('parses valid persisted round ids', () => {
    expect(parsePersistedRoundId('42')).toBe(42);
  });

  it('returns null for missing/invalid persisted values', () => {
    expect(parsePersistedRoundId(null)).toBeNull();
    expect(parsePersistedRoundId('abc')).toBeNull();
  });
});
