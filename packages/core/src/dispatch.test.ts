import { describe, expect, it } from 'vitest';
import { dispatchUserUtterance } from './dispatch.js';
import { loadPackFromJson } from './loadPack.js';
import { emptySession } from './slots.js';
import type { FlowStepDef, SessionSlots } from './types.js';

const flow: FlowStepDef[] = [
  {
    id: 'create_list',
    title: 'Create list',
    keywords: ['create list'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'add_item',
    title: 'Add item',
    keywords: ['add item'],
    kind: 'hard',
    requires: ['create_list'],
  },
];

const pack = loadPackFromJson({
  manifest: { id: 'demo' },
  flow,
  controls: [
    { id: 'nav-create', stepId: 'create_list', path: '/lists/new' },
    { id: 'nav-add', stepId: 'add_item', path: '/lists/items/new' },
  ],
  intents: {
    aliases: {
      create_list: ['make a list'],
      add_item: ['add todo'],
    },
    meta: ['go_back', 'whats_next', 'explain_field', 'help'],
  },
  binders: {
    create_list: { path: 'data.listCount', op: 'gte', value: 1 },
    add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
  },
});

function runDispatch(
  text: string,
  session: SessionSlots = emptySession(),
  ctx: { pathname: string; data: Record<string, unknown> } = {
    pathname: '/lists',
    data: {},
  },
  packOverride = pack
) {
  const calls = {
    assistant: [] as string[],
    choices: [] as Array<Array<{ id: string; label: string }> | undefined>,
    executed: [] as string[],
    sessions: [] as SessionSlots[],
    flashed: [] as string[],
  };
  dispatchUserUtterance({
    text,
    pack: packOverride,
    session,
    ctx,
    pushAssistant: (msg, opts) => {
      calls.assistant.push(msg);
      calls.choices.push(opts?.choices);
    },
    executeStep: (stepId) => {
      calls.executed.push(stepId);
    },
    setSession: (updater) => {
      const next = updater(session);
      calls.sessions.push(next);
      session = next;
    },
    flashField: (id) => {
      calls.flashed.push(id);
    },
  });
  return calls;
}

describe('dispatchUserUtterance', () => {
  it('handles go_back before other intents', () => {
    const session: SessionSlots = {
      ...emptySession(),
      history: ['create_list', 'add_item'],
      activeStep: 'add_item',
    };
    const calls = runDispatch('go back', session);
    expect(calls.executed).toEqual(['create_list']);
    expect(calls.assistant[0]).toContain('Going back');
  });

  it('queues packed multi-step utterances before single-step dispatch', () => {
    const calls = runDispatch('create list then add item');
    expect(calls.executed).toEqual(['create_list']);
    expect(calls.assistant[0]).toContain('Queued');
    expect(calls.sessions[0]?.actionQueue).toHaveLength(2);
  });

  it('handles whats_next meta intent', () => {
    const calls = runDispatch("what's next");
    expect(calls.executed).toEqual(['create_list']);
    expect(calls.assistant[0]).toContain('Next up');
  });

  it('dispatches a single matched step', () => {
    const calls = runDispatch('make a list');
    expect(calls.executed).toEqual(['create_list']);
    expect(calls.assistant[0]).toContain('Taking you to');
  });

  it('asks which step when a shared keyword collides and context cannot decide', () => {
    const collisionPack = loadPackFromJson({
      manifest: { id: 'collision' },
      flow: [
        {
          id: 'create_list',
          title: 'Create list',
          keywords: ['create'],
          kind: 'hard',
          requires: [],
        },
        {
          id: 'create_event',
          title: 'Create event',
          keywords: ['create'],
          kind: 'hard',
          requires: [],
        },
      ],
      controls: [
        { id: 'nav-list', stepId: 'create_list', path: '/lists/new' },
        { id: 'nav-event', stepId: 'create_event', path: '/events/new' },
      ],
      intents: {
        aliases: {
          create_list: ['create'],
          create_event: ['create'],
        },
        meta: ['whats_next'],
      },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        create_event: { path: 'data.eventCount', op: 'gte', value: 1 },
      },
    });
    const calls = runDispatch('create', emptySession(), { pathname: '/', data: {} }, collisionPack);
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/Could mean|Which one/i);
    expect(calls.assistant[0]).toContain('Create list');
    expect(calls.assistant[0]).toContain('Create event');
    expect(calls.choices[0]?.map((c) => c.id).sort()).toEqual(['create_event', 'create_list']);
  });

  it('resolves a keyword collision using pathname context', () => {
    const collisionPack = loadPackFromJson({
      manifest: { id: 'collision-path' },
      flow: [
        {
          id: 'create_list',
          title: 'Create list',
          keywords: ['create'],
          kind: 'hard',
          requires: [],
        },
        {
          id: 'create_event',
          title: 'Create event',
          keywords: ['create'],
          kind: 'hard',
          requires: [],
        },
      ],
      controls: [
        { id: 'nav-list', stepId: 'create_list', path: '/lists/new' },
        { id: 'nav-event', stepId: 'create_event', path: '/events/new' },
      ],
      intents: {
        aliases: {
          create_list: ['create'],
          create_event: ['create'],
        },
        meta: [],
      },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        create_event: { path: 'data.eventCount', op: 'gte', value: 1 },
      },
    });
    const calls = runDispatch(
      'create',
      emptySession(),
      { pathname: '/events/setup', data: {} },
      collisionPack
    );
    expect(calls.executed).toEqual(['create_event']);
    expect(calls.assistant[0]).toContain('Create event');
  });

  it('offers next DAG steps when the utterance is unintelligible', () => {
    const calls = runDispatch('asdf qwer zxcv', emptySession(), {
      pathname: '/',
      data: {},
    });
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/didn.?t catch that/i);
    expect(calls.assistant[0]).toContain('Create list');
    expect(calls.assistant[0]).not.toContain('Add item');
  });

  it('ranks path-relevant next steps first for unintelligible input', () => {
    const openPack = loadPackFromJson({
      manifest: { id: 'open' },
      flow: [
        {
          id: 'create_list',
          title: 'Create list',
          keywords: ['create list'],
          kind: 'hard',
          requires: [],
        },
        {
          id: 'create_event',
          title: 'Create event',
          keywords: ['create event'],
          kind: 'hard',
          requires: [],
        },
      ],
      controls: [
        { id: 'nav-list', stepId: 'create_list', path: '/lists/new' },
        { id: 'nav-event', stepId: 'create_event', path: '/events/new' },
      ],
      intents: {
        aliases: {
          create_list: ['make a list'],
          create_event: ['make an event'],
        },
        meta: [],
      },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        create_event: { path: 'data.eventCount', op: 'gte', value: 1 },
      },
    });
    const calls = runDispatch(
      'blorp noodle',
      emptySession(),
      { pathname: '/events/setup', data: {} },
      openPack
    );
    expect(calls.executed).toEqual([]);
    const msg = calls.assistant[0] ?? '';
    expect(msg).toMatch(/didn.?t catch that/i);
    expect(msg.indexOf('Create event')).toBeLessThan(msg.indexOf('Create list'));
  });

  it('tells the user they are caught up when nothing is left to suggest', () => {
    const calls = runDispatch('zzzzz', emptySession(), {
      pathname: '/',
      data: { listCount: 1, itemCount: 1 },
    });
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/didn.?t catch that/i);
    expect(calls.assistant[0]).toMatch(/caught up/i);
  });

  it('points at the queued step when utterance is unintelligible', () => {
    const session: SessionSlots = {
      ...emptySession(),
      actionQueue: [{ stepId: 'add_item', slots: {}, rawSegment: 'add item' }],
    };
    const calls = runDispatch('mumble jumble', session, {
      pathname: '/',
      data: { listCount: 1 },
    });
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/didn.?t catch that/i);
    expect(calls.assistant[0]).toContain('Add item');
    expect(calls.assistant[0]).toMatch(/what.?s next/i);
  });

  it('explains DAG blockers when gibberish hits a blocked queue head', () => {
    const session: SessionSlots = {
      ...emptySession(),
      actionQueue: [{ stepId: 'add_item', slots: {}, rawSegment: 'add item' }],
    };
    const calls = runDispatch('mumble jumble', session, { pathname: '/', data: {} });
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/didn.?t catch that/i);
    expect(calls.assistant[0]).toMatch(/blocked/i);
    expect(calls.assistant[0]).toContain('Create list');
  });

  it('injects a missing require ahead of a deferred queued step', () => {
    const dagPack = loadPackFromJson({
      manifest: { id: 'dag-inject' },
      flow: [
        { id: 'a', title: 'Step A', keywords: ['step a'], kind: 'hard', requires: [] },
        { id: 'b', title: 'Step B', keywords: ['step b'], kind: 'hard', requires: ['a'] },
        { id: 'c', title: 'Step C', keywords: ['step c'], kind: 'hard', requires: [] },
        { id: 'd', title: 'Step D', keywords: ['step d'], kind: 'hard', requires: ['c'] },
      ],
      controls: [
        { id: 'na', stepId: 'a', path: '/a' },
        { id: 'nb', stepId: 'b', path: '/b' },
        { id: 'nc', stepId: 'c', path: '/c' },
        { id: 'nd', stepId: 'd', path: '/d' },
      ],
      intents: {
        aliases: {
          a: ['do a'],
          b: ['do b'],
          c: ['do c', 'step c'],
          d: ['do d'],
        },
        meta: ['whats_next'],
      },
      binders: {
        a: { path: 'data.a', op: 'truthy' },
        b: { path: 'data.b', op: 'truthy' },
        c: { path: 'data.c', op: 'truthy' },
        d: { path: 'data.d', op: 'truthy' },
      },
    });
    const session: SessionSlots = {
      ...emptySession(),
      actionQueue: [{ stepId: 'd', slots: {}, rawSegment: 'do d' }],
    };
    const calls = runDispatch(
      'do c',
      session,
      { pathname: '/', data: { a: true, b: true } },
      dagPack
    );
    expect(calls.executed).toEqual(['c']);
    expect(calls.assistant[0]).toMatch(/Step C.*Step D/i);
    expect(calls.sessions.at(-1)?.actionQueue.map((q) => q.stepId)).toEqual(['c', 'd']);
  });

  it('whats_next explains blockers when the queue head is not available', () => {
    const dagPack = loadPackFromJson({
      manifest: { id: 'dag-next' },
      flow: [
        { id: 'c', title: 'Step C', keywords: ['step c'], kind: 'hard', requires: [] },
        { id: 'd', title: 'Step D', keywords: ['step d'], kind: 'hard', requires: ['c'] },
      ],
      controls: [
        { id: 'nc', stepId: 'c', path: '/c' },
        { id: 'nd', stepId: 'd', path: '/d' },
      ],
      intents: {
        aliases: { c: ['do c'], d: ['do d'] },
        meta: ['whats_next'],
      },
      binders: {
        c: { path: 'data.c', op: 'truthy' },
        d: { path: 'data.d', op: 'truthy' },
      },
    });
    const session: SessionSlots = {
      ...emptySession(),
      actionQueue: [{ stepId: 'd', slots: {}, rawSegment: 'do d' }],
    };
    const calls = runDispatch("what's next", session, { pathname: '/', data: {} }, dagPack);
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/blocked/i);
    expect(calls.assistant[0]).toContain('Step C');
  });

  it('offers the next incomplete step after prior work is done', () => {
    const calls = runDispatch('asdf qwer', emptySession(), {
      pathname: '/',
      data: { listCount: 1 },
    });
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toContain('Add item');
    expect(calls.assistant[0]).not.toContain('Create list');
  });

  it('resolves a keyword collision when only one candidate is available', () => {
    const collisionPack = loadPackFromJson({
      manifest: { id: 'collision-avail' },
      flow: [
        {
          id: 'create_list',
          title: 'Create list',
          keywords: ['create'],
          kind: 'hard',
          requires: [],
        },
        {
          id: 'create_event',
          title: 'Create event',
          keywords: ['create'],
          kind: 'hard',
          requires: ['create_list'],
        },
      ],
      controls: [
        { id: 'nav-list', stepId: 'create_list', path: '/lists/new' },
        { id: 'nav-event', stepId: 'create_event', path: '/events/new' },
      ],
      intents: {
        aliases: {
          create_list: ['create'],
          create_event: ['create'],
        },
        meta: [],
      },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        create_event: { path: 'data.eventCount', op: 'gte', value: 1 },
      },
    });
    const calls = runDispatch('create', emptySession(), { pathname: '/', data: {} }, collisionPack);
    expect(calls.executed).toEqual(['create_list']);
    expect(calls.assistant[0]).toContain('Create list');
  });

  it('lists three or more colliding titles when asking the user', () => {
    const collisionPack = loadPackFromJson({
      manifest: { id: 'collision-3' },
      flow: [
        {
          id: 'create_list',
          title: 'Create list',
          keywords: ['create'],
          kind: 'hard',
          requires: [],
        },
        {
          id: 'create_event',
          title: 'Create event',
          keywords: ['create'],
          kind: 'hard',
          requires: [],
        },
        {
          id: 'create_note',
          title: 'Create note',
          keywords: ['create'],
          kind: 'hard',
          requires: [],
        },
      ],
      controls: [
        { id: 'a', stepId: 'create_list', path: '/a' },
        { id: 'b', stepId: 'create_event', path: '/b' },
        { id: 'c', stepId: 'create_note', path: '/c' },
      ],
      intents: {
        aliases: {
          create_list: ['create'],
          create_event: ['create'],
          create_note: ['create'],
        },
        meta: [],
      },
      binders: {
        create_list: { path: 'data.a', op: 'truthy' },
        create_event: { path: 'data.b', op: 'truthy' },
        create_note: { path: 'data.c', op: 'truthy' },
      },
    });
    const calls = runDispatch('create', emptySession(), { pathname: '/', data: {} }, collisionPack);
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/several things/i);
    expect(calls.assistant[0]).toContain('Create list');
    expect(calls.assistant[0]).toContain('Create event');
    expect(calls.assistant[0]).toContain('Create note');
  });

  it('explains a glossary field and flashes its guide id', () => {
    const withGlossary = loadPackFromJson({
      manifest: { id: 'demo' },
      flow,
      controls: [
        { id: 'nav-create', stepId: 'create_list', path: '/lists/new' },
        { id: 'nav-add', stepId: 'add_item', path: '/lists/items/new' },
      ],
      intents: {
        aliases: {
          create_list: ['make a list'],
          add_item: ['add todo'],
        },
        meta: ['go_back', 'whats_next', 'explain_field'],
      },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
      },
      glossary: [
        {
          id: 'list_name',
          aliases: ['list name'],
          text: 'List name is the title of a list.',
          guideId: 'guide-list-name',
        },
      ],
    });
    const calls = runDispatch(
      'explain list name',
      emptySession(),
      { pathname: '/', data: {} },
      withGlossary
    );
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toContain('List name is the title');
    expect(calls.flashed).toEqual(['guide-list-name']);
  });

  it('asks for a field when explain_field has no glossary hit', () => {
    const calls = runDispatch('explain purple elephant');
    expect(calls.assistant[0]).toMatch(/which field/i);
  });

  it('lists available steps for help / what can you do', () => {
    const calls = runDispatch('what can you do', emptySession(), {
      pathname: '/',
      data: {},
    });
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/available now/i);
    expect(calls.assistant[0]).toMatch(/Create list/i);
    expect(calls.choices[0]?.some((c) => c.id === 'create_list')).toBe(true);
  });

  it('prefers faq answers for question-shaped asks even when a step alias matches', () => {
    const withFaq = loadPackFromJson({
      manifest: { id: 'demo' },
      flow,
      controls: [
        { id: 'nav-create', stepId: 'create_list', path: '/lists/new' },
        { id: 'nav-add', stepId: 'add_item', path: '/lists/items/new' },
      ],
      intents: {
        aliases: {
          create_list: ['create list', 'make a list'],
          add_item: ['add todo'],
        },
        meta: ['go_back', 'whats_next', 'explain_field'],
      },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
      },
      faq: [
        {
          id: 'faq-create-list',
          aliases: ['how do i create a list', 'how do i make a list'],
          text: 'Use Create list from the checklist, then name it.',
          stepId: 'create_list',
          href: '/help/faq#create-list',
          label: 'Read: create list',
        },
      ],
    });
    const calls = runDispatch(
      'how do I create a list',
      emptySession(),
      { pathname: '/', data: {} },
      withFaq
    );
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/Use Create list/i);
    expect(calls.choices[0]?.[0]?.id).toBe('create_list');
  });

  it('answers faq product questions before unintelligible fallback', () => {
    const withFaq = loadPackFromJson({
      manifest: { id: 'demo' },
      flow,
      controls: [
        { id: 'nav-create', stepId: 'create_list', path: '/lists/new' },
        { id: 'nav-add', stepId: 'add_item', path: '/lists/items/new' },
      ],
      intents: {
        aliases: {
          create_list: ['make a list'],
          add_item: ['add todo'],
        },
        meta: ['go_back', 'whats_next', 'explain_field'],
      },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
      },
      faq: [
        {
          id: 'local_only',
          aliases: ['is this free', 'is this app free to use'],
          text: 'Local demo — no fees.',
          stepId: 'create_list',
        },
      ],
    });
    const calls = runDispatch(
      'is this app free to use',
      emptySession(),
      { pathname: '/', data: {} },
      withFaq
    );
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toContain('Local demo');
    expect(calls.choices[0]?.[0]?.id).toBe('create_list');
  });

  it('looks up a named list from RuntimeContext and flashes its row', () => {
    const withLookups = loadPackFromJson({
      manifest: { id: 'demo' },
      flow,
      controls: [
        { id: 'nav-create', stepId: 'create_list', path: '/lists/new' },
        { id: 'nav-add', stepId: 'add_item', path: '/lists/items/new' },
      ],
      intents: {
        aliases: {
          create_list: ['make a list'],
          add_item: ['add todo'],
        },
        meta: ['go_back', 'whats_next', 'explain_field', 'help'],
      },
      binders: {
        create_list: { path: 'data.listCount', op: 'gte', value: 1 },
        add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
      },
      lookups: [
        {
          id: 'lists',
          dataPath: 'lists',
          utteranceHints: ['show me', 'open', 'find'],
          entityWords: ['list', 'lists'],
          guideIdTemplate: 'guide-list-row-{{id}}',
        },
      ],
    });
    const calls = runDispatch(
      'show me the Shopping list',
      emptySession(),
      {
        pathname: '/',
        data: { lists: [{ id: 'list-1', name: 'Shopping' }] },
      },
      withLookups
    );
    expect(calls.assistant[0]).toMatch(/Found .*Shopping/i);
    expect(calls.flashed).toEqual(['guide-list-row-list-1']);
    expect(calls.executed).toEqual([]);
  });

  it('passes shortlistStepIds into parseUtteranceFn before bias', () => {
    const seen: Array<{ shortlist?: string[]; pathname?: string }> = [];
    const calls = {
      assistant: [] as string[],
      executed: [] as string[],
    };
    let session = emptySession();
    dispatchUserUtterance({
      text: 'make a list',
      pack,
      session,
      ctx: { pathname: '/lists/new', data: {} },
      pushAssistant: (msg) => {
        calls.assistant.push(msg);
      },
      executeStep: (stepId) => {
        calls.executed.push(stepId);
      },
      setSession: (updater) => {
        session = updater(session);
      },
      parseUtteranceFn: (text, intentPack, opts) => {
        seen.push({
          shortlist: opts?.shortlistStepIds,
          pathname: opts?.pathname,
        });
        return {
          stepId: 'create_list',
          slotPatches: {},
          isCorrection: false,
          goBack: false,
          rawIntent: 'goto:create_list',
          confidence: 'high',
          probability: 0.95,
        };
      },
    });
    expect(seen[0]?.pathname).toBe('/lists/new');
    expect(seen[0]?.shortlist?.length).toBeGreaterThan(0);
    expect(calls.executed).toContain('create_list');
  });

  it('soft-confirms when unavailableReason is set even on high confidence', () => {
    const gated = {
      ...pack,
      unavailableReason: (stepId: string) =>
        stepId === 'create_list' ? 'Finish billing first' : null,
    };
    const calls = runDispatch('make a list', emptySession(), {
      pathname: '/lists',
      data: {},
    }, gated);
    expect(calls.executed).toEqual([]);
    expect(calls.sessions.at(-1)?.pending?.kind).toBe('confirm');
    expect(calls.sessions.at(-1)?.pending?.stepId).toBe('create_list');
    expect(calls.choices[0]?.some((c) => c.id === '__yes__')).toBe(true);
  });
});
