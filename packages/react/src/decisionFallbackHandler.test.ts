/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest';
import { createDecisionFallbackHandler } from './decisionFallbackHandler.js';
import { emptySession, type CoachEvent, type LoadedPack } from '@notlm/core';

function minimalPack(): LoadedPack {
  return {
    id: 't',
    version: '0',
    steps: [{ id: 's1', title: 'Step', kind: 'soft', requires: [] }],
    aliases: {},
    controls: {},
    binders: [],
  } as LoadedPack;
}

describe('createDecisionFallbackHandler', () => {
  it('shows thinking then final reply', async () => {
    const messages: Array<{ id: string; text: string; status?: string }> = [];
    let busy = false;
    const handler = createDecisionFallbackHandler({
      pack: minimalPack(),
      features: {},
      fallbackLlm: async () => ({
        reply: 'Hello from Laya',
        proposed: { type: 'refuse' },
      }),
      thinkingLabel: 'Thinking…',
      setMessages: (updater) => {
        const next = updater(messages as never);
        messages.length = 0;
        messages.push(...(next as typeof messages));
      },
      setSession: () => {},
      sessionRef: { current: emptySession() },
      executeStepRef: { current: () => {} },
      navigate: () => {},
      getContext: () => ({ pathname: '/', data: {} }),
      onBusyChange: (b) => {
        busy = b;
      },
    });

    handler({
      type: 'repair',
      kind: 'unknown',
      text: 'please help with my invoice status tomorrow',
    } as CoachEvent);

    expect(messages.some((m) => m.status === 'thinking')).toBe(true);
    await vi.waitFor(() => {
      expect(messages.some((m) => m.text === 'Hello from Laya' && m.status === 'final')).toBe(
        true
      );
    });
    expect(busy).toBe(false);
  });

  it('streams deltas into the thinking bubble', async () => {
    const messages: Array<{ id: string; text: string; status?: string }> = [];
    async function* stream() {
      yield 'Hel';
      yield 'lo';
      yield { text: 'Hello stream', proposed: { type: 'refuse' as const } };
    }
    const handler = createDecisionFallbackHandler({
      pack: minimalPack(),
      features: {},
      fallbackLlm: async () => stream(),
      thinkingLabel: 'Thinking…',
      setMessages: (updater) => {
        const next = updater(messages as never);
        messages.length = 0;
        messages.push(...(next as typeof messages));
      },
      setSession: () => {},
      sessionRef: { current: emptySession() },
      executeStepRef: { current: () => {} },
      navigate: () => {},
      getContext: () => ({ pathname: '/', data: {} }),
    });

    handler({
      type: 'repair',
      kind: 'unknown',
      text: 'please help with my invoice status tomorrow',
    } as CoachEvent);

    await vi.waitFor(() => {
      expect(messages.some((m) => m.text === 'Hello stream' && m.status === 'final')).toBe(
        true
      );
    });
  });
});
