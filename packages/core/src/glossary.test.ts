import { describe, expect, it } from 'vitest';
import { matchFaqEntry, matchGlossaryEntry } from './glossary.js';

describe('matchGlossaryEntry', () => {
  const glossary = [
    {
      id: 'list_name',
      aliases: ['list name', 'list title'],
      text: 'List name explanation',
      guideId: 'guide-list-name',
    },
    {
      id: 'item_text',
      aliases: ['todo text', 'item'],
      text: 'Item text explanation',
      guideId: 'guide-item-text',
    },
  ];

  it('matches explain + alias', () => {
    const hit = matchGlossaryEntry(glossary, 'explain list name');
    expect(hit?.id).toBe('list_name');
  });

  it('returns null when no alias fits', () => {
    expect(matchGlossaryEntry(glossary, 'explain purple elephant')).toBeNull();
  });
});

describe('matchFaqEntry', () => {
  it('answers product questions from faq aliases', () => {
    const faq = [
      {
        id: 'local_only',
        aliases: ['is this free', 'is this app free to use'],
        text: 'Local demo — no fees.',
      },
    ];
    expect(matchFaqEntry(faq, 'is this app free to use')?.id).toBe('local_only');
  });
});
