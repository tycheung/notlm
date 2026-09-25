import { describe, expect, it } from 'vitest';
import {
  PACK_SCHEMA_VERSION,
  validateConversationRecord,
  validateConversationTurn,
  validateMissRecord,
  validateMissRecordList,
  validatePackFolder,
  validateScenarios,
} from './index.js';

const validFlow = [
  {
    id: 'create_list',
    title: 'Create list',
    kind: 'hard',
    requires: [],
    keywords: ['list'],
  },
];

const validFolder = {
  manifest: { id: 'demo-todo', version: '0.0.0' },
  flow: validFlow,
  controls: [{ id: 'guide-create', stepId: 'create_list', path: '/lists/new' }],
  intents: { aliases: { create_list: ['make a list'] }, meta: ['whats_next'] },
  binders: [{ stepId: 'create_list', path: 'data.listCount', op: 'gte', value: 1 }],
  corpus: [{ utterance: 'make a list', expect: { stepId: 'create_list' } }],
  scenarios: [
    { id: 's1', utterance: 'make a list', expect: { stepId: 'create_list' } },
    { id: 'neg', utterance: 'hello world', expect: { stepId: null } },
  ],
  config: { guideAttr: 'data-guide-id', author: { provider: null } },
};

describe('PACK_SCHEMA_VERSION', () => {
  it('is 1', () => {
    expect(PACK_SCHEMA_VERSION).toBe(1);
  });
});

describe('validatePackFolder', () => {
  it('accepts a permissive valid pack folder', () => {
    const result = validatePackFolder(validFolder);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('requires flow step id/title/kind/requires', () => {
    const result = validatePackFolder({
      flow: [{ id: 'x', title: 'X' }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('kind') || e.includes('requires'))).toBe(true);
  });

  it('requires intents.aliases object', () => {
    const result = validatePackFolder({
      intents: { meta: ['whats_next'] },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('aliases'))).toBe(true);
  });

  it('requires binders to be an array', () => {
    const result = validatePackFolder({
      binders: { create_list: { path: 'data.x', op: 'truthy' } },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('binders') && e.includes('array'))).toBe(true);
  });

  it('skips missing optional pieces', () => {
    const result = validatePackFolder({
      manifest: { id: 'only-manifest' },
    });
    expect(result.ok).toBe(true);
  });
});

describe('validateScenarios', () => {
  it('accepts stepId null for negative cases', () => {
    const result = validateScenarios([
      { utterance: 'nope', expect: { stepId: null } },
      { utterance: 'go', expect: { stepId: 'create_list' } },
    ]);
    expect(result.ok).toBe(true);
  });

  it('rejects scenarios missing utterance/expect', () => {
    const result = validateScenarios([{ id: 'bad' }]);
    expect(result.ok).toBe(false);
  });
});

describe('validateMissRecord', () => {
  it('accepts portable MissRecord with host extras', () => {
    const result = validateMissRecord({
      text: 'xyzzy',
      kind: 'unknown',
      at: '2026-01-01T00:00:00.000Z',
      packId: 'demo',
      id: 42,
      userId: 7,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects missing text', () => {
    const result = validateMissRecord({ kind: 'unknown', at: 't' });
    expect(result.ok).toBe(false);
  });
});

describe('validateMissRecordList', () => {
  it('accepts a list of portable records', () => {
    const result = validateMissRecordList([
      { text: 'a', kind: 'unknown', at: 't1' },
      { text: 'b', kind: 'ambiguous', at: 't2', confidence: 'mid' },
    ]);
    expect(result.ok).toBe(true);
  });

  it('rejects non-array', () => {
    const result = validateMissRecordList({ text: 'a', kind: 'unknown', at: 't' });
    expect(result.ok).toBe(false);
  });
});

describe('validateConversationTurn', () => {
  it('accepts a portable turn and record', () => {
    const turn = {
      conversationId: 'c1',
      turnId: 't1',
      at: '2026-01-01T00:00:00.000Z',
      role: 'user',
      text: 'create event',
      outcome: 'hit',
      stepId: 'create_event',
    };
    expect(validateConversationTurn(turn).ok).toBe(true);
    expect(
      validateConversationRecord({
        conversationId: 'c1',
        startedAt: '2026-01-01T00:00:00.000Z',
        turns: [turn],
      }).ok
    ).toBe(true);
  });
});
