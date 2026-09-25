import { describe, expect, it } from 'vitest';
import { parseUtterance } from './intents.js';
import { parsePackedUtterance } from './packUtterance.js';
import type { FlowStepDef, IntentParsePack } from './types.js';

const steps: FlowStepDef[] = [
  {
    id: 'create_list',
    title: 'Create list',
    keywords: ['create list', 'new list'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'add_item',
    title: 'Add item',
    keywords: ['add item', 'new item'],
    kind: 'hard',
    requires: ['create_list'],
  },
];

const pack: IntentParsePack = {
  steps,
  aliases: {
    create_list: ['make a list', 'creat list'],
    add_item: ['add todo'],
  },
  meta: ['go_back', 'whats_next', 'explain_field', 'help'],
};

describe('parseUtterance', () => {
  it('matches steps by alias, keyword, and title', () => {
    expect(parseUtterance('create list', pack).stepId).toBe('create_list');
    expect(parseUtterance('make a list', pack).stepId).toBe('create_list');
    expect(parseUtterance('add todo', pack).stepId).toBe('add_item');
  });

  it('prefers token-boundary matches over mid-word substrings', () => {
    const lanePack: IntentParsePack = {
      steps: [
        {
          id: 'assign_lanes',
          title: 'Assign lanes',
          keywords: ['lane'],
          kind: 'soft',
          requires: [],
        },
      ],
      aliases: { assign_lanes: ['lane'] },
      meta: [],
    };
    expect(parseUtterance('text my wife im running late', lanePack).stepId).toBeNull();
    expect(parseUtterance('open lane chart', lanePack).stepId).toBe('assign_lanes');
  });

  it('emits faq rawIntent for question-shaped FAQ hits', () => {
    const withFaq: IntentParsePack = {
      ...pack,
      faq: [
        {
          id: 'faq-create',
          aliases: ['how do i create a list'],
          text: 'Use Create list.',
          stepId: 'create_list',
        },
      ],
    };
    const parsed = parseUtterance('how do I create a list', withFaq);
    expect(parsed.rawIntent).toBe('faq');
    expect(parsed.faqId).toBe('faq-create');
    expect(parsed.stepId).toBeNull();
  });

  it('detects meta intents', () => {
    expect(parseUtterance('go back', pack)).toMatchObject({
      goBack: true,
      rawIntent: 'go_back',
      stepId: null,
    });
    expect(parseUtterance("what's next", pack).rawIntent).toBe('whats_next');
    expect(parseUtterance('explain tournament name', pack).rawIntent).toBe('explain_field');
    expect(parseUtterance('what can you do', pack).rawIntent).toBe('help');
    expect(parseUtterance('help', pack).rawIntent).toBe('help');
  });

  it('flags corrections without strong step phrase', () => {
    const result = parseUtterance('actually it should have been Oakwood', pack);
    expect(result.isCorrection).toBe(true);
    expect(result.rawIntent).toBe('correction');
  });

  it('flags keyword collisions instead of silently picking one step', () => {
    const collisionPack: IntentParsePack = {
      steps: [
        {
          id: 'create_list',
          title: 'Create list',
          keywords: ['create', 'list'],
          kind: 'hard',
          requires: [],
        },
        {
          id: 'create_event',
          title: 'Create event',
          keywords: ['create', 'event'],
          kind: 'hard',
          requires: [],
        },
      ],
      aliases: {
        create_list: ['create'],
        create_event: ['create'],
      },
      meta: ['go_back', 'whats_next'],
    };
    const result = parseUtterance('create', collisionPack);
    expect(result.stepId).toBeNull();
    expect(result.rawIntent).toBe('ambiguous');
    expect(result.candidates?.sort()).toEqual(['create_event', 'create_list']);
  });

  it('keeps a clear longer-phrase winner over a shared short keyword', () => {
    const collisionPack: IntentParsePack = {
      steps: [
        {
          id: 'create_list',
          title: 'Create list',
          keywords: ['create', 'create list'],
          kind: 'hard',
          requires: [],
        },
        {
          id: 'create_event',
          title: 'Create event',
          keywords: ['create', 'create event'],
          kind: 'hard',
          requires: [],
        },
      ],
      aliases: {},
      meta: [],
    };
    expect(parseUtterance('create list', collisionPack).stepId).toBe('create_list');
    expect(parseUtterance('create list', collisionPack).rawIntent).toBe('goto:create_list');
  });

  it('does not mark unique matches as ambiguous', () => {
    const result = parseUtterance('add todo', pack);
    expect(result.stepId).toBe('add_item');
    expect(result.rawIntent).toBe('goto:add_item');
    expect(result.candidates).toBeUndefined();
  });

  it('corrects OOV typos before matching step phrases', () => {
    const typed = {
      ...pack,
      aliases: {
        ...pack.aliases,
        create_list: [...(pack.aliases.create_list ?? []), 'create tournament list'],
      },
    };
    // "tornament" → "tournament" via lexicon, then matches the multi-word alias.
    expect(parseUtterance('create tornament list', typed).stepId).toBe('create_list');
  });

  it('keeps step on correction only with a strong multi-word phrase', () => {
    const withStep = parseUtterance('actually create list', pack);
    expect(withStep.isCorrection).toBe(true);
    expect(withStep.stepId).toBe('create_list');

    const meant = parseUtterance('i meant create list', pack);
    expect(meant.stepId).toBe('create_list');
    expect(meant.isCorrection).toBe(true);
  });
});

describe('parsePackedUtterance', () => {
  it('splits on then and parses each segment', () => {
    const packed = parsePackedUtterance('create list then add item', pack);
    expect(packed.actions.map((a) => a.stepId)).toEqual(['create_list', 'add_item']);
    expect(packed.meta).toBeNull();
  });

  it('returns meta-only results without actions', () => {
    const packed = parsePackedUtterance('go back', pack);
    expect(packed.actions).toEqual([]);
    expect(packed.meta?.rawIntent).toBe('go_back');
  });
});
