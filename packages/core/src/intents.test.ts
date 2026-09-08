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
  meta: ['go_back', 'whats_next', 'explain_field'],
};

describe('parseUtterance', () => {
  it('matches steps by alias, keyword, and title', () => {
    expect(parseUtterance('create list', pack).stepId).toBe('create_list');
    expect(parseUtterance('make a list', pack).stepId).toBe('create_list');
    expect(parseUtterance('add todo', pack).stepId).toBe('add_item');
  });

  it('detects meta intents', () => {
    expect(parseUtterance('go back', pack)).toMatchObject({
      goBack: true,
      rawIntent: 'go_back',
      stepId: null,
    });
    expect(parseUtterance("what's next", pack).rawIntent).toBe('whats_next');
    expect(parseUtterance('explain tournament name', pack).rawIntent).toBe('explain_field');
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
