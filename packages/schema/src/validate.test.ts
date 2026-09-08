import { describe, expect, it } from 'vitest';
import {
  PACK_SCHEMA_VERSION,
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
