import { describe, expect, it } from 'vitest';
import { loadPackFromJson } from './loadPack.js';
import { applyQueueRewrite, detectQueueRewrite } from './queueRewrite.js';
import { emptySession, setActionQueue } from './slots.js';
import type { FlowStepDef, GuideAction } from './types.js';

const flow: FlowStepDef[] = [
  { id: 'create_list', title: 'Create list', keywords: ['create list'], kind: 'hard', requires: [] },
  { id: 'add_item', title: 'Add item', keywords: ['add item'], kind: 'hard', requires: ['create_list'] },
  {
    id: 'complete_item',
    title: 'Complete item',
    keywords: ['complete item'],
    kind: 'hard',
    requires: ['add_item'],
  },
];

const pack = loadPackFromJson({
  manifest: { id: 'rw' },
  flow,
  controls: [
    { id: 'a', stepId: 'create_list', path: '/a' },
    { id: 'b', stepId: 'add_item', path: '/b' },
    { id: 'c', stepId: 'complete_item', path: '/c' },
  ],
  intents: {
    aliases: {
      create_list: ['create list'],
      add_item: ['add item'],
      complete_item: ['complete item'],
    },
    meta: ['cancel_all', 'whats_next'],
  },
  binders: {
    create_list: { path: 'data.listCount', op: 'gte', value: 1 },
    add_item: { path: 'data.itemCount', op: 'gte', value: 1 },
    complete_item: { path: 'data.completedCount', op: 'gte', value: 1 },
  },
});

function a(stepId: string): GuideAction {
  return { stepId, slots: {}, rawSegment: stepId };
}

describe('detectQueueRewrite / applyQueueRewrite', () => {
  it('detects clear the queue', () => {
    expect(detectQueueRewrite('clear the queue', pack, emptySession())?.kind).toBe('clear');
  });

  it('skips head', () => {
    const session = setActionQueue(emptySession(), [a('create_list'), a('add_item')]);
    const kind = detectQueueRewrite('skip this', pack, session);
    expect(kind?.kind).toBe('skip_head');
    const applied = applyQueueRewrite(kind!, session, pack);
    expect(applied.executeHead).toBe('add_item');
  });

  it('cancel X go straight to Y', () => {
    const session = setActionQueue(emptySession(), [
      a('create_list'),
      a('add_item'),
      a('complete_item'),
    ]);
    const kind = detectQueueRewrite(
      'cancel add item, go straight to complete item',
      pack,
      session
    );
    expect(kind?.kind).toBe('cancel_then_jump');
    const applied = applyQueueRewrite(kind!, session, pack);
    expect(applied.session.actionQueue.map((x) => x.stepId)[0]).toBe('complete_item');
  });

  it('just create Y jumps to head', () => {
    const session = setActionQueue(emptySession(), [a('create_list'), a('add_item')]);
    const kind = detectQueueRewrite('just complete item', pack, session);
    expect(kind?.kind).toBe('jump');
    if (kind?.kind === 'jump') expect(kind.stepId).toBe('complete_item');
  });
});
