import { describe, expect, it } from 'vitest';
import { buildSemanticIndex } from './semanticRetrieve.js';
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
  controls: [
    {
      id: 'c-create',
      stepId: 'create_list',
      path: '/lists',
      openSurface: 'listDrawer',
    },
  ],
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

  it('enriches faqId / queryId / openSurface / mutationId; skips nav semantic', () => {
    const faq = [
      {
        id: 'faq-max',
        aliases: ['is max 300 enforced'],
        text: 'Max 300 caps scores.',
      },
    ];
    const queries = [
      {
        id: 'q.next',
        title: 'Next tournament',
        aliases: ['whats my next tournament'],
      },
    ];
    const semanticIndex = buildSemanticIndex({ faq, queries });
    const { results } = checkIntents({
      pack: {
        ...packPieces,
        faq,
        queries,
        semanticIndex,
        mutations: [
          {
            id: 'crm.delete',
            title: 'Delete',
            aliases: ['delete the record please'],
            risk: 'high' as const,
          },
        ],
      },
      scenarios: [
        {
          id: 'faq',
          utterance: 'is max 300 enforced',
          expect: { stepId: null, faqId: 'faq-max' },
        },
        {
          id: 'query',
          utterance: 'whats my next tournament',
          expect: { stepId: null, queryId: 'q.next' },
        },
        {
          id: 'surface',
          utterance: 'create list',
          expect: { stepId: 'create_list', openSurface: 'listDrawer' },
        },
        {
          id: 'mutation',
          utterance: 'delete the record please',
          expect: { stepId: null, mutationId: 'crm.delete' },
        },
        {
          id: 'nav-skip-query',
          utterance: 'go to whats my next tournament',
          expect: { stepId: null, queryId: 'q.next' },
        },
      ],
    });
    expect(results.find((r) => r.id === 'faq')?.ok).toBe(true);
    expect(results.find((r) => r.id === 'query')?.ok).toBe(true);
    expect(results.find((r) => r.id === 'surface')?.ok).toBe(true);
    expect(results.find((r) => r.id === 'mutation')?.ok).toBe(true);
    // Nav-shaped must not semantic-enrich queryId (parity with live dispatch).
    expect(results.find((r) => r.id === 'nav-skip-query')?.ok).toBe(false);
  });

  it('enriches faqId from semanticIndexCustom when base alone misses', () => {
    const baseFaq = [
      {
        id: 'faq-base',
        aliases: ['unrelated base phrase only'],
        text: 'Base layer.',
      },
    ];
    const customFaq = [
      {
        id: 'faq-custom',
        aliases: ['custom only paraphrase xyz'],
        text: 'Custom layer.',
      },
    ];
    const base = buildSemanticIndex({ faq: baseFaq });
    const custom = {
      ...buildSemanticIndex({ faq: customFaq }),
      layer: 'custom' as const,
    };
    const { results } = checkIntents({
      pack: {
        ...packPieces,
        faq: [...baseFaq, ...customFaq],
        semanticIndex: base,
        semanticIndexCustom: custom,
      },
      scenarios: [
        {
          id: 'custom-hit',
          utterance: 'custom only paraphrase xyz',
          expect: { stepId: null, faqId: 'faq-custom' },
        },
      ],
    });
    expect(results.find((r) => r.id === 'custom-hit')?.ok).toBe(true);
  });

  it('does not enrich faqId when pack FAQ text is empty (runtime parity)', () => {
    const faq = [
      {
        id: 'faq-empty',
        aliases: ['what is the empty faq phrase'],
        text: '   ',
      },
    ];
    const semanticIndex = buildSemanticIndex({ faq });
    const { results } = checkIntents({
      pack: {
        ...packPieces,
        faq,
        semanticIndex,
      },
      scenarios: [
        {
          id: 'empty-faq',
          utterance: 'what is the empty faq phrase',
          expect: { stepId: null, faqId: 'faq-empty' },
        },
      ],
    });
    // Scenario expects faqId but enrich must refuse empty text → fail.
    expect(results.find((r) => r.id === 'empty-faq')?.ok).toBe(false);
    expect(results.find((r) => r.id === 'empty-faq')?.actual.faqId).toBeFalsy();
  });
});
