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
      id: 'crm.next_event',
      title: 'Next event',
      aliases: [
        'when is my Next event',
        'can you let me know when the Next event I\'m hosting is and where',
      ],
    },
  ];

  it('matches Next event schedule ask', () => {
    const hit = matchQueryEntry(
      queries,
      'can you let me know when the Next event I\'m hosting is and where at'
    );
    expect(hit?.id).toBe('crm.next_event');
  });

  it('detects context and explain-last heuristics', () => {
    expect(looksLikeContextAsk("why can't I save this form")).toBe(true);
    expect(looksLikeContextAsk("what's blocking me")).toBe(true);
    expect(looksLikeContextAsk('why is save disabled')).toBe(true);
    expect(looksLikeContextAsk('form validation help')).toBe(true);
    expect(looksLikeContextAsk('what am I missing')).toBe(true);
    expect(looksLikeExplainLast('what did you just open')).toBe(true);
    expect(looksLikeExplainLast('audit that')).toBe(true);
    expect(
      looksLikeExplainLast('create a tournament named QA AUDIT 2026-10-08 bot')
    ).toBe(false);
    expect(looksLikeExplainLast('explain last')).toBe(true);
    expect(looksLikeExplainLast('recount your last action')).toBe(true);
    expect(looksLikeExplainLast('what action did you just take')).toBe(true);
    expect(looksLikeExplainLast('recount prior coach step')).toBe(true);
    expect(looksLikeExplainLast('explain the prior navigation')).toBe(true);
    expect(looksLikeExplainLast('review your previous coach action')).toBe(true);
    expect(looksLikeExplainLast('how that alters the desk')).toBe(true);
    expect(looksLikeExplainLast('what you modified most recently')).toBe(true);
    expect(looksLikeExplainLast('plain language last action')).toBe(true);
    expect(looksLikeContextAsk('why can I not complete the page')).toBe(true);
    expect(looksLikeContextAsk('why next stays grey here')).toBe(true);
    expect(looksLikeContextAsk('why primary button is dead')).toBe(true);
    expect(looksLikeContextAsk('incomplete items on this wizard')).toBe(true);
    expect(
      looksLikeContextAsk('director step incomplete', [
        'director step incomplete',
        'incomplete director step',
      ])
    ).toBe(true);
  });

  it('matches mutations with filler words via content coverage', () => {
    const mutations = [
      {
        id: 'crm.assign_badge_confirm',
        title: 'Assign badge',
        aliases: ['fix temporary badge'],
        risk: 'high' as const,
      },
    ];
    expect(matchMutationEntry(mutations, 'fix the temporary badge please')?.id).toBe(
      'crm.assign_badge_confirm'
    );
  });

  it('utteranceMatchesTypedCatalog prefers queries over free text', () => {
    expect(
      utteranceMatchesTypedCatalog({ queries }, 'when is my Next event')
    ).toBe(true);
    expect(utteranceMatchesTypedCatalog({ queries }, 'open event Alpha')).toBe(
      false
    );
  });
});

describe('askNormalize / FAQ compare', () => {
  it('flags clear OOD', () => {
    expect(looksLikeClearOod('tell me a joke')).toBe(true);
    expect(looksLikeClearOod('when is my Next event')).toBe(false);
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
        id: 'plan_a_vs_full',
        aliases: ['Plan A vs full plan', 'compare Plan A and full plan'],
        text: 'Use the full plan when…',
      },
    ];
    expect(looksLikeFaqQuestion('compare Plan A and full plan')).toBe(true);
    expect(matchFaqEntry(faq, 'compare Plan A and full plan')?.id).toBe(
      'plan_a_vs_full'
    );
    expect(matchFaqEntry(faq, 'should I run Plan A or the full plan')?.id).toBe(
      'plan_a_vs_full'
    );
  });
});
