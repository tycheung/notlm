import { describe, expect, it, vi } from 'vitest';
import {
  composeCoachEventHandlers,
  createHttpMissExchangeTransport,
  createHttpMissLogTransport,
  createLocalStorageMissLogTransport,
  createMemoryMissLogTransport,
  createMissLogPipeline,
  normalizeMissExchangeList,
  normalizeMissRecordList,
  parseMissExchanges,
  parseMissRecords,
  sanitizeMissText,
} from './missLog.js';
import type { CoachEvent } from './types.js';

describe('sanitizeMissText', () => {
  it('trims, strips controls, and caps length', () => {
    expect(sanitizeMissText('  hello\u0000world  ', 8)).toBe('hellowor');
  });
});

describe('parseMissRecords', () => {
  it('parses JSON array and ignores host camelCase extras', () => {
    const records = parseMissRecords(
      JSON.stringify([
        {
          text: 'xyzzy',
          kind: 'unknown',
          at: '2026-01-01T00:00:00.000Z',
          id: 9,
          userId: 1,
        },
      ])
    );
    expect(records).toEqual([
      { text: 'xyzzy', kind: 'unknown', at: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('parses JSONL', () => {
    const raw = [
      JSON.stringify({ text: 'a', kind: 'unknown', at: 't1' }),
      JSON.stringify({ text: 'b', kind: 'ambiguous', at: 't2' }),
    ].join('\n');
    expect(parseMissRecords(raw).map((r) => r.text)).toEqual(['a', 'b']);
  });

  it('rejects snake_case host dumps', () => {
    expect(() =>
      parseMissRecords(
        JSON.stringify([{ utterance: 'nope', kind: 'unknown', at: 't' }])
      )
    ).toThrow(/snake_case/);
  });

  it('rejects missing text', () => {
    expect(() =>
      parseMissRecords(JSON.stringify([{ kind: 'unknown', at: 't' }]))
    ).toThrow(/text/);
  });
});

describe('normalizeMissRecordList', () => {
  it('accepts portable rows with packId', () => {
    expect(
      normalizeMissRecordList([
        { text: 'x', kind: 'low_confidence', at: 't', packId: 'demo', confidence: 'low' },
      ])
    ).toEqual([
      {
        text: 'x',
        kind: 'low_confidence',
        at: 't',
        packId: 'demo',
        confidence: 'low',
      },
    ]);
  });
});

describe('MissExchange parse/normalize', () => {
  it('parses exchange JSON with proposed + provider', () => {
    const rows = parseMissExchanges(
      JSON.stringify([
        {
          text: 'how do i seed?',
          kind: 'unknown',
          at: '2026-01-01T00:00:00.000Z',
          llmReply: 'Open Seeding under the event.',
          proposed: { type: 'goto', stepId: 'seeding', aliases: ['seed'] },
          provider: { id: 'openai', model: 'gpt-4o-mini' },
          exchangeId: 'ex-1',
        },
      ])
    );
    expect(rows[0]).toMatchObject({
      text: 'how do i seed?',
      llmReply: 'Open Seeding under the event.',
      proposed: { type: 'goto', stepId: 'seeding', aliases: ['seed'] },
      provider: { id: 'openai', model: 'gpt-4o-mini' },
      exchangeId: 'ex-1',
    });
  });

  it('parses capability proposed types (query/mutation/tour/search)', () => {
    const rows = parseMissExchanges(
      JSON.stringify([
        {
          text: 'when is my next item',
          kind: 'unknown',
          at: '2026-01-01T00:00:00.000Z',
          llmReply: 'Your next item is Sample.',
          proposed: { type: 'query', queryId: 'next_item' },
        },
        {
          text: 'assign badge',
          kind: 'unknown',
          at: '2026-01-01T00:00:01.000Z',
          llmReply: 'Confirm assign?',
          proposed: { type: 'mutation', mutationId: 'assign_badge' },
        },
      ])
    );
    expect(rows[0]?.proposed).toEqual({ type: 'query', queryId: 'next_item' });
    expect(rows[1]?.proposed).toEqual({
      type: 'mutation',
      mutationId: 'assign_badge',
    });
  });

  it('parses JSONL exchanges and rejects missing llmReply', () => {
    const line = JSON.stringify({
      text: 'a',
      kind: 'unknown',
      at: 't',
      llmReply: 'hi',
      proposed: { type: 'faq', faqId: 'f1' },
    });
    expect(parseMissExchanges(line)[0]?.proposed?.faqId).toBe('f1');
    expect(() =>
      normalizeMissExchangeList([{ text: 'a', kind: 'unknown', at: 't' }])
    ).toThrow(/llmReply/);
  });

  it('rejects invalid proposed shapes', () => {
    expect(() =>
      normalizeMissExchangeList([
        {
          text: 'a',
          kind: 'unknown',
          at: 't',
          llmReply: 'x',
          proposed: { type: 'nope' },
        },
      ])
    ).toThrow(/proposed\.type/);
    expect(() =>
      normalizeMissExchangeList([
        {
          text: 'a',
          kind: 'unknown',
          at: 't',
          llmReply: 'x',
          proposed: ['bad'],
        },
      ])
    ).toThrow(/proposed must be an object/);
  });
});

describe('createMissLogPipeline', () => {
  it('logs unknown / ambiguous / low_confidence with text', () => {
    const mem = createMemoryMissLogTransport();
    const pipe = createMissLogPipeline({
      transport: mem,
      packId: 'demo',
      getPathname: () => '/lists',
      now: () => 1_700_000_000_000,
    });
    pipe.onCoachEvent({
      type: 'repair',
      kind: 'unknown',
      text: 'xyzzy nonsense',
      rawIntent: 'unknown',
    });
    expect(mem.snapshot()).toEqual([
      {
        text: 'xyzzy nonsense',
        kind: 'unknown',
        packId: 'demo',
        pathname: '/lists',
        rawIntent: 'unknown',
        at: new Date(1_700_000_000_000).toISOString(),
      },
    ]);
  });

  it('ignores blocked and empty text', () => {
    const mem = createMemoryMissLogTransport();
    const pipe = createMissLogPipeline({ transport: mem });
    pipe.onCoachEvent({ type: 'repair', kind: 'blocked' });
    pipe.onCoachEvent({ type: 'repair', kind: 'unknown', text: '   ' });
    pipe.onCoachEvent({ type: 'launch', stepId: 'a' });
    expect(mem.snapshot()).toEqual([]);
  });

  it('dedupes identical kind+text within the window', () => {
    let t = 1000;
    const mem = createMemoryMissLogTransport();
    const pipe = createMissLogPipeline({
      transport: mem,
      dedupeMs: 5000,
      now: () => t,
    });
    pipe.onCoachEvent({ type: 'repair', kind: 'unknown', text: 'huh' });
    t = 2000;
    pipe.onCoachEvent({ type: 'repair', kind: 'unknown', text: 'huh' });
    expect(mem.snapshot()).toHaveLength(1);
    t = 8000;
    pipe.onCoachEvent({ type: 'repair', kind: 'unknown', text: 'huh' });
    expect(mem.snapshot()).toHaveLength(2);
  });

  it('swallows transport errors', async () => {
    const pipe = createMissLogPipeline({
      transport: {
        log: () => {
          throw new Error('boom');
        },
      },
    });
    expect(() =>
      pipe.onCoachEvent({ type: 'repair', kind: 'unknown', text: 'x' })
    ).not.toThrow();
  });
});

describe('transports', () => {
  it('memory respects limit', () => {
    const mem = createMemoryMissLogTransport({ limit: 2 });
    mem.log({ text: 'a', kind: 'unknown', at: '1' });
    mem.log({ text: 'b', kind: 'unknown', at: '2' });
    mem.log({ text: 'c', kind: 'unknown', at: '3' });
    expect(mem.snapshot().map((r) => r.text)).toEqual(['b', 'c']);
  });

  it('localStorage round-trips', () => {
    const store = new Map<string, string>();
    const transport = createLocalStorageMissLogTransport({
      key: 'notlm:misses',
      storage: {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => {
          store.set(k, v);
        },
      },
    });
    transport.log({ text: 'miss me', kind: 'ambiguous', at: 't' });
    expect(transport.snapshot()[0]?.text).toBe('miss me');
  });

  it('http posts MissRecord JSON', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const transport = createHttpMissLogTransport({
      url: '/api/notlm/misses',
      fetch: fetchMock as unknown as typeof fetch,
      getHeaders: () => ({ Authorization: 'Bearer x' }),
    });
    await transport.log({ text: 'wat', kind: 'unknown', packId: 'p', at: 't' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      text: 'wat',
      kind: 'unknown',
      packId: 'p',
    });
  });

  it('localStorage handles corrupt JSON and write failures', () => {
    const transport = createLocalStorageMissLogTransport({
      key: 'k',
      storage: {
        getItem: () => '{not-json',
        setItem: () => {
          throw new Error('quota');
        },
      },
    });
    expect(transport.snapshot()).toEqual([]);
    expect(() =>
      transport.log({ text: 'x', kind: 'unknown', at: 't' })
    ).not.toThrow();
  });

  it('http exchange posts MissExchange JSON and no-ops without fetch', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const transport = createHttpMissExchangeTransport({
      url: '/api/notlm/misses',
      fetch: fetchMock as unknown as typeof fetch,
      getHeaders: async () => ({ Authorization: 'Bearer y' }),
    });
    await transport.logExchange({
      text: 'wat',
      kind: 'unknown',
      at: 't',
      llmReply: 'try seeding',
      proposed: { type: 'meta' },
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toMatchObject({
      llmReply: 'try seeding',
      proposed: { type: 'meta' },
    });

    const prior = globalThis.fetch;
    // Force the no-fetch branch (Node always has fetch otherwise).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = undefined;
    try {
      const noop = createHttpMissExchangeTransport({ url: '/x' });
      await expect(
        noop.logExchange({ text: 'a', kind: 'unknown', at: 't', llmReply: 'b' })
      ).resolves.toBeUndefined();
    } finally {
      globalThis.fetch = prior;
    }
  });
});

describe('composeCoachEventHandlers', () => {
  it('runs all handlers and isolates throws', () => {
    const seen: CoachEvent['type'][] = [];
    const composed = composeCoachEventHandlers(
      () => {
        throw new Error('nope');
      },
      (e) => {
        seen.push(e.type);
      }
    );
    composed({ type: 'utterance', textLength: 1 });
    expect(seen).toEqual(['utterance']);
  });
});
