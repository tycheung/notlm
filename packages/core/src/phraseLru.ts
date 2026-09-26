/**
 * Session phrase LRU — accelerates hot utterances; durable learning stays in pack/ranker.
 */
import type { ParseUtteranceResult } from './types.js';

export const DEFAULT_PHRASE_LRU_CAP = 2000;

export type PhraseLruEntry = {
  parsed: ParseUtteranceResult;
  lastAccessed: number;
  hits: number;
};

export type PhraseLruStore = {
  get: (key: string) => PhraseLruEntry | undefined;
  set: (key: string, entry: PhraseLruEntry) => void;
  delete: (key: string) => void;
  size: () => number;
  entries: () => IterableIterator<[string, PhraseLruEntry]>;
};

export function phraseLruKey(utterance: string, pathname?: string): string {
  const norm = utterance.trim().toLowerCase().replace(/\s+/g, ' ');
  const path = (pathname ?? '').split('?')[0] ?? '';
  return `${path}::${norm}`;
}

export function createMemoryPhraseLru(cap = DEFAULT_PHRASE_LRU_CAP): PhraseLruStore {
  const map = new Map<string, PhraseLruEntry>();
  return {
    get(key) {
      return map.get(key);
    },
    set(key, entry) {
      if (map.has(key)) map.delete(key);
      map.set(key, entry);
      while (map.size > cap) {
        const oldest = map.keys().next().value as string | undefined;
        if (oldest == null) break;
        map.delete(oldest);
      }
    },
    delete(key) {
      map.delete(key);
    },
    size() {
      return map.size;
    },
    entries() {
      return map.entries();
    },
  };
}

/** Touch + return cached parse, or undefined. */
export function phraseLruLookup(
  store: PhraseLruStore,
  key: string
): ParseUtteranceResult | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  const next: PhraseLruEntry = {
    ...hit,
    hits: hit.hits + 1,
    lastAccessed: Date.now(),
  };
  store.set(key, next);
  return next.parsed;
}

/** Promote a successful parse into the LRU (evicts LRU at cap). */
export function phraseLruPromote(
  store: PhraseLruStore,
  key: string,
  parsed: ParseUtteranceResult
): void {
  store.set(key, {
    parsed,
    hits: 1,
    lastAccessed: Date.now(),
  });
}
