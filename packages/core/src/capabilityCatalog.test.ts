import { describe, expect, it } from 'vitest';
import {
  matchQueryEntry,
  looksLikeContextAsk,
  looksLikeExplainLast,
  utteranceMatchesTypedCatalog,
} from './capabilityCatalog.js';

describe('capabilityCatalog', () => {
  const queries = [
    {
      id: 'td.next_tournament',
      title: 'Next tournament',
      aliases: [
        'when is my next tournament',
        'can you let me know when the next tournament I\'m hosting is and where',
      ],
    },
  ];

  it('matches next tournament schedule ask', () => {
    const hit = matchQueryEntry(
      queries,
      'can you let me know when the next tournament I\'m hosting is and where at'
    );
    expect(hit?.id).toBe('td.next_tournament');
  });

  it('detects context and explain-last heuristics', () => {
    expect(looksLikeContextAsk("why can't I save this form")).toBe(true);
    expect(looksLikeContextAsk("what's blocking me")).toBe(true);
    expect(looksLikeContextAsk('why is save disabled')).toBe(true);
    expect(looksLikeExplainLast('what did you just open')).toBe(true);
    expect(looksLikeExplainLast('audit that')).toBe(true);
  });

  it('utteranceMatchesTypedCatalog prefers queries over free text', () => {
    expect(
      utteranceMatchesTypedCatalog({ queries }, 'when is my next tournament')
    ).toBe(true);
    expect(utteranceMatchesTypedCatalog({ queries }, 'open tournament Alpha')).toBe(
      false
    );
  });
});
