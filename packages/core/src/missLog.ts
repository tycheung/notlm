import type { CoachEvent } from './types.js';

export type MissKind = 'unknown' | 'ambiguous' | 'low_confidence';

export type MissRecord = {
  text: string;
  kind: MissKind;
  packId?: string;
  pathname?: string;
  rawIntent?: string | null;
  confidence?: 'high' | 'mid' | 'low';
  at: string;
};

export type MissLogTransport = {
  log: (record: MissRecord) => void | Promise<void>;
};

export const DEFAULT_MISS_TEXT_CAP = 500;
export const DEFAULT_MISS_DEDUPE_MS = 8_000;
export const DEFAULT_MISS_KINDS: readonly MissKind[] = [
  'unknown',
  'ambiguous',
  'low_confidence',
];

const MISS_KIND_SET = new Set<string>(DEFAULT_MISS_KINDS);

export function isMissKind(kind: string): kind is MissKind {
  return MISS_KIND_SET.has(kind);
}

/** Cap length and strip control chars for safe storage / tuning corpora. */
export function sanitizeMissText(raw: string, maxLen = DEFAULT_MISS_TEXT_CAP): string {
  const cleaned = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen);
}

export type MissLogPipelineOpts = {
  transport: MissLogTransport;
  kinds?: MissKind[];
  packId?: string;
  getPathname?: () => string | undefined;
  maxTextLength?: number;
  dedupeMs?: number;
  /** Wall clock (injectable for tests). */
  now?: () => number;
};

export type MissLogPipeline = {
  onCoachEvent: (event: CoachEvent) => void;
};

/**
 * Turns repair CoachEvents into MissRecords and forwards to a transport.
 * Best-effort: never throws into host dispatch.
 */
export function createMissLogPipeline(opts: MissLogPipelineOpts): MissLogPipeline {
  const kinds = new Set(opts.kinds ?? DEFAULT_MISS_KINDS);
  const maxLen = opts.maxTextLength ?? DEFAULT_MISS_TEXT_CAP;
  const dedupeMs = opts.dedupeMs ?? DEFAULT_MISS_DEDUPE_MS;
  const now = opts.now ?? (() => Date.now());
  let lastKey = '';
  let lastAt = 0;

  return {
    onCoachEvent(event: CoachEvent) {
      try {
        if (event.type !== 'repair') return;
        if (!isMissKind(event.kind) || !kinds.has(event.kind)) return;
        const text = sanitizeMissText(event.text ?? '', maxLen);
        if (!text) return;

        const key = `${event.kind}:${text}`;
        const t = now();
        if (key === lastKey && t - lastAt < dedupeMs) return;
        lastKey = key;
        lastAt = t;

        const record: MissRecord = {
          text,
          kind: event.kind,
          at: new Date(t).toISOString(),
        };
        if (opts.packId) record.packId = opts.packId;
        const pathname = opts.getPathname?.();
        if (pathname) record.pathname = pathname;
        if (event.rawIntent !== undefined) record.rawIntent = event.rawIntent;
        if (event.confidence) record.confidence = event.confidence;

        void Promise.resolve(opts.transport.log(record)).catch(() => {
          /* host transport failures must not break chat */
        });
      } catch {
        /* pipeline must never break dispatch */
      }
    },
  };
}

export type MemoryMissLogTransport = MissLogTransport & {
  snapshot: () => MissRecord[];
  clear: () => void;
};

export function createMemoryMissLogTransport(opts?: {
  limit?: number;
}): MemoryMissLogTransport {
  const limit = opts?.limit ?? 200;
  const records: MissRecord[] = [];
  return {
    log(record) {
      records.push(record);
      while (records.length > limit) records.shift();
    },
    snapshot: () => [...records],
    clear: () => {
      records.length = 0;
    },
  };
}

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function createLocalStorageMissLogTransport(opts: {
  key: string;
  limit?: number;
  storage?: StorageLike;
}): MissLogTransport & { snapshot: () => MissRecord[] } {
  const limit = opts.limit ?? 200;
  const storage =
    opts.storage ??
    (typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? (globalThis as { localStorage: StorageLike }).localStorage
      : undefined);

  const read = (): MissRecord[] => {
    if (!storage) return [];
    try {
      const raw = storage.getItem(opts.key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as MissRecord[]) : [];
    } catch {
      return [];
    }
  };

  const write = (records: MissRecord[]) => {
    if (!storage) return;
    try {
      storage.setItem(opts.key, JSON.stringify(records));
    } catch {
      /* quota / private mode */
    }
  };

  return {
    log(record) {
      const next = [...read(), record];
      while (next.length > limit) next.shift();
      write(next);
    },
    snapshot: read,
  };
}

export function createHttpMissLogTransport(opts: {
  url: string;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  fetch?: typeof fetch;
}): MissLogTransport {
  const fetchFn = opts.fetch ?? globalThis.fetch?.bind(globalThis);
  return {
    async log(record) {
      if (!fetchFn) return;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(opts.getHeaders ? await opts.getHeaders() : {}),
      };
      await fetchFn(opts.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(record),
        credentials: 'include',
      });
    },
  };
}

/** Compose host telemetry with a miss-log pipeline (both always fire). */
export function composeCoachEventHandlers(
  ...handlers: Array<((event: CoachEvent) => void) | undefined>
): (event: CoachEvent) => void {
  return (event) => {
    for (const h of handlers) {
      if (!h) continue;
      try {
        h(event);
      } catch {
        /* isolated */
      }
    }
  };
}
