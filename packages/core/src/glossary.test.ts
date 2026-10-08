import { describe, expect, it } from 'vitest';
import {
  isStrongFaqAliasMatch,
  looksLikeFaqQuestion,
  matchFaqEntry,
  matchGlossaryEntry,
  matchStrongFaqEntry,
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

  it('does not prefix-steal shorter help utterances from long FAQ aliases', () => {
    const faq = [
      {
        id: 'hello_capabilities',
        aliases: [
          'hello what can you do for me today',
          'what can you do for me today',
        ],
        text: 'Long greeting FAQ.',
      },
    ];
    const entry = faq[0]!;
    expect(isStrongFaqAliasMatch('what can you do', entry)).toBe(false);
    expect(isStrongFaqAliasMatch('what can you do for me today', entry)).toBe(true);
    expect(matchFaqEntry(faq, 'what can you do for me today')?.id).toBe(
      'hello_capabilities'
    );
  });

  it('matchStrongFaqEntry drops weak fuzzy hits that would steal Laya', () => {
    const faq = [
      {
        id: 'faq-sa-only-scoring',
        aliases: [
          'how do i enter scores for this sa only event',
          'sa only scoring without squads',
        ],
        text: 'SA-only scoring path.',
      },
      {
        id: 'faq-bracket-byes',
        aliases: ['how many byes can a bracket have'],
        text: 'Max one bye.',
      },
    ];
    // Partial / follow-up style — must NOT hard-answer.
    expect(matchStrongFaqEntry(faq, 'how do i enter scores')).toBeNull();
    expect(
      matchStrongFaqEntry(faq, 'I did that and it still will not let me score')
    ).toBeNull();
    // Exact / near-exact ruling still wins.
    expect(
      matchStrongFaqEntry(faq, 'How many byes can a bracket have?')?.id
    ).toBe('faq-bracket-byes');
  });

  it('does not let short polluted aliases steal longer product questions', () => {
    const faq = [
      {
        id: 'thanks',
        aliases: ['thanks', 'thx', 'ok so like can i prize money thx'],
        text: "You're welcome.",
      },
      {
        id: 'faq-tax-ood',
        aliases: ['can i get tax advice on prize money gambling'],
        text: 'No tax advice.',
      },
    ];
    expect(
      matchStrongFaqEntry(faq, 'Can I get tax advice on prize money gambling?')?.id
    ).toBe('faq-tax-ood');
    expect(
      isStrongFaqAliasMatch('Can I get tax advice on prize money gambling?', faq[0]!)
    ).toBe(false);
  });
});

describe('looksLikeFaqQuestion', () => {
  it('detects question leads and rejects direct commands', () => {
    expect(looksLikeFaqQuestion('how do I create a record')).toBe(true);
    expect(looksLikeFaqQuestion('what is a contact card')).toBe(true);
    expect(looksLikeFaqQuestion('why cant i save')).toBe(true);
    expect(looksLikeFaqQuestion('record vs event')).toBe(true);
    expect(looksLikeFaqQuestion('Plan A vs full')).toBe(true);
    expect(looksLikeFaqQuestion('create a record')).toBe(false);
    expect(looksLikeFaqQuestion('take me to billing')).toBe(false);
    expect(looksLikeFaqQuestion('open tasks')).toBe(false);
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
