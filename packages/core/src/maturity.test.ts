import { describe, expect, it } from 'vitest';
import { dispatchUserUtterance } from './dispatch.js';
import { loadPackFromJson } from './loadPack.js';
import { emptySession } from './slots.js';
import type { CoachEvent, FlowStepDef, SessionSlots } from './types.js';

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
    prefers: ['create_list'],
  },
];

function pack() {
  return loadPackFromJson({
    manifest: { id: 'maturity' },
    flow,
    controls: [
      { id: 'nav-create', stepId: 'create_list', path: '/lists/new' },
      { id: 'nav-add', stepId: 'add_item', path: '/lists/items/new' },
    ],
    intents: {
      aliases: {
        create_list: ['make a list', 'create list'],
        add_item: ['add todo', 'add item'],
      },
      meta: ['go_back', 'whats_next', 'help'],
      confirm: ['add_item'],
    },
    binders: {
      create_list: { path: 'data.listCount', op: 'gte', value: 1 },
      add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
    },
    replies: {
      'repair.blocked': ['Blocked: {{message}}'],
      'repair.unknown': ['Huh: {{message}}'],
      'repair.low_confidence': ['Maybe “{{title}}”?'],
    },
  });
}

function run(
  text: string,
  session: SessionSlots,
  ctx = { pathname: '/', data: { listCount: 1 } as Record<string, unknown> }
) {
  const events: CoachEvent[] = [];
  const calls = {
    assistant: [] as string[],
    executed: [] as string[],
  };
  let sess = session;
  const p = pack();
  dispatchUserUtterance({
    text,
    pack: p,
    session: sess,
    ctx,
    pushAssistant: (msg) => {
      calls.assistant.push(msg);
    },
    executeStep: (id) => {
      calls.executed.push(id);
    },
    setSession: (updater) => {
      sess = updater(sess);
    },
    onCoachEvent: (e) => events.push(e),
  });
  return { calls, session: sess, events };
}

describe('conversational maturity', () => {
  it('emits telemetry on utterance and blocked repair', () => {
    const { calls, events } = run('add item', emptySession(), {
      pathname: '/',
      data: {},
    });
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/Blocked:/i);
    expect(events.some((e) => e.type === 'utterance')).toBe(true);
    expect(events.some((e) => e.type === 'blocked')).toBe(true);
    expect(events.some((e) => e.type === 'repair' && e.kind === 'blocked')).toBe(true);
  });

  it('undo returns to prior history step', () => {
    let session = emptySession();
    session = {
      ...session,
      history: ['create_list', 'add_item'],
      activeStep: 'add_item',
      discourse: { lastStepId: 'add_item' },
    };
    const { calls, session: next } = run('undo that', session);
    expect(calls.executed).toEqual(['create_list']);
    expect(next.activeStep).toBe('create_list');
  });

  it('rename to updates last step as correction', () => {
    let session = emptySession();
    session = {
      ...session,
      history: ['create_list'],
      activeStep: 'create_list',
      discourse: { lastStepId: 'create_list' },
      byStep: { create_list: { name: 'Shopping' } },
    };
    const { calls, session: next } = run('rename to Errands', session, {
      pathname: '/',
      data: { listCount: 1 },
    });
    expect(calls.executed).toContain('create_list');
    expect(next.byStep.create_list?.name).toBe('Errands');
    expect(next.stale).toContain('add_item');
  });

  it('change the name asks for a new value', () => {
    let session = emptySession();
    session = {
      ...session,
      discourse: { lastStepId: 'create_list' },
      history: ['create_list'],
    };
    const { calls, session: next } = run('change the name', session, {
      pathname: '/',
      data: { listCount: 1 },
    });
    expect(calls.executed).toEqual([]);
    expect(next.pending?.kind).toBe('ask_slot');
    expect(calls.assistant[0]).toMatch(/new name/i);
  });

  it('low-confidence truncated STT asks before launch', () => {
    const { calls, session, events } = run('create lis', emptySession(), {
      pathname: '/',
      data: {},
    });
    expect(calls.executed).toEqual([]);
    expect(session.pending?.kind).toBe('confirm');
    expect(calls.assistant[0]).toMatch(/Maybe|did you mean/i);
    expect(events.some((e) => e.type === 'repair' && e.kind === 'low_confidence')).toBe(
      true
    );
  });

  it('onCoachEvent errors do not break dispatch', () => {
    const p = pack();
    let sess = emptySession();
    expect(() =>
      dispatchUserUtterance({
        text: 'create list',
        pack: p,
        session: sess,
        ctx: { pathname: '/', data: {} },
        pushAssistant: () => undefined,
        executeStep: () => undefined,
        setSession: (u) => {
          sess = u(sess);
        },
        onCoachEvent: () => {
          throw new Error('host boom');
        },
      })
    ).not.toThrow();
  });

  it('unknown utterance uses repair.unknown bank', () => {
    const { calls } = run('blorp noodle', emptySession(), {
      pathname: '/',
      data: {},
    });
    expect(calls.assistant[0]).toMatch(/^Huh:/);
  });
});
