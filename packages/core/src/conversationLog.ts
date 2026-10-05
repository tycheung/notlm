import type { CoachEvent } from './types.js';
import { sanitizeMissText, DEFAULT_MISS_TEXT_CAP, DEFAULT_MISS_REPLY_CAP } from './missLog.js';
import { fireAndForget } from './fireAndForget.js';
import {
  createLocalStorageRing,
  postJsonTransport,
  type StorageLike,
} from './logTransportShared.js';

export type { StorageLike };

export type ConversationRole = 'user' | 'assistant';

export type ConversationOutcome =
  | 'hit'
  | 'miss'
  | 'blocked'
  | 'confirm'
  | 'slot_ask'
  | 'adapter';

export type ConversationMissKind = 'unknown' | 'ambiguous' | 'low_confidence' | 'blocked';

/** Append-only turn for host sinks (hit + miss transcript). */
export type ConversationTurn = {
  conversationId: string;
  turnId: string;
  at: string;
  role: ConversationRole;
  text: string;
  outcome?: ConversationOutcome;
  stepId?: string;
  missKind?: ConversationMissKind;
  rawIntent?: string | null;
  confidence?: 'high' | 'mid' | 'low';
  pathname?: string;
  packId?: string;
};

/** Aggregated export shape for training (group turns by conversationId). */
export type ConversationRecord = {
  conversationId: string;
  packId?: string;
  startedAt: string;
  endedAt?: string;
  turns: ConversationTurn[];
};

export type ConversationTransport = {
  logTurn: (turn: ConversationTurn) => void | Promise<void>;
};

export const DEFAULT_CONVERSATION_USER_CAP = DEFAULT_MISS_TEXT_CAP;
export const DEFAULT_CONVERSATION_ASSISTANT_CAP = DEFAULT_MISS_REPLY_CAP;
export const DEFAULT_CONVERSATION_DEDUPE_MS = 2_000;

/** Host snake_case keys rejected on the portable conversation wire. */
const FORBIDDEN_SNAKE_KEYS = [
  'conversation_id',
  'turn_id',
  'pack_id',
  'raw_intent',
  'miss_kind',
  'started_at',
  'ended_at',
  'user_id',
  'client_at',
] as const;

const OUTCOME_SET = new Set<string>([
  'hit',
  'miss',
  'blocked',
  'confirm',
  'slot_ask',
  'adapter',
]);

const MISS_KIND_SET = new Set<string>([
  'unknown',
  'ambiguous',
  'low_confidence',
  'blocked',
]);

function assertPortableKeys(row: Record<string, unknown>, label: string): void {
  const bad = FORBIDDEN_SNAKE_KEYS.filter((k) => k in row);
  if (bad.length) {
    throw new Error(
      `${label}: host snake_case keys are not allowed (${bad.join(', ')}); ` +
        `use portable camelCase fields (conversationId, turnId, packId, …)`
    );
  }
}

function isOutcome(v: unknown): v is ConversationOutcome {
  return typeof v === 'string' && OUTCOME_SET.has(v);
}

function isMissKind(v: unknown): v is ConversationMissKind {
  return typeof v === 'string' && MISS_KIND_SET.has(v);
}

function coerceTurn(row: unknown, index: number): ConversationTurn {
  if (row == null || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error(`ConversationTurn[${index}]: expected an object`);
  }
  const obj = row as Record<string, unknown>;
  assertPortableKeys(obj, `ConversationTurn[${index}]`);

  const conversationId =
    typeof obj.conversationId === 'string' ? obj.conversationId.trim() : '';
  if (!conversationId) {
    throw new Error(`ConversationTurn[${index}]: missing conversationId`);
  }
  const turnId = typeof obj.turnId === 'string' ? obj.turnId.trim() : '';
  if (!turnId) {
    throw new Error(`ConversationTurn[${index}]: missing turnId`);
  }
  const at = typeof obj.at === 'string' ? obj.at.trim() : '';
  if (!at) {
    throw new Error(`ConversationTurn[${index}]: missing at`);
  }
  const role = obj.role;
  if (role !== 'user' && role !== 'assistant') {
    throw new Error(`ConversationTurn[${index}]: role must be user|assistant`);
  }
  const text = typeof obj.text === 'string' ? obj.text.trim() : '';
  if (!text) {
    throw new Error(`ConversationTurn[${index}]: missing text`);
  }

  const turn: ConversationTurn = { conversationId, turnId, at, role, text };
  if (isOutcome(obj.outcome)) turn.outcome = obj.outcome;
  if (typeof obj.stepId === 'string') turn.stepId = obj.stepId;
  if (isMissKind(obj.missKind)) turn.missKind = obj.missKind;
  if (obj.rawIntent === null) turn.rawIntent = null;
  else if (typeof obj.rawIntent === 'string') turn.rawIntent = obj.rawIntent;
  if (obj.confidence === 'high' || obj.confidence === 'mid' || obj.confidence === 'low') {
    turn.confidence = obj.confidence;
  }
  if (typeof obj.pathname === 'string') turn.pathname = obj.pathname;
  if (typeof obj.packId === 'string') turn.packId = obj.packId;
  return turn;
}

