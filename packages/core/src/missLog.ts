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

export type MissProposedType = 'faq' | 'goto' | 'meta' | 'refuse';

export type MissProposed = {
  type: MissProposedType;
  stepId?: string;
  faqId?: string;
  aliases?: string[];
};

/** MissRecord + LLM reply for training recalibration (1A accept-gated). */
export type MissExchange = MissRecord & {
  llmReply: string;
  proposed?: MissProposed;
  provider?: { id: string; model: string };
  exchangeId?: string;
};

export type MissLogTransport = {
  log: (record: MissRecord) => void | Promise<void>;
};

export type MissExchangeTransport = {
  logExchange: (exchange: MissExchange) => void | Promise<void>;
};

export const DEFAULT_MISS_TEXT_CAP = 500;
export const DEFAULT_MISS_REPLY_CAP = 2000;
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

/** Host snake_case keys that must not appear on the portable wire contract. */
const FORBIDDEN_SNAKE_KEYS = [
  'utterance',
  'pack_id',
  'raw_intent',
  'client_at',
  'user_id',
  'consumed_at',
  'created_at',
] as const;

function assertPortableMissKeys(row: Record<string, unknown>, index: number): void {
  const bad = FORBIDDEN_SNAKE_KEYS.filter((k) => k in row);
  if (bad.length) {
    throw new Error(
      `MissRecord[${index}]: host snake_case keys are not allowed (${bad.join(', ')}); ` +
        `use portable MissRecord fields (text, packId, rawIntent, at, …)`
    );
  }
}

function coerceMissRecord(row: unknown, index: number): MissRecord {
  if (row == null || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error(`MissRecord[${index}]: expected an object`);
  }
  const obj = row as Record<string, unknown>;
  assertPortableMissKeys(obj, index);

  const text = typeof obj.text === 'string' ? obj.text.trim() : '';
  if (!text) {
    throw new Error(`MissRecord[${index}]: missing required string field 'text'`);
  }
  const kindRaw = obj.kind;
  if (typeof kindRaw !== 'string' || !isMissKind(kindRaw)) {
    throw new Error(
      `MissRecord[${index}]: kind must be one of unknown|ambiguous|low_confidence`
    );
  }
  const at = typeof obj.at === 'string' ? obj.at.trim() : '';
  if (!at) {
    throw new Error(`MissRecord[${index}]: missing required string field 'at'`);
  }

  const record: MissRecord = { text, kind: kindRaw, at };
  if (typeof obj.packId === 'string') record.packId = obj.packId;
  if (typeof obj.pathname === 'string') record.pathname = obj.pathname;
  if (obj.rawIntent === null) record.rawIntent = null;
  else if (typeof obj.rawIntent === 'string') record.rawIntent = obj.rawIntent;
  if (obj.confidence === 'high' || obj.confidence === 'mid' || obj.confidence === 'low') {
    record.confidence = obj.confidence;
  }
  return record;
}

/**
 * Parse a JSON array or JSONL dump of portable MissRecords.
 * Rejects snake_case host dumps (utterance/pack_id/…) so tuning stays on-contract.
 * Host extras (id, userId, …) are ignored after validation.
 */
export function parseMissRecords(raw: string): MissRecord[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(arr)) throw new Error('Expected a JSON array of MissRecords');
    return arr.map((row, i) => coerceMissRecord(row, i));
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => coerceMissRecord(JSON.parse(line) as unknown, i));
}

/**
 * Normalize an already-parsed JSON value (e.g. HTTP GET body) to MissRecord[].
 */
export function normalizeMissRecordList(data: unknown): MissRecord[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected a JSON array of MissRecords');
  }
  return data.map((row, i) => coerceMissRecord(row, i));
}

function coerceProposed(raw: unknown, index: number): MissProposed | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`MissExchange[${index}]: proposed must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (type !== 'faq' && type !== 'goto' && type !== 'meta' && type !== 'refuse') {
    throw new Error(`MissExchange[${index}]: proposed.type invalid`);
  }
  const proposed: MissProposed = { type };
  if (typeof obj.stepId === 'string') proposed.stepId = obj.stepId;
  if (typeof obj.faqId === 'string') proposed.faqId = obj.faqId;
  if (Array.isArray(obj.aliases)) {
    proposed.aliases = obj.aliases.filter((a): a is string => typeof a === 'string');
  }
  return proposed;
}

function coerceMissExchange(row: unknown, index: number): MissExchange {
  const base = coerceMissRecord(row, index);
  const obj = row as Record<string, unknown>;
  const llmReply =
    typeof obj.llmReply === 'string' ? sanitizeMissText(obj.llmReply, DEFAULT_MISS_REPLY_CAP) : '';
  if (!llmReply) {
    throw new Error(`MissExchange[${index}]: missing required string field 'llmReply'`);
  }
  const exchange: MissExchange = { ...base, llmReply };
  const proposed = coerceProposed(obj.proposed, index);
  if (proposed) exchange.proposed = proposed;
  if (obj.provider != null && typeof obj.provider === 'object' && !Array.isArray(obj.provider)) {
    const p = obj.provider as Record<string, unknown>;
    if (typeof p.id === 'string' && typeof p.model === 'string') {
      exchange.provider = { id: p.id, model: p.model };
    }
  }
  if (typeof obj.exchangeId === 'string') exchange.exchangeId = obj.exchangeId;
  return exchange;
}

export function parseMissExchanges(raw: string): MissExchange[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(arr)) throw new Error('Expected a JSON array of MissExchanges');
    return arr.map((row, i) => coerceMissExchange(row, i));
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => coerceMissExchange(JSON.parse(line) as unknown, i));
}

export function normalizeMissExchangeList(data: unknown): MissExchange[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected a JSON array of MissExchanges');
  }
  return data.map((row, i) => coerceMissExchange(row, i));
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

export function createHttpMissExchangeTransport(opts: {
  url: string;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  fetch?: typeof fetch;
}): MissExchangeTransport {
  const fetchFn = opts.fetch ?? globalThis.fetch?.bind(globalThis);
  return {
    async logExchange(exchange) {
      if (!fetchFn) return;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(opts.getHeaders ? await opts.getHeaders() : {}),
      };
      await fetchFn(opts.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(exchange),
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
