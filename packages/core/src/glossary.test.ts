import { describe, expect, it } from 'vitest';
import { matchGlossaryEntry } from './glossary.js';

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
