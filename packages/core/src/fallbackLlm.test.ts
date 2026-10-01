import { describe, expect, it, vi } from 'vitest';
import {
  composeDecisionFallbackChain,
  invokeChainedDecisionFallback,
  invokeLlmFallback,
  isAutoExecuteTrustedGotoEnabled,
  isAutoExecutableTrustedGoto,
  isDecisionFallbackEnabled,
  isFallbackRefuse,
  isLearningModeEnabled,
  isSecondaryLlmFallbackEnabled,
  isTrustedGoto,
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

describe('isSecondaryLlmFallbackEnabled', () => {
  it('defaults off', () => {
    expect(isSecondaryLlmFallbackEnabled(undefined)).toBe(false);
    expect(isSecondaryLlmFallbackEnabled({})).toBe(false);
    expect(isSecondaryLlmFallbackEnabled({ layaDecisionFallback: true })).toBe(false);
  });

  it('opt-in only', () => {
    expect(isSecondaryLlmFallbackEnabled({ llmFallbackOnLayaMiss: true })).toBe(true);
  });
});

describe('isFallbackRefuse', () => {
  it('treats null and refuse as miss', () => {
    expect(isFallbackRefuse(null)).toBe(true);
    expect(isFallbackRefuse({ reply: 'no', proposed: { type: 'refuse' } })).toBe(true);
    expect(
      isFallbackRefuse({
        reply: 'go',
        proposed: { type: 'goto', stepId: 'create_list' },
      })
    ).toBe(false);
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

describe('isTrustedGoto', () => {
  it('is true only for pack-validated goto', () => {
    expect(isTrustedGoto({ type: 'goto', stepId: 'create_list' }, ['create_list'])).toBe(
      true
    );
    expect(isTrustedGoto({ type: 'goto', stepId: 'nope' }, ['create_list'])).toBe(false);
    expect(isTrustedGoto({ type: 'refuse' }, ['create_list'])).toBe(false);
  });
});

describe('isAutoExecutableTrustedGoto', () => {
  it('requires high-confidence aliases and rejects OOD refuse text', () => {
    expect(
      isAutoExecutableTrustedGoto(
        { type: 'goto', stepId: 'billing_ready' },
        ['billing_ready'],
        'I can take you to “billing_ready”.'
      )
    ).toBe(false);
    expect(
      isAutoExecutableTrustedGoto(
        {
          type: 'goto',
          stepId: 'billing_ready',
          aliases: ['open billing'],
        },
        ['billing_ready'],
        'I can take you to “billing_ready”.'
      )
    ).toBe(true);
    expect(
      isAutoExecutableTrustedGoto(
        {
          type: 'goto',
          stepId: 'billing_ready',
          aliases: ['tell me a joke'],
        },
        ['billing_ready'],
        'I do not have the ability to help with jokes.'
      )
    ).toBe(false);
    expect(
      isAutoExecutableTrustedGoto(
        {
          type: 'goto',
          stepId: 'billing_ready',
          aliases: ['open billing'],
        },
        ['billing_ready'],
        'I can take you to “billing_ready”.',
        'tell me a joke'
      )
    ).toBe(false);
  });
});

describe('shouldSurfaceTrustedGoto', () => {
  it('refuses clear OOD and non-nav take-you-to chips', async () => {
    const { shouldSurfaceTrustedGoto } = await import('./fallbackLlm.js');
    expect(
      shouldSurfaceTrustedGoto(
        {
          type: 'goto',
          stepId: 'billing_ready',
          aliases: ['open billing'],
        },
        ['billing_ready'],
        'I can take you to “billing_ready”.',
        'tell me a joke'
      )
    ).toBe(false);
    expect(
      shouldSurfaceTrustedGoto(
        { type: 'goto', stepId: 'billing_ready' },
        ['billing_ready'],
        'I can take you to “billing_ready”.',
        'form validation help'
      )
    ).toBe(false);
    expect(
      shouldSurfaceTrustedGoto(
        {
          type: 'goto',
          stepId: 'billing_ready',
          aliases: ['navigate to subscription'],
        },
        ['billing_ready'],
        'I can take you to “billing_ready”.',
        'navigate to subscription'
      )
    ).toBe(true);
    expect(
      shouldSurfaceTrustedGoto(
        { type: 'goto', stepId: 'billing_ready', aliases: ['open billing'] },
        ['billing_ready'],
        'I can take you to “billing_ready”.',
        'why is continue greyed out'
      )
    ).toBe(false);
  });
});

describe('isAutoExecuteTrustedGotoEnabled', () => {
  it('defaults on', () => {
    expect(isAutoExecuteTrustedGotoEnabled(undefined)).toBe(true);
    expect(isAutoExecuteTrustedGotoEnabled({})).toBe(true);
  });

  it('can be disabled', () => {
    expect(isAutoExecuteTrustedGotoEnabled({ autoExecuteTrustedGoto: false })).toBe(
      false
    );
  });
});

describe('invokeLlmFallback catalog request', () => {
  it('forwards stepIds and faqIds on the request to the host fn', async () => {
    const seen: { stepIds?: string[]; faqIds?: string[] } = {};
    await invokeLlmFallback(
      async (req) => {
        seen.stepIds = req.stepIds;
        seen.faqIds = req.faqIds;
        return {
          reply: 'go',
          proposed: { type: 'goto', stepId: 'create_list' },
        };
      },
      {
        text: 'x',
        kind: 'unknown',
        stepIds: ['create_list', 'other'],
        faqIds: ['faq-1'],
      },
      { knownStepIds: ['create_list', 'other'] }
    );
    expect(seen.stepIds).toEqual(['create_list', 'other']);
    expect(seen.faqIds).toEqual(['faq-1']);
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

describe('invokeChainedDecisionFallback', () => {
  it('returns Laya hit without calling secondary', async () => {
    const secondary = vi.fn(async () => ({
      reply: 'llm',
      proposed: { type: 'goto' as const, stepId: 'create_list' },
      provider: { id: 'openai', model: 'gpt' },
    }));
    const result = await invokeChainedDecisionFallback({
      primary: async () => ({
        reply: 'laya',
        proposed: { type: 'goto', stepId: 'create_list' },
        provider: { id: 'laya', model: 'ckpt' },
      }),
      secondary,
      secondaryEnabled: true,
      request: { text: 'create list', kind: 'unknown' },
      opts: { knownStepIds: ['create_list'] },
    });
    expect(result?.reply).toBe('laya');
    expect(secondary).not.toHaveBeenCalled();
  });

  it('escalates when Laya returns canned OOD text with non-refuse proposed', async () => {
    const result = await invokeChainedDecisionFallback({
      primary: async () => ({
        reply:
          'No — I am a product assistant, and I do not have the ability to help with tournaments events.',
        proposed: { type: 'meta' },
        provider: { id: 'laya', model: 'ckpt' },
      }),
      secondary: async () => ({
        reply: 'Tournaments contain events.',
        proposed: { type: 'meta' },
        provider: { id: 'ollama', model: 'llama' },
      }),
      secondaryEnabled: true,
      request: { text: 'how do tournaments relate to events', kind: 'unknown' },
    });
    expect(result?.reply).toContain('Tournaments contain events');
    expect(result?.provider).toMatchObject({ chain: 'laya_then_llm' });
  });

  it('escalates to secondary on Laya refuse when enabled', async () => {
    const result = await invokeChainedDecisionFallback({
      primary: async () => ({
        reply: 'no',
        proposed: { type: 'refuse' },
        provider: { id: 'laya', model: 'ckpt' },
      }),
      secondary: async () => ({
        reply: 'try create_list',
        proposed: { type: 'goto', stepId: 'create_list' },
        provider: { id: 'openai', model: 'gpt' },
        exchangeId: 'llm-1',
      }),
      secondaryEnabled: true,
      request: { text: 'make a list', kind: 'unknown' },
      opts: { knownStepIds: ['create_list'] },
    });
    expect(result?.proposed).toEqual({ type: 'goto', stepId: 'create_list' });
    expect(result?.provider).toMatchObject({
      id: 'openai',
      chain: 'laya_then_llm',
      prior: 'laya',
    });
  });

  it('keeps Laya refuse when secondary disabled or missing', async () => {
    const secondary = vi.fn();
    const refused = await invokeChainedDecisionFallback({
      primary: async () => ({
        reply: 'no',
        proposed: { type: 'refuse' },
        provider: { id: 'laya', model: 'ckpt' },
      }),
      secondary,
      secondaryEnabled: false,
      request: { text: 'x', kind: 'unknown' },
    });
    expect(refused?.proposed?.type).toBe('refuse');
    expect(secondary).not.toHaveBeenCalled();
  });

  it('keeps Laya refuse when secondary returns null', async () => {
    const result = await invokeChainedDecisionFallback({
      primary: async () => ({
        reply: 'no',
        proposed: { type: 'refuse' },
        provider: { id: 'laya', model: 'ckpt' },
      }),
      secondary: async () => null,
      secondaryEnabled: true,
      request: { text: 'x', kind: 'unknown' },
    });
    expect(result?.reply).toBe('no');
    expect(result?.provider?.id).toBe('laya');
  });

  it('composeDecisionFallbackChain wraps the same behavior', async () => {
    const fn = composeDecisionFallbackChain({
      primary: async () => ({
        reply: 'no',
        proposed: { type: 'refuse' },
        provider: { id: 'laya', model: 'ckpt' },
      }),
      secondary: async () => ({
        reply: 'llm ok',
        proposed: { type: 'meta' },
        provider: { id: 'ollama', model: 'llama' },
      }),
      secondaryEnabled: true,
    });
    const result = await fn({ text: 'x', kind: 'unknown' });
    expect(result?.reply).toBe('llm ok');
    expect(result?.provider?.chain).toBe('laya_then_llm');
  });
});