function coerceRecord(row: unknown, index: number): ConversationRecord {
  if (row == null || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error(`ConversationRecord[${index}]: expected an object`);
  }
  const obj = row as Record<string, unknown>;
  assertPortableKeys(obj, `ConversationRecord[${index}]`);

  const conversationId =
    typeof obj.conversationId === 'string' ? obj.conversationId.trim() : '';
  if (!conversationId) {
    throw new Error(`ConversationRecord[${index}]: missing conversationId`);
  }
  const startedAt = typeof obj.startedAt === 'string' ? obj.startedAt.trim() : '';
  if (!startedAt) {
    throw new Error(`ConversationRecord[${index}]: missing startedAt`);
  }
  if (!Array.isArray(obj.turns)) {
    throw new Error(`ConversationRecord[${index}]: turns must be an array`);
  }
  const turns = obj.turns.map((t, i) => coerceTurn(t, i));
  const record: ConversationRecord = { conversationId, startedAt, turns };
  if (typeof obj.packId === 'string') record.packId = obj.packId;
  if (typeof obj.endedAt === 'string') record.endedAt = obj.endedAt;
  return record;
}

/** Parse JSON array or JSONL of ConversationTurn. */
export function parseConversationTurns(raw: string): ConversationTurn[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(arr)) throw new Error('Expected a JSON array of ConversationTurns');
    return arr.map((row, i) => coerceTurn(row, i));
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => coerceTurn(JSON.parse(line) as unknown, i));
}

export function normalizeConversationTurnList(data: unknown): ConversationTurn[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected a JSON array of ConversationTurns');
  }
  return data.map((row, i) => coerceTurn(row, i));
}

/** Parse JSON array or JSONL of ConversationRecord. */
export function parseConversationRecords(raw: string): ConversationRecord[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(arr)) throw new Error('Expected a JSON array of ConversationRecords');
    return arr.map((row, i) => coerceRecord(row, i));
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => coerceRecord(JSON.parse(line) as unknown, i));
}

export function normalizeConversationRecordList(data: unknown): ConversationRecord[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected a JSON array of ConversationRecords');
  }
  return data.map((row, i) => coerceRecord(row, i));
}

/** Prefer outcome-bearing turn when the same turnId was appended twice. */
function collapseByTurnId(turns: ConversationTurn[]): ConversationTurn[] {
  const map = new Map<string, ConversationTurn>();
  for (const turn of turns) {
    const prev = map.get(turn.turnId);
    if (!prev) {
      map.set(turn.turnId, turn);
      continue;
    }
    map.set(turn.turnId, turn.outcome && !prev.outcome ? turn : { ...prev, ...turn });
  }
  return [...map.values()];
}

