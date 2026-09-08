import { describe, expect, it } from 'vitest';
import { emptySession, markActiveStep } from './slots.js';

describe('markActiveStep', () => {
  it('appends history and sets activeStep', () => {
    const next = markActiveStep(emptySession(), 'create_list');
    expect(next.activeStep).toBe('create_list');
    expect(next.history).toEqual(['create_list']);
  });

  it('does not duplicate consecutive history entries', () => {
    const once = markActiveStep(emptySession(), 'create_list');
    const twice = markActiveStep(once, 'create_list');
    expect(twice.history).toEqual(['create_list']);
  });
});
