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
    meta: ['go_back', 'whats_next', 'explain_field'],
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
    executed: [] as string[],
    sessions: [] as SessionSlots[],
  };
  dispatchUserUtterance({
    text,
    pack: packOverride,
    session,
    ctx,
    pushAssistant: (msg) => {
      calls.assistant.push(msg);
    },
    executeStep: (stepId) => {
      calls.executed.push(stepId);
    },
    setSession: (updater) => {
      const next = updater(session);
      calls.sessions.push(next);
      session = next;
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
    const calls = runDispatch('mumble jumble', session, { pathname: '/', data: {} });
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/didn.?t catch that/i);
    expect(calls.assistant[0]).toContain('Add item');
    expect(calls.assistant[0]).toMatch(/what.?s next/i);
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
});