/** Group flat turns into ConversationRecord[] (sorted by at within each). */
export function aggregateTurnsToRecords(turns: ConversationTurn[]): ConversationRecord[] {
  const byId = new Map<string, ConversationTurn[]>();
  for (const turn of turns) {
    const list = byId.get(turn.conversationId) ?? [];
    list.push(turn);
    byId.set(turn.conversationId, list);
  }
  const records: ConversationRecord[] = [];
  for (const [conversationId, list] of byId) {
    const sorted = collapseByTurnId(list).sort((a, b) => a.at.localeCompare(b.at));
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const record: ConversationRecord = {
      conversationId,
      startedAt: first.at,
      endedAt: last.at,
      turns: sorted,
    };
    const packId = sorted.find((t) => t.packId)?.packId;
    if (packId) record.packId = packId;
    records.push(record);
  }
  return records.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/**
 * Accept either ConversationRecord[] or ConversationTurn[] JSON value.
 * Turns are aggregated by conversationId.
 */
export function normalizeConversationsDump(data: unknown): ConversationRecord[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected a JSON array of ConversationRecords or ConversationTurns');
  }
  if (data.length === 0) return [];
  const first = data[0];
  if (first != null && typeof first === 'object' && !Array.isArray(first)) {
    const obj = first as Record<string, unknown>;
    if (Array.isArray(obj.turns)) {
      return normalizeConversationRecordList(data);
    }
    if (typeof obj.turnId === 'string' || typeof obj.role === 'string') {
      return aggregateTurnsToRecords(normalizeConversationTurnList(data));
    }
  }
  throw new Error(
    'Expected ConversationRecord[] (with turns) or ConversationTurn[] (with turnId)'
  );
}

export function mintConversationId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function mintTurnId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type ConversationLogPipelineOpts = {
  transport: ConversationTransport;
  conversationId: string;
  packId?: string;
  getPathname?: () => string | undefined;
  userTextCap?: number;
  assistantTextCap?: number;
  dedupeMs?: number;
  now?: () => number;
};

export type ConversationLogPipeline = {
  conversationId: string;
  /** Log a chat message (user or assistant). */
  logChat: (role: ConversationRole, text: string, opts?: { outcome?: ConversationOutcome }) => void;
  /** Attach an outcome to the last user turn (adapter / late linkage). */
  markLastUserOutcome: (outcome: ConversationOutcome, opts?: { stepId?: string }) => void;
  /** Map coach telemetry into outcome turns (hit/miss/…). */
  onCoachEvent: (event: CoachEvent) => void;
};

/**
 * Turns coach events + chat appends into ConversationTurns.
 * Best-effort: never throws into host dispatch.
 */
