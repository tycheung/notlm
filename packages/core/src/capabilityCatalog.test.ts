import { describe, expect, it } from 'vitest';
import {
  matchQueryEntry,
  looksLikeContextAsk,
  looksLikeExplainLast,
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
    expect(looksLikeExplainLast('what did you just open')).toBe(true);
  });
});
