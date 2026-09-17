import { describe, expect, it } from 'vitest';
import { checkIntents } from './intentsCheck.js';

const packPieces = {
  manifest: { id: 't' },
  flow: [
    {
      id: 'create_list',
      title: 'Create list',
      keywords: ['create list'],
      kind: 'hard' as const,
      requires: [] as string[],
    },
    {
      id: 'add_item',
      title: 'Add item',
      keywords: ['add todo'],
      kind: 'hard' as const,
      requires: ['create_list'],
    },
  ],
  controls: [] as [],
  intents: {
    aliases: {
      create_list: ['make a list'],
      add_item: ['add an item'],
    },
  },
  binders: [{ stepId: 'create_list', path: 'data.listCount', op: 'gte', value: 1 }],
};

describe('checkIntents', () => {
  it('passes matching scenarios and reports mismatches', () => {
    const { ok, results } = checkIntents({
      pack: packPieces,
      scenarios: [
        { id: 'ok', utterance: 'create list', expect: { stepId: 'create_list' } },
        { id: 'alias', utterance: 'make a list', expect: { stepId: 'create_list' } },
        {
          id: 'bad',
          utterance: 'create list',
          expect: { stepId: 'add_item', goBack: true, isCorrection: true, rawIntent: 'help' },
        },
      ],
    });
    expect(ok).toBe(false);
    expect(results[0]!.ok).toBe(true);
    expect(results[1]!.ok).toBe(true);
    expect(results[2]!.ok).toBe(false);
    expect(results[2]!.errors.some((e) => e.startsWith('stepId:'))).toBe(true);
    expect(results[2]!.errors.some((e) => e.startsWith('goBack:'))).toBe(true);
  });

  it('accepts object binders map', () => {
    const { ok } = checkIntents({
      pack: {
        ...packPieces,
        binders: {
          create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        },
      },
      scenarios: [{ utterance: 'add todo', expect: { stepId: 'add_item' } }],
    });
    expect(ok).toBe(true);
  });
});
