import { describe, expect, it } from 'vitest';
import {
  clearStale,
  completeQueueHead,
  completeQueueHeadIfMatch,
  emptySession,
  goBackToStep,
  markActiveStep,
  patchStepSlots,
  setActionQueue,
} from './slots.js';

describe('slots session helpers', () => {
  it('patches slots and fans out stale dependents on correction', () => {
    let session = emptySession();
    session = patchStepSlots(session, 'create_list', { name: 'A' });
    session = patchStepSlots(session, 'create_list', { name: 'B' }, {
      isCorrection: true,
      staleDependents: ['add_item'],
    });
    expect(session.byStep.create_list).toEqual({ name: 'B' });
    expect(session.stale).toEqual(['add_item']);
  });

  it('manages the action queue head safely', () => {
    let session = setActionQueue(emptySession(), [
      { stepId: 'a', slots: {}, rawSegment: 'a' },
      { stepId: 'b', slots: {}, rawSegment: 'b' },
    ]);
    expect(completeQueueHead(emptySession())).toEqual(emptySession());
    session = completeQueueHead(session);
    expect(session.actionQueue.map((q) => q.stepId)).toEqual(['b']);
    expect(completeQueueHeadIfMatch(session, 'a').actionQueue.map((q) => q.stepId)).toEqual([
      'b',
    ]);
    session = completeQueueHeadIfMatch(session, 'b');
    expect(session.actionQueue).toEqual([]);
  });

  it('clears stale, marks active history, and goes back', () => {
    let session = {
      ...emptySession(),
      stale: ['a', 'b'],
      history: ['a', 'b', 'c'],
    };
    session = clearStale(session, 'b');
    expect(session.stale).toEqual(['a']);
    session = markActiveStep(session, 'c');
    expect(session.history).toEqual(['a', 'b', 'c']);
    session = markActiveStep(session, 'd');
    expect(session.history).toEqual(['a', 'b', 'c', 'd']);
    session = goBackToStep(session, 'b', ['c']);
    expect(session.activeStep).toBe('b');
    expect(session.history).toEqual(['a', 'b']);
    expect(session.stale).toContain('c');
  });
});
