import { describe, expect, it } from 'vitest';
import {
  createMemoryPhraseLru,
  phraseLruKey,
  phraseLruLookup,
  phraseLruPromote,
} from './phraseLru.js';

describe('phraseLru', () => {
  it('promotes and looks up normalized keys', () => {
    const store = createMemoryPhraseLru(3);
    const key = phraseLruKey('  Open Event  ', '/director');
    phraseLruPromote(store, key, {
      stepId: 'create_event',
      slotPatches: {},
      confidence: 'high',
      rawIntent: 'goto:create_event',
    });
    const hit = phraseLruLookup(store, phraseLruKey('open event', '/director'));
    expect(hit?.stepId).toBe('create_event');
    expect(store.get(key)?.hits).toBe(2);
  });

  it('evicts least-recently-used when over cap', () => {
    const store = createMemoryPhraseLru(2);
    phraseLruPromote(store, 'a', {
      stepId: 'a',
      slotPatches: {},
      confidence: 'high',
    });
    phraseLruPromote(store, 'b', {
      stepId: 'b',
      slotPatches: {},
      confidence: 'high',
    });
    phraseLruLookup(store, 'a'); // touch a → b becomes LRU
    phraseLruPromote(store, 'c', {
      stepId: 'c',
      slotPatches: {},
      confidence: 'high',
    });
    expect(store.get('b')).toBeUndefined();
    expect(store.get('a')?.parsed.stepId).toBe('a');
    expect(store.get('c')?.parsed.stepId).toBe('c');
  });
});
