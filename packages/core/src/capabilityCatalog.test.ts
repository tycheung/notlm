import { describe, expect, it } from 'vitest';
import {
  matchMutationEntry,
  matchQueryEntry,
  looksLikeContextAsk,
  looksLikeExplainLast,
  utteranceMatchesTypedCatalog,
} from './capabilityCatalog.js';
import { looksLikeClearOod } from './askNormalize.js';
import { matchFaqEntry, looksLikeFaqQuestion } from './glossary.js';

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
    expect(looksLikeContextAsk('form validation help')).toBe(true);
    expect(looksLikeContextAsk('what am I missing')).toBe(true);
    expect(looksLikeExplainLast('what did you just open')).toBe(true);
    expect(looksLikeExplainLast('audit that')).toBe(true);
    expect(looksLikeExplainLast('explain last')).toBe(true);
    expect(looksLikeExplainLast('recount your last action')).toBe(true);
  });

  it('matches mutations with filler words via content coverage', () => {
    const mutations = [
      {
        id: 'td.assign_usbc_confirm',
        title: 'Assign USBC',
        aliases: ['fix temporary usbc'],
        risk: 'high' as const,
      },
    ];
    expect(matchMutationEntry(mutations, 'fix the temporary usbc please')?.id).toBe(
      'td.assign_usbc_confirm'
    );
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

describe('askNormalize / FAQ compare', () => {
  it('flags clear OOD', () => {
    expect(looksLikeClearOod('tell me a joke')).toBe(true);
    expect(looksLikeClearOod('when is my next tournament')).toBe(false);
  });

  it('does not map trivia OOD onto meta FAQ entries', () => {
    const faq = [
      {
        id: 'who_are_you',
        aliases: ['who are you', 'what are you'],
        text: 'I am a coach.',
      },
      {
        id: 'what_just_happened',
        aliases: ['what just happened', 'what did you do'],
        text: 'I only navigate.',
      },
    ];
    expect(matchFaqEntry(faq, 'who won the world series')).toBeNull();
    expect(matchFaqEntry(faq, 'what is the capital of france')).toBeNull();
    expect(looksLikeClearOod('who won the world series')).toBe(true);
    expect(looksLikeClearOod('what is the capital of france')).toBe(true);
  });

  it('matches compare FAQ with paraphrase coverage', () => {
    const faq = [
      {
        id: 'sa_vs_full',
        aliases: ['SA only vs full tournament', 'compare SA only and full tournament'],
        text: 'Use a full tournament when…',
      },
    ];
    expect(looksLikeFaqQuestion('compare SA only and full tournament')).toBe(true);
    expect(matchFaqEntry(faq, 'compare SA only and full tournament')?.id).toBe(
      'sa_vs_full'
    );
    expect(matchFaqEntry(faq, 'should I run SA only or a full tournament')?.id).toBe(
      'sa_vs_full'
    );
  });
});
