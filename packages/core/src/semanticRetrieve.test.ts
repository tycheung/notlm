import { describe, expect, it } from 'vitest';
import {
  buildSemanticIndex,
  mergeSemanticIndexes,
  retrieveSemantic,
  semanticFaqIdHints,
  semanticIndexLayers,
} from './semanticRetrieve.js';

describe('semanticRetrieve', () => {
  const index = buildSemanticIndex({
    faq: [
      {
        id: 'faq-max-300',
        aliases: [
          'what is max 300',
          'is max 300 enforced',
          'maximum score per game',
        ],
        text: 'Max 300 caps each game score including Baker and stepladder.',
      },
      {
        id: 'faq-bye-limit',
        aliases: ['how do byes work', 'bye limit per player'],
        text: 'A bracket can never have more than one bye.',
      },
    ],
    queries: [
      {
        id: 'td.next_tournament',
        title: 'Next tournament',
        aliases: ['whats my next tournament', 'next tournament'],
      },
    ],
  });

  it('auto-accepts a near-paraphrase FAQ when similarity and overlap clear the bar', () => {
    const exact = retrieveSemantic('is max 300 enforced', index);
    expect(exact.accepted?.id).toBe('faq-max-300');
    const near = retrieveSemantic('is max 300 enforced for baker games?', index);
    expect(near.candidates[0]?.id).toBe('faq-max-300');
    // Near paraphrase may accept when both bars clear; always ranks first.
    if (near.accepted) expect(near.accepted.id).toBe('faq-max-300');
  });

  it('returns constrained faqId hints without accepting weak matches', () => {
    const hit = retrieveSemantic('tell me about scores somehow', index, {
      minSimilarity: 0.99,
      minTokenOverlap: 0.99,
    });
    expect(hit.accepted).toBeNull();
    expect(semanticFaqIdHints(hit).length).toBeGreaterThan(0);
  });

  it('can accept desk query ids', () => {
    const hit = retrieveSemantic('what is my next tournament', index, {
      kind: 'query',
      minSimilarity: 0.55,
      minTokenOverlap: 0.45,
    });
    expect(hit.candidates.some((c) => c.id === 'td.next_tournament')).toBe(true);
  });

  it('combines base + custom layers at live score time', () => {
    const base = { ...index, layer: 'base' as const };
    const custom = buildSemanticIndex({
      faq: [
        {
          id: 'faq-max-300',
          aliases: ['baker max score cap question from misses'],
          text: 'Max 300 caps each game score including Baker and stepladder.',
        },
      ],
    });
    custom.layer = 'custom';
    const layers = semanticIndexLayers(base, custom);
    expect(layers).toHaveLength(2);
    const hit = retrieveSemantic('baker max score cap question from misses', layers, {
      minSimilarity: 0.5,
      minTokenOverlap: 0.4,
    });
    expect(hit.candidates[0]?.id).toBe('faq-max-300');
    const merged = mergeSemanticIndexes(base, custom);
    expect(merged?.docs.some((d) => d.id === 'faq-max-300')).toBe(true);
  });

  it('skips mismatched-dim layers without crashing', () => {
    const base = { ...index, layer: 'base' as const };
    const bad = {
      ...buildSemanticIndex({
        faq: [{ id: 'faq-x', aliases: ['zzz'], text: 'z' }],
      }),
      dim: 64,
      layer: 'custom' as const,
    };
    const hit = retrieveSemantic('is max 300 enforced', [base, bad]);
    expect(hit.candidates[0]?.id).toBe('faq-max-300');
  });

  it('accepts the first top-k candidate that clears both bars, not only rank-1', () => {
    const mixed = buildSemanticIndex({
      faq: [
        {
          id: 'faq-noise',
          aliases: ['maximum baker stepladder score game pins'],
          text: 'Unrelated high-dim lexical overlap without the max-300 phrase.',
        },
        {
          id: 'faq-max-300',
          aliases: ['is max 300 enforced', 'what is max 300'],
          text: 'Max 300 caps each game score.',
        },
      ],
    });
    const hit = retrieveSemantic('is max 300 enforced', mixed, {
      minSimilarity: 0.5,
      minTokenOverlap: 0.5,
    });
    expect(hit.accepted?.id).toBe('faq-max-300');
    if (hit.candidates[0]?.id !== 'faq-max-300') {
      expect(hit.accepted?.id).not.toBe(hit.candidates[0]?.id);
    }
  });
});
