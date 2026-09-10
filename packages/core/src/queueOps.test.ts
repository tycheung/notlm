import { describe, expect, it } from 'vitest';
import {
  cancelThenJump,
  clearActionQueue,
  describeQueue,
  dropStepsFromQueue,
  expandActionsWithPrereqs,
  jumpStepToHead,
  mergeActionIntoQueue,
  patchQueuedStepSlots,
  skipQueueHead,
} from './queueOps.js';
import { emptySession } from './slots.js';
import type { FlowStepDef, GuideAction } from './types.js';

function a(stepId: string, slots: Record<string, unknown> = {}): GuideAction {
  return { stepId, slots, rawSegment: stepId };
}

const flow: FlowStepDef[] = [
  { id: 'create_list', title: 'Create list', keywords: [], kind: 'hard', requires: [] },
  {
    id: 'add_item',
    title: 'Add item',
    keywords: [],
    kind: 'hard',
    requires: ['create_list'],
  },
  {
    id: 'complete_item',
    title: 'Complete item',
    keywords: [],
    kind: 'hard',
    requires: ['add_item'],
  },
];

describe('mergeActionIntoQueue', () => {
  it('keeps head stable and appends new steps', () => {
    const q = [a('create_list'), a('add_item')];
    const { queue, wasHead } = mergeActionIntoQueue(q, a('complete_item'));
    expect(queue.map((x) => x.stepId)).toEqual([
      'create_list',
      'add_item',
      'complete_item',
    ]);
    expect(wasHead).toBe(false);
  });

  it('merges slots into existing step without duplicating', () => {
    const q = [a('create_list', { name: 'A' }), a('add_item')];
    const { queue, mergedExisting, wasHead } = mergeActionIntoQueue(
      q,
      a('create_list', { name: 'B', note: 'x' })
    );
    expect(queue).toHaveLength(2);
    expect(queue[0]?.slots).toEqual({ name: 'B', note: 'x' });
    expect(mergedExisting).toBe(true);
    expect(wasHead).toBe(true);
  });
});

describe('queue rewrite helpers', () => {
  it('clears queue and pending', () => {
    let s = emptySession();
    s = {
      ...s,
      actionQueue: [a('create_list')],
      pending: { kind: 'confirm', stepId: 'create_list', slots: {} },
    };
    s = clearActionQueue(s);
    expect(s.actionQueue).toEqual([]);
    expect(s.pending).toBeNull();
  });

  it('skips head', () => {
    let s = emptySession();
    s = { ...s, actionQueue: [a('create_list'), a('add_item')] };
    s = skipQueueHead(s);
    expect(s.actionQueue.map((x) => x.stepId)).toEqual(['add_item']);
  });

  it('drops matching steps and jumps Y to head', () => {
    let s = emptySession();
    s = {
      ...s,
      actionQueue: [a('create_list'), a('add_item'), a('complete_item')],
    };
    s = cancelThenJump(s, ['create_list', 'add_item'], 'complete_item');
    expect(s.actionQueue.map((x) => x.stepId)).toEqual(['complete_item']);
  });

  it('jumpStepToHead promotes mid-queue step', () => {
    let s = emptySession();
    s = { ...s, actionQueue: [a('create_list'), a('add_item')] };
    s = jumpStepToHead(s, 'add_item', { text: 'Milk' });
    expect(s.actionQueue.map((x) => x.stepId)).toEqual(['add_item', 'create_list']);
    expect(s.actionQueue[0]?.slots.text).toBe('Milk');
  });

  it('patchQueuedStepSlots updates by step id', () => {
    let s = emptySession();
    s = { ...s, actionQueue: [a('create_list', { name: 'A' })] };
    s = patchQueuedStepSlots(s, 'create_list', { name: 'Errands' });
    expect(s.actionQueue[0]?.slots.name).toBe('Errands');
  });

  it('dropStepsFromQueue removes matches', () => {
    let s = emptySession();
    s = { ...s, actionQueue: [a('create_list'), a('add_item')] };
    s = dropStepsFromQueue(s, ['add_item']);
    expect(s.actionQueue.map((x) => x.stepId)).toEqual(['create_list']);
  });
});

describe('expandActionsWithPrereqs', () => {
  it('inserts missing hard requires before a packed target', () => {
    const expanded = expandActionsWithPrereqs(flow, [a('complete_item')]);
    expect(expanded.map((x) => x.stepId)).toEqual([
      'create_list',
      'add_item',
      'complete_item',
    ]);
  });

  it('does not duplicate when prereq already listed', () => {
    const expanded = expandActionsWithPrereqs(flow, [
      a('create_list'),
      a('complete_item'),
    ]);
    expect(expanded.map((x) => x.stepId)).toEqual([
      'create_list',
      'add_item',
      'complete_item',
    ]);
  });
});

describe('describeQueue', () => {
  it('formats plan copy', () => {
    expect(describeQueue([a('create_list'), a('add_item')], (id) => id)).toMatch(
      /Plan:.*create_list.*add_item/
    );
  });
});
