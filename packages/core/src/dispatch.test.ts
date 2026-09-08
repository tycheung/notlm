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

function runDispatch(text: string, session: SessionSlots = emptySession()) {
  const calls = {
    assistant: [] as string[],
    executed: [] as string[],
    sessions: [] as SessionSlots[],
  };
  dispatchUserUtterance({
    text,
    pack,
    session,
    ctx: { pathname: '/lists', data: {} },
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
});
