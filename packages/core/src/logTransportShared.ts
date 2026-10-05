/** Shared wire helpers for miss + conversation log transports (internal). */

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function resolveLocalStorage(
  storage?: StorageLike
): StorageLike | undefined {
  if (storage) return storage;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return (globalThis as { localStorage: StorageLike }).localStorage;
  }
  return undefined;
}

export function postJsonTransport(opts: {
  url: string;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  fetch?: typeof fetch;
}): (body: unknown) => Promise<void> {
  const fetchFn = opts.fetch ?? globalThis.fetch?.bind(globalThis);
  return async (body) => {
    if (!fetchFn) return;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(opts.getHeaders ? await opts.getHeaders() : {}),
    };
    await fetchFn(opts.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });
  };
}

export function createLocalStorageRing<T>(opts: {
  key: string;
  limit: number;
  storage?: StorageLike;
  normalize: (parsed: unknown) => T[];
}): {
  append: (item: T) => void;
  snapshot: () => T[];
} {
  const storage = resolveLocalStorage(opts.storage);

  const read = (): T[] => {
    if (!storage) return [];
    try {
      const raw = storage.getItem(opts.key);
      if (!raw) return [];
      return opts.normalize(JSON.parse(raw) as unknown);
    } catch {
      return [];
    }
  };

  const write = (records: T[]) => {
    if (!storage) return;
    try {
      storage.setItem(opts.key, JSON.stringify(records));
    } catch {
      /* quota / private mode */
    }
  };

  return {
    append(item) {
      const next = [...read(), item];
      while (next.length > opts.limit) next.shift();
      write(next);
    },
    snapshot: read,
  };
}
