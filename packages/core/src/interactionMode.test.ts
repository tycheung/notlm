import { describe, expect, it } from 'vitest';
import {
  askModeInstructCopy,
  modeBlocksAutoNavigate,
  modeBlocksMutations,
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

  it('instruct copy is mode-specific', () => {
    expect(askModeInstructCopy('ask')).toMatch(/Ask mode/i);
    expect(askModeInstructCopy('guide')).toMatch(/Guide mode/i);
    expect(askModeInstructCopy('do')).toBeNull();
  });
});
