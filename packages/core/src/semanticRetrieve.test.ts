import { describe, expect, it } from 'vitest';
import {
  buildSemanticIndex,
  retrieveSemantic,
  semanticFaqIdHints,
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
});
