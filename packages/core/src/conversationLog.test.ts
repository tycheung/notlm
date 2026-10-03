import { describe, expect, it, vi } from 'vitest';
import {
  aggregateTurnsToRecords,
  createConversationLogPipeline,
  createHttpConversationTransport,
  createLocalStorageConversationTransport,
  createMemoryConversationTransport,
  mintConversationId,
  normalizeConversationsDump,
  parseConversationTurns,
  type ConversationTurn,
} from './conversationLog.js';

describe('conversationLog parse', () => {
  it('parses turns and rejects snake_case', () => {
    const turns = parseConversationTurns(
      JSON.stringify([
        {
          conversationId: 'c1',
          turnId: 't1',
          at: '2026-01-01T00:00:00.000Z',
          role: 'user',
          text: 'create event',
          outcome: 'hit',
          stepId: 'create_event',
        },
      ])
    );
    expect(turns[0]?.outcome).toBe('hit');
    expect(() =>
      parseConversationTurns(
        JSON.stringify([
          {
            conversation_id: 'c1',
            turnId: 't1',
            at: 't',
            role: 'user',
            text: 'x',
          },
        ])
      )
    ).toThrow(/snake_case/);
  });

  it('aggregates turns into records and collapses same turnId', () => {
    const turns: ConversationTurn[] = [
      {
        conversationId: 'c1',
        turnId: 't1',
        at: '2026-01-01T00:00:01.000Z',
        role: 'user',
        text: 'open event',
      },
      {
        conversationId: 'c1',
        turnId: 't1',
        at: '2026-01-01T00:00:02.000Z',
        role: 'user',
        text: 'open event',
        outcome: 'hit',
        stepId: 'open_event',
      },
      {
        conversationId: 'c1',
        turnId: 't2',
        at: '2026-01-01T00:00:03.000Z',
        role: 'assistant',
        text: 'Opening…',
      },
    ];
    const records = aggregateTurnsToRecords(turns);
    expect(records).toHaveLength(1);
    expect(records[0]!.turns).toHaveLength(2);
    expect(records[0]!.turns[0]?.outcome).toBe('hit');
  });

  it('normalizeConversationsDump accepts records or turns', () => {
    const fromTurns = normalizeConversationsDump([
      {
        conversationId: 'c1',
        turnId: 't1',
        at: '2026-01-01T00:00:00.000Z',
        role: 'user',
        text: 'hi',
        outcome: 'miss',
        missKind: 'unknown',
      },
    ]);
    expect(fromTurns[0]?.conversationId).toBe('c1');
    const fromRecords = normalizeConversationsDump([
      {
        conversationId: 'c2',
        startedAt: '2026-01-01T00:00:00.000Z',
        turns: [
          {
            conversationId: 'c2',
            turnId: 't1',
            at: '2026-01-01T00:00:00.000Z',
            role: 'user',
            text: 'hi',
          },
        ],
      },
    ]);
    expect(fromRecords[0]?.turns).toHaveLength(1);
  });
});

describe('createConversationLogPipeline', () => {
  it('logs hit and miss under one conversationId', () => {
    const mem = createMemoryConversationTransport();
    const id = mintConversationId();
    const pipe = createConversationLogPipeline({
      transport: mem,
      conversationId: id,
      packId: 'demo',
      now: (() => {
        let t = 1_700_000_000_000;
        return () => {
          t += 1000;
          return t;
        };
      })(),
      dedupeMs: 0,
    });

    pipe.logChat('user', 'create list');
    pipe.onCoachEvent({
      type: 'launch',
      stepId: 'create_list',
      text: 'create list',
      confidence: 'high',
    });
    pipe.logChat('assistant', 'Opening create list');
    pipe.logChat('user', 'asdfgh');
    pipe.onCoachEvent({
      type: 'repair',
      kind: 'unknown',
      text: 'asdfgh',
    });

    const snap = mem.snapshot();
    expect(snap.every((t) => t.conversationId === id)).toBe(true);
    expect(snap.some((t) => t.outcome === 'hit' && t.stepId === 'create_list')).toBe(
      true
    );
    expect(snap.some((t) => t.outcome === 'miss' && t.missKind === 'unknown')).toBe(
      true
    );
    expect(snap.some((t) => t.role === 'assistant')).toBe(true);

    const records = mem.snapshotRecords();
    expect(records).toHaveLength(1);
  });

  it('skips launch without text and prior user', () => {
    const mem = createMemoryConversationTransport();
    const pipe = createConversationLogPipeline({
      transport: mem,
      conversationId: 'c',
      dedupeMs: 0,
    });
    pipe.onCoachEvent({ type: 'launch', stepId: 'x' });
    expect(mem.snapshot()).toHaveLength(0);
  });

  it('markLastUserOutcome tags adapter', () => {
    const mem = createMemoryConversationTransport();
    const pipe = createConversationLogPipeline({
      transport: mem,
      conversationId: 'c',
      dedupeMs: 0,
    });
    pipe.logChat('user', 'format stuff');
    pipe.markLastUserOutcome('adapter');
    const records = mem.snapshotRecords();
    expect(records[0]?.turns.some((t) => t.outcome === 'adapter')).toBe(true);
  });
});

describe('conversation transports', () => {
  it('http posts ConversationTurn JSON', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const transport = createHttpConversationTransport({
      url: '/api/notlm/conversations',
      fetch: fetchMock as unknown as typeof fetch,
      getHeaders: () => ({ Authorization: 'Bearer x' }),
    });
    await transport.logTurn({
      conversationId: 'c1',
      turnId: 't1',
      at: 't',
      role: 'user',
      text: 'hi',
      outcome: 'hit',
      stepId: 'create_list',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toMatchObject({
      conversationId: 'c1',
      outcome: 'hit',
      stepId: 'create_list',
    });
  });

  it('localStorage persists and recovers from corrupt JSON', () => {
    const store = new Map<string, string>();
    const transport = createLocalStorageConversationTransport({
      key: 'notlm:conv',
      storage: {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => {
          store.set(k, v);
        },
      },
    });
    transport.logTurn({
      conversationId: 'c1',
      turnId: 't1',
      at: 't',
      role: 'user',
      text: 'hi',
    });
    expect(transport.snapshot()).toHaveLength(1);

    const broken = createLocalStorageConversationTransport({
      key: 'k',
      storage: {
        getItem: () => '{not-json',
        setItem: () => {
          throw new Error('quota');
        },
      },
    });
    expect(broken.snapshot()).toEqual([]);
    expect(() =>
      broken.logTurn({
        conversationId: 'c',
        turnId: 't',
        at: 't',
        role: 'assistant',
        text: 'ok',
      })
    ).not.toThrow();
  });
});