export function createConversationLogPipeline(
  opts: ConversationLogPipelineOpts
): ConversationLogPipeline {
  const userCap = opts.userTextCap ?? DEFAULT_CONVERSATION_USER_CAP;
  const assistantCap = opts.assistantTextCap ?? DEFAULT_CONVERSATION_ASSISTANT_CAP;
  const dedupeMs = opts.dedupeMs ?? DEFAULT_CONVERSATION_DEDUPE_MS;
  const now = opts.now ?? (() => Date.now());
  let lastKey = '';
  let lastAt = 0;
  /** Last user turn id — outcome events attach to it when text matches. */
  let lastUserTurnId: string | null = null;
  let lastUserText = '';

  const emit = (turn: ConversationTurn) => {
    const key = `${turn.role}:${turn.outcome ?? ''}:${turn.text}:${turn.stepId ?? ''}`;
    const t = now();
    if (key === lastKey && t - lastAt < dedupeMs) return;
    lastKey = key;
    lastAt = t;
    fireAndForget(Promise.resolve(opts.transport.logTurn(turn)), 'conversationLog.transport');
  };

  const baseMeta = (): Pick<ConversationTurn, 'pathname' | 'packId'> => {
    const meta: Pick<ConversationTurn, 'pathname' | 'packId'> = {};
    if (opts.packId) meta.packId = opts.packId;
    const pathname = opts.getPathname?.();
    if (pathname) meta.pathname = pathname;
    return meta;
  };

  return {
    conversationId: opts.conversationId,
    logChat(role, text, chatOpts) {
      try {
        const cap = role === 'user' ? userCap : assistantCap;
        const cleaned = sanitizeMissText(text, cap);
        if (!cleaned) return;
        const t = now();
        const turnId = mintTurnId();
        if (role === 'user') {
          lastUserTurnId = turnId;
          lastUserText = cleaned;
        }
        emit({
          conversationId: opts.conversationId,
          turnId,
          at: new Date(t).toISOString(),
          role,
          text: cleaned,
          outcome: chatOpts?.outcome,
          ...baseMeta(),
        });
      } catch {
        /* pipeline must never break chat */
      }
    },
    markLastUserOutcome(outcome, markOpts) {
      try {
        if (!lastUserText) return;
        const t = now();
        emit({
          conversationId: opts.conversationId,
          turnId: lastUserTurnId ?? mintTurnId(),
          at: new Date(t).toISOString(),
          role: 'user',
          text: lastUserText,
          outcome,
          stepId: markOpts?.stepId,
          ...baseMeta(),
        });
      } catch {
        /* pipeline must never break chat */
      }
    },
    onCoachEvent(event) {
      try {
        const t = now();
        const at = new Date(t).toISOString();
        const meta = baseMeta();

        if (event.type === 'launch') {
          const text = sanitizeMissText(event.text ?? lastUserText, userCap);
          if (!text) return;
          emit({
            conversationId: opts.conversationId,
            turnId: lastUserTurnId ?? mintTurnId(),
            at,
            role: 'user',
            text,
            outcome: 'hit',
            stepId: event.stepId,
            rawIntent: event.rawIntent,
            confidence: event.confidence,
            ...meta,
          });
          return;
        }

        if (event.type === 'repair') {
          const text = sanitizeMissText(event.text ?? lastUserText, userCap);
          if (!text && event.kind !== 'blocked') return;
          const outcome: ConversationOutcome =
            event.kind === 'blocked' ? 'blocked' : 'miss';
          emit({
            conversationId: opts.conversationId,
            turnId: lastUserTurnId ?? mintTurnId(),
            at,
            role: 'user',
            text: text || lastUserText || '(blocked)',
            outcome,
            missKind: event.kind,
            rawIntent: event.rawIntent,
            confidence: event.confidence,
            ...meta,
          });
          return;
        }

        if (event.type === 'blocked') {
          emit({
            conversationId: opts.conversationId,
            turnId: lastUserTurnId ?? mintTurnId(),
            at,
            role: 'user',
            text: lastUserText || '(blocked)',
            outcome: 'blocked',
            stepId: event.stepId,
            missKind: 'blocked',
            ...meta,
          });
          return;
        }

        if (event.type === 'confirm_ask') {
          emit({
            conversationId: opts.conversationId,
            turnId: lastUserTurnId ?? mintTurnId(),
            at,
            role: 'user',
            text: lastUserText || '(confirm)',
            outcome: 'confirm',
            stepId: event.stepId,
            ...meta,
          });
          return;
        }

        if (event.type === 'slot_ask') {
          emit({
            conversationId: opts.conversationId,
            turnId: lastUserTurnId ?? mintTurnId(),
            at,
            role: 'user',
            text: lastUserText || '(slot)',
            outcome: 'slot_ask',
            stepId: event.stepId,
            ...meta,
          });
        }
      } catch {
        /* pipeline must never break dispatch */
      }
    },
  };
}

export type MemoryConversationTransport = ConversationTransport & {
  snapshot: () => ConversationTurn[];
  snapshotRecords: () => ConversationRecord[];
  clear: () => void;
};

export function createMemoryConversationTransport(opts?: {
  limit?: number;
}): MemoryConversationTransport {
  const limit = opts?.limit ?? 500;
  const turns: ConversationTurn[] = [];
  return {
    logTurn(turn) {
      turns.push(turn);
      while (turns.length > limit) turns.shift();
    },
    snapshot: () => [...turns],
    snapshotRecords: () => aggregateTurnsToRecords(turns),
    clear: () => {
      turns.length = 0;
    },
  };
}

export function createLocalStorageConversationTransport(opts: {
  key: string;
  limit?: number;
  storage?: StorageLike;
}): ConversationTransport & { snapshot: () => ConversationTurn[] } {
  const ring = createLocalStorageRing<ConversationTurn>({
    key: opts.key,
    limit: opts.limit ?? 500,
    storage: opts.storage,
    normalize: (parsed) =>
      Array.isArray(parsed) ? normalizeConversationTurnList(parsed) : [],
  });
  return {
    logTurn: (turn) => ring.append(turn),
    snapshot: ring.snapshot,
  };
}

export function createHttpConversationTransport(opts: {
  url: string;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  fetch?: typeof fetch;
}): ConversationTransport {
  const post = postJsonTransport(opts);
  return { async logTurn(turn) { await post(turn); } };
}
