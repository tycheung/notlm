import { describe, expect, it } from 'vitest';
import { extractSlotAnswer, resolveDiscourse } from './discourse.js';
import { emptySession } from './slots.js';
import { isAffirmative, isNegative, pickReply, renderTemplate } from './replies.js';

describe('replies', () => {
  it('renders templates and rotates variants', () => {
    expect(renderTemplate('Hi {{title}}', { title: 'List' })).toBe('Hi List');
    const s0 = emptySession();
    const a = pickReply(s0, { launch: ['A {{title}}', 'B {{title}}'] }, 'launch', {
      title: 'X',
    });
    expect(a.text).toBe('A X');
    const b = pickReply(a.session, { launch: ['A {{title}}', 'B {{title}}'] }, 'launch', {
      title: 'X',
    });
    expect(b.text).toBe('B X');
  });

  it('detects yes/no', () => {
    expect(isAffirmative('yes please')).toBe(true);
    expect(isNegative('not now')).toBe(true);
  });
});

describe('discourse', () => {
  it('resolves again / that to lastStepId', () => {
    const hit = resolveDiscourse('do that again', { lastStepId: 'create_list' });
    expect(hit).toEqual({ kind: 'step', text: 'do that again', stepId: 'create_list' });
  });

  it('resolves the other one to second choice', () => {
    const hit = resolveDiscourse('the other one', {
      lastChoiceIds: ['a', 'b'],
    });
    expect(hit.kind).toBe('step');
    if (hit.kind === 'step') expect(hit.stepId).toBe('b');
  });

  it('extracts slot answers', () => {
    expect(extractSlotAnswer('called Shopping')).toBe('Shopping');
    expect(extractSlotAnswer('"Errands"')).toBe('Errands');
  });
});
