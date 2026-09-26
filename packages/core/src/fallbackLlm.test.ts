import { describe, expect, it } from 'vitest';
import {
  invokeLlmFallback,
  isDecisionFallbackEnabled,
  isLearningModeEnabled,
  validateProposedAgainstPack,
} from './fallbackLlm.js';

describe('isLearningModeEnabled', () => {
  it('defaults off', () => {
    expect(isLearningModeEnabled(undefined)).toBe(false);
    expect(isLearningModeEnabled({})).toBe(false);
  });

  it('respects learningMode only', () => {
    expect(isLearningModeEnabled({ learningMode: true })).toBe(true);
    expect(isLearningModeEnabled({ learningMode: false })).toBe(false);
  });
});

describe('isDecisionFallbackEnabled', () => {
  it('defaults on', () => {
    expect(isDecisionFallbackEnabled(undefined)).toBe(true);
    expect(isDecisionFallbackEnabled({})).toBe(true);
  });

  it('can be disabled', () => {
    expect(isDecisionFallbackEnabled({ layaDecisionFallback: false })).toBe(false);
  });
});

describe('validateProposedAgainstPack', () => {
  it('refuses goto with unknown stepId', () => {
    expect(
      validateProposedAgainstPack(
        { type: 'goto', stepId: 'nope' },
        ['create_list']
      )
    ).toEqual({ type: 'refuse' });
  });

  it('keeps valid goto', () => {
    expect(
      validateProposedAgainstPack(
        { type: 'goto', stepId: 'create_list' },
        new Set(['create_list'])
      )
    ).toEqual({ type: 'goto', stepId: 'create_list' });
  });
});

describe('invokeLlmFallback', () => {
  it('returns sanitized reply and defaults proposed to refuse', async () => {
    const result = await invokeLlmFallback(
      async () => ({ reply: '  hello  ' }),
      { text: 'x', kind: 'unknown' }
    );
    expect(result).toEqual({
      reply: 'hello',
      proposed: { type: 'refuse' },
    });
  });

  it('forces refuse when goto step missing from pack', async () => {
    const result = await invokeLlmFallback(
      async () => ({
        reply: 'go there',
        proposed: { type: 'goto', stepId: 'missing' },
      }),
      { text: 'x', kind: 'unknown' },
      { knownStepIds: ['create_list'] }
    );
    expect(result?.proposed).toEqual({ type: 'refuse' });
  });

  it('returns null on timeout', async () => {
    const result = await invokeLlmFallback(
      () => new Promise(() => {}),
      { text: 'x', kind: 'unknown' },
      { timeoutMs: 20 }
    );
    expect(result).toBeNull();
  });

  it('returns null when fn throws', async () => {
    const result = await invokeLlmFallback(
      async () => {
        throw new Error('boom');
      },
      { text: 'x', kind: 'unknown' }
    );
    expect(result).toBeNull();
  });
});
