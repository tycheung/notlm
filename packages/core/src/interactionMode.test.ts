import { describe, expect, it } from 'vitest';
import {
  askModeInstructCopy,
  elevatePlane,
  modeBlocksAutoNavigate,
  modeBlocksMutations,
  planeRequiredByHeads,
  resolveInteractionMode,
} from './interactionMode.js';

describe('interactionMode', () => {
  it('session flag overrides feature default', () => {
    expect(
      resolveInteractionMode(
        { flags: { interactionMode: 'do' } },
        { defaultInteractionMode: 'ask' }
      )
    ).toBe('do');
  });

  it('falls back to feature default then do', () => {
    expect(
      resolveInteractionMode({}, { defaultInteractionMode: 'ask' })
    ).toBe('ask');
    expect(resolveInteractionMode({}, {})).toBe('do');
  });

  it('Ask blocks nav; only Do allows mutations', () => {
    expect(modeBlocksAutoNavigate('ask')).toBe(true);
    expect(modeBlocksAutoNavigate('guide')).toBe(false);
    expect(modeBlocksMutations('ask')).toBe(true);
    expect(modeBlocksMutations('guide')).toBe(true);
    expect(modeBlocksMutations('do')).toBe(false);
  });

  it('instruct copy is always null (planes are silent)', () => {
    expect(askModeInstructCopy('ask')).toBeNull();
    expect(askModeInstructCopy('guide')).toBeNull();
    expect(askModeInstructCopy('do')).toBeNull();
  });

  it('elevatePlane and planeRequiredByHeads', () => {
    expect(elevatePlane('ask', 'guide')).toBe('guide');
    expect(elevatePlane('guide', 'do')).toBe('do');
    expect(elevatePlane('do', 'ask')).toBe('do');
    expect(planeRequiredByHeads({ mutationId: 'x' })).toBe('do');
    expect(planeRequiredByHeads({ stepId: 's' })).toBe('guide');
    expect(planeRequiredByHeads({})).toBeNull();
  });
});
