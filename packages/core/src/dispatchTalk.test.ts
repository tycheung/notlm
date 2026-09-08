import { describe, expect, it } from 'vitest';
import { dispatchUserUtterance } from './dispatch.js';
import { loadPackFromJson } from './loadPack.js';
import { advanceAfterStepCompleted } from './queueAdvance.js';
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

function makePack(extra?: {
  slots?: Record<string, Array<{ key: string; ask: string; required?: boolean }>>;
  confirm?: string[];
  replies?: Record<string, string[]>;
}) {
  return loadPackFromJson({
    manifest: { id: 'talk' },
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
      meta: ['go_back', 'whats_next'],
      slots: extra?.slots,
      confirm: extra?.confirm,
    },
    binders: {
      create_list: { path: 'data.listCount', op: 'gte', value: 1 },
      add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
    },
    replies: extra?.replies,
  });
}

function run(
  text: string,
  session: SessionSlots,
  pack = makePack(),
  ctx = { pathname: '/', data: {} as Record<string, unknown> }
) {
  const calls = {
    assistant: [] as string[],
    choices: [] as Array<Array<{ id: string; label: string }> | undefined>,
    executed: [] as string[],
  };
  let sess = session;
  dispatchUserUtterance({
    text,
    pack,
    session: sess,
    ctx,
    pushAssistant: (msg, opts) => {
      calls.assistant.push(msg);
      calls.choices.push(opts?.choices);
    },
    executeStep: (id) => {
      calls.executed.push(id);
    },
    setSession: (updater) => {
      sess = updater(sess);
    },
  });
  return { calls, session: sess };
}

describe('conversational dispatch', () => {
  it('asks for required slots before launching', () => {
    const pack = makePack({
      slots: {
        create_list: [{ key: 'name', ask: 'What should we name the list?', required: true }],
      },
    });
    const first = run('create list', emptySession(), pack);
    expect(first.calls.executed).toEqual([]);
    expect(first.calls.assistant[0]).toMatch(/name the list/i);
    expect(first.session.pending?.kind).toBe('ask_slot');

    const second = run('Shopping', first.session, pack);
    expect(second.calls.executed).toEqual(['create_list']);
    expect(second.session.byStep.create_list?.name).toBe('Shopping');
  });

  it('confirms before launch when step is in confirm list', () => {
    const pack = makePack({ confirm: ['create_list'] });
    const ask = run('create list', emptySession(), pack);
    expect(ask.calls.executed).toEqual([]);
    expect(ask.calls.assistant[0]).toMatch(/sound good|Ready/i);
    expect(ask.session.pending?.kind).toBe('confirm');

    const yes = run('yes', ask.session, pack);
    expect(yes.calls.executed).toEqual(['create_list']);
  });

  it('resolves discourse again to lastStepId', () => {
    const session: SessionSlots = {
      ...emptySession(),
      discourse: { lastStepId: 'create_list' },
    };
    const { calls } = run('do that again', session);
    expect(calls.executed).toEqual(['create_list']);
  });

  it('offers proactive next step after completion', () => {
    const pack = makePack();
    const session = emptySession();
    const advanced = advanceAfterStepCompleted(
      pack,
      session,
      { pathname: '/', data: { listCount: 1 } },
      'create_list'
    );
    expect(advanced.session.pending?.kind).toBe('proactive');
    expect(advanced.messages[0]).toMatch(/Add item|next/i);
    expect(advanced.choices?.some((c) => c.id === 'add_item')).toBe(true);
  });

  it('blocks unavailable steps before asking confirm', () => {
    const pack = makePack({ confirm: ['add_item'] });
    const { calls, session } = run('add item', emptySession(), pack, {
      pathname: '/',
      data: {},
    });
    expect(calls.executed).toEqual([]);
    expect(calls.assistant[0]).toMatch(/blocked/i);
    expect(session.pending).toBeFalsy();
  });

  it('step alias after proactive offer still hits confirm gate', () => {
    const pack = makePack({ confirm: ['add_item'] });
    let session = emptySession();
    const advanced = advanceAfterStepCompleted(
      pack,
      session,
      { pathname: '/', data: { listCount: 1 } },
      'create_list'
    );
    session = advanced.session;
    expect(session.pending?.kind).toBe('proactive');
    expect(session.pending?.stepId).toBe('add_item');

    const { calls, session: next } = run('add item', session, pack, {
      pathname: '/',
      data: { listCount: 1 },
    });
    expect(calls.executed).toEqual([]);
    expect(next.pending?.kind).toBe('confirm');
    expect(calls.assistant.some((m) => /sound good|Ready/i.test(m))).toBe(true);
  });
});
