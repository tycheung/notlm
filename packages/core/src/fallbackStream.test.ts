import { describe, expect, it } from 'vitest';
import {
  invokeLlmFallback,
  invokeStreamingDecisionFallback,
  type LlmFallbackFn,
} from './fallbackLlm.js';

describe('streaming fallback', () => {
  it('consumes async iterable deltas', async () => {
    async function* gen() {
      yield 'a';
      yield { delta: 'b', proposed: { type: 'refuse' as const } };
    }
    const fn: LlmFallbackFn = async () => gen();
    const deltas: string[] = [];
    const result = await invokeLlmFallback(fn, { text: 'x', kind: 'unknown' }, {
      onDelta: (t) => deltas.push(t),
    });
    expect(result?.reply).toBe('ab');
    expect(deltas).toContain('a');
    expect(deltas).toContain('ab');
  });

  it('invokeStreamingDecisionFallback aliases chain', async () => {
    const result = await invokeStreamingDecisionFallback({
      primary: async () => ({ reply: 'ok', proposed: { type: 'refuse' } }),
      request: { text: 'hi', kind: 'unknown' },
    });
    expect(result?.reply).toBe('ok');
  });
});
