import { describe, expect, it } from 'vitest';
import { loadPackFromJson } from './loadPack.js';
import {
  advanceAfterStepCompleted,
  formatBlockedQueueMessage,
  injectBeforeDeferred,
  isRequiredFor,
  listMissingRequires,
  planResumeQueue,
} from './queueAdvance.js';
import { emptySession, setActionQueue } from './slots.js';
import type { FlowStepDef, GuideAction } from './types.js';

const flow: FlowStepDef[] = [
  { id: 'a', title: 'Step A', keywords: ['step a'], kind: 'hard', requires: [] },
  { id: 'b', title: 'Step B', keywords: ['step b'], kind: 'hard', requires: ['a'] },
  { id: 'c', title: 'Step C', keywords: ['step c'], kind: 'hard', requires: [] },
  { id: 'd', title: 'Step D', keywords: ['step d'], kind: 'hard', requires: ['c'] },
];

const pack = loadPackFromJson({
  manifest: { id: 'queue-dag' },
  flow,
  controls: [
    { id: 'nav-a', stepId: 'a', path: '/a' },
    { id: 'nav-b', stepId: 'b', path: '/b' },
    { id: 'nav-c', stepId: 'c', path: '/c' },
    { id: 'nav-d', stepId: 'd', path: '/d' },
  ],
  intents: {
    aliases: {
      a: ['do a', 'step a'],
      b: ['do b', 'step b'],
      c: ['do c', 'step c'],
      d: ['do d', 'step d'],
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

function action(stepId: string): GuideAction {
  return { stepId, slots: {}, rawSegment: stepId };
}

describe('listMissingRequires / isRequiredFor', () => {
  it('lists direct incomplete requires', () => {
    expect(listMissingRequires(pack, 'd', { pathname: '/', data: {} })).toEqual(['c']);
    expect(listMissingRequires(pack, 'd', { pathname: '/', data: { c: true } })).toEqual([]);
  });

  it('detects transitive requires', () => {
    expect(isRequiredFor(pack, 'c', 'd')).toBe(true);
    expect(isRequiredFor(pack, 'a', 'd')).toBe(false);
  });
});

describe('advanceAfterStepCompleted (A → B → D with C gap)', () => {
  it('resumes next step even when getContext binders lag notify', () => {
    const session = setActionQueue(emptySession(), [action('a'), action('b')]);
    // Host notified A complete, but binder still false (classic one-tick race).
    const afterA = advanceAfterStepCompleted(
      pack,
      session,
      { pathname: '/', data: {} },
      'a'
    );
    expect(afterA.executeNext?.stepId).toBe('b');
    expect(afterA.messages[0]).toMatch(/Continuing with .*Step B/);
    expect(afterA.messages.join(' ')).not.toMatch(/blocked/i);
  });

  it('auto-continues to the next available queued step', () => {
    let session = setActionQueue(emptySession(), [action('a'), action('b'), action('d')]);
    const afterA = advanceAfterStepCompleted(
      pack,
      session,
      { pathname: '/', data: { a: true } },
      'a'
    );
    expect(afterA.session.actionQueue.map((q) => q.stepId)).toEqual(['b', 'd']);
    expect(afterA.executeNext?.stepId).toBe('b');
    expect(afterA.messages[0]).toMatch(/Continuing with .*Step B/);

    const afterB = advanceAfterStepCompleted(
      pack,
      afterA.session,
      { pathname: '/', data: { a: true, b: true } },
      'b'
    );
    expect(afterB.session.actionQueue.map((q) => q.stepId)).toEqual(['d']);
    expect(afterB.executeNext).toBeNull();
    expect(afterB.messages[0]).toMatch(/Step D.*blocked/i);
    expect(afterB.messages[0]).toContain('Step C');
  });

  it('resumes deferred D when required C completes even if binders lag', () => {
    const session = setActionQueue(emptySession(), [action('d')]);
    const result = advanceAfterStepCompleted(
      pack,
      session,
      { pathname: '/', data: { a: true, b: true } },
      'c'
    );
    expect(result.session.actionQueue.map((q) => q.stepId)).toEqual(['d']);
    expect(result.executeNext?.stepId).toBe('d');
  });

  it('resumes D after injected C completes', () => {
    let session = setActionQueue(emptySession(), [action('d')]);
    const injected = injectBeforeDeferred(
      pack,
      session,
      { pathname: '/', data: { a: true, b: true } },
      action('c')
    );
    expect(injected.injected).toBe(true);
    expect(injected.session.actionQueue.map((q) => q.stepId)).toEqual(['c', 'd']);
    expect(injected.message).toMatch(/Step C.*Step D/);

    const afterC = advanceAfterStepCompleted(
      pack,
      injected.session,
      { pathname: '/', data: { a: true, b: true, c: true } },
      'c'
    );
    expect(afterC.session.actionQueue.map((q) => q.stepId)).toEqual(['d']);
    expect(afterC.executeNext?.stepId).toBe('d');
    expect(afterC.messages[0]).toMatch(/Continuing with .*Step D/);
  });
});

describe('injectBeforeDeferred', () => {
  it('returns not injected when the step does not unblock the queue', () => {
    const session = setActionQueue(emptySession(), [action('a')]);
    const result = injectBeforeDeferred(
      pack,
      session,
      { pathname: '/', data: {} },
      action('c')
    );
    expect(result.injected).toBe(false);
    expect(result.session.actionQueue.map((q) => q.stepId)).toEqual(['a']);
  });

  it('moves an already-queued unblocker ahead of the blocked target', () => {
    const session = setActionQueue(emptySession(), [action('d'), action('c')]);
    const result = injectBeforeDeferred(
      pack,
      session,
      { pathname: '/', data: {} },
      action('c')
    );
    expect(result.injected).toBe(true);
    expect(result.session.actionQueue.map((q) => q.stepId)).toEqual(['c', 'd']);
  });
});

describe('planResumeQueue', () => {
  it('explains blockers without announcing continue', () => {
    const session = setActionQueue(emptySession(), [action('d')]);
    const planned = planResumeQueue(pack, session, { pathname: '/', data: {} });
    expect(planned.executeNext).toBeNull();
    expect(planned.messages[0]).toBe(
      formatBlockedQueueMessage(pack, 'd', ['c'])
    );
  });
});
