import { describe, expect, it } from 'vitest';
import {
  looksLikeFaqQuestion,
  matchFaqEntry,
  matchGlossaryEntry,
  mergeFaqEntries,
} from './glossary.js';

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

describe('looksLikeFaqQuestion', () => {
  it('detects question leads and rejects direct commands', () => {
    expect(looksLikeFaqQuestion('how do I create a tournament')).toBe(true);
    expect(looksLikeFaqQuestion('what is a side action')).toBe(true);
    expect(looksLikeFaqQuestion('why cant i score')).toBe(true);
    expect(looksLikeFaqQuestion('create a tournament')).toBe(false);
    expect(looksLikeFaqQuestion('take me to billing')).toBe(false);
    expect(looksLikeFaqQuestion('open squads')).toBe(false);
  });
});

describe('token-boundary FAQ match', () => {
  it('does not match single-word aliases inside unrelated words', () => {
    const faq = [
      {
        id: 'lanes',
        aliases: ['lane'],
        text: 'Lane help',
      },
    ];
    expect(matchFaqEntry(faq, 'text my wife im running late')).toBeNull();
  });
});

describe('mergeFaqEntries', () => {
  it('lets overlay win on the same id and keeps unique base entries', () => {
    const base = [
      { id: 'greeting', aliases: ['hello'], text: 'Base hi' },
      { id: 'thanks', aliases: ['thanks'], text: 'Base thanks' },
    ];
    const overlay = [{ id: 'greeting', aliases: ['hello'], text: 'Product hi' }];
    const merged = mergeFaqEntries(base, overlay);
    expect(merged?.find((e) => e.id === 'greeting')?.text).toBe('Product hi');
    expect(merged?.find((e) => e.id === 'thanks')?.text).toBe('Base thanks');
  });
});
