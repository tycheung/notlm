/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest';
import { createDecisionFallbackHandler } from './decisionFallbackHandler.js';
import {
  buildSemanticIndex,
  emptySession,
  type CoachEvent,
  type LoadedPack,
} from '@notlm/core';

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
        if (b) busy = true;
      },
      onAsyncFallbackStarted: () => 1,
      onAsyncFallbackFinished: () => {
        busy = false;
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

  it('skips Laya and strips Thinking when abort is already set', async () => {
    const messages: Array<{ id: string; text: string; status?: string }> = [];
    const ac = new AbortController();
    ac.abort();
    let layaCalled = false;
    let finished = false;
    let started = false;
    const handler = createDecisionFallbackHandler({
      pack: minimalPack(),
      features: {},
      fallbackLlm: async () => {
        layaCalled = true;
        return { reply: 'should not appear', proposed: { type: 'refuse' } };
      },
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
      getAbortSignal: () => ac.signal,
      onAsyncFallbackStarted: () => {
        started = true;
        return 1;
      },
      onAsyncFallbackFinished: () => {
        finished = true;
      },
    });

    handler({
      type: 'repair',
      kind: 'unknown',
      text: 'please help with my invoice status tomorrow',
    } as CoachEvent);

    await Promise.resolve();
    await Promise.resolve();
    expect(layaCalled).toBe(false);
    expect(started).toBe(false);
    expect(finished).toBe(false);
    expect(messages.some((m) => m.status === 'thinking')).toBe(false);
    expect(messages.some((m) => m.text === 'should not appear')).toBe(false);
  });

  it('calls onAsyncFallbackStarted and onAsyncFallbackFinished around Laya', async () => {
    let startedGen: number | undefined;
    let finishedGen: number | undefined;
    const handler = createDecisionFallbackHandler({
      pack: minimalPack(),
      features: {},
      fallbackLlm: async () => ({
        reply: 'ok',
        proposed: { type: 'refuse' },
      }),
      thinkingLabel: 'Thinking…',
      setMessages: (updater) => {
        updater([] as never);
      },
      setSession: () => {},
      sessionRef: { current: emptySession() },
      executeStepRef: { current: () => {} },
      navigate: () => {},
      getContext: () => ({ pathname: '/', data: {} }),
      onAsyncFallbackStarted: () => {
        startedGen = 7;
        return 7;
      },
      onAsyncFallbackFinished: (gen) => {
        finishedGen = gen;
      },
    });

    handler({
      type: 'repair',
      kind: 'unknown',
      text: 'something off domain entirely here',
    } as CoachEvent);

    await vi.waitFor(() => expect(startedGen).toBe(7));
    await vi.waitFor(() => expect(finishedGen).toBe(7));
  });

  it('skips Laya when rawIntent is ood (canned reply already shown)', async () => {
    let layaCalled = false;
    const handler = createDecisionFallbackHandler({
      pack: minimalPack(),
      features: {},
      fallbackLlm: async () => {
        layaCalled = true;
        return { reply: 'nope', proposed: { type: 'refuse' } };
      },
      thinkingLabel: 'Thinking…',
      setMessages: () => {},
      setSession: () => {},
      sessionRef: { current: emptySession() },
      executeStepRef: { current: () => {} },
      navigate: () => {},
      getContext: () => ({ pathname: '/', data: {} }),
    });

    handler({
      type: 'repair',
      kind: 'unknown',
      text: 'tell me a joke about running shoes',
      rawIntent: 'ood',
    } as CoachEvent);

    await Promise.resolve();
    expect(layaCalled).toBe(false);
  });

  it('clears busy and thinking bubble when fallback throws', async () => {
    const messages: Array<{ id: string; text: string; status?: string }> = [];
    let busy = false;
    const handler = createDecisionFallbackHandler({
      pack: minimalPack(),
      features: {},
      fallbackLlm: async () => {
        throw new Error('laya down');
      },
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
      // Host only raises busy on true; clear via gen-guarded finish.
      onBusyChange: (b) => {
        if (b) busy = true;
      },
      onAsyncFallbackStarted: () => 1,
      onAsyncFallbackFinished: () => {
        busy = false;
      },
    });

    handler({
      type: 'repair',
      kind: 'unknown',
      text: 'please help with my invoice status tomorrow',
    } as CoachEvent);

    await vi.waitFor(() => {
      expect(busy).toBe(false);
      expect(messages.some((m) => m.status === 'thinking')).toBe(false);
      expect(messages.some((m) => m.status === 'final')).toBe(true);
    });
  });

  it('semantic FAQ short-circuit skips Laya and logs assistant reply', async () => {
    const faq = [
      {
        id: 'faq-max',
        aliases: ['is max 300 enforced'],
        text: 'Max 300 caps game scores.',
      },
    ];
    const index = buildSemanticIndex({ faq });
    const messages: Array<{ id: string; text: string; status?: string }> = [];
    let layaCalled = false;
    let started = false;
    let busyFalse = 0;
    let logged = '';
    let resolved: 'hit' | undefined;
    const handler = createDecisionFallbackHandler({
      pack: {
        ...minimalPack(),
        faq,
        semanticIndex: index,
        semanticIndexLayers: [index],
      } as LoadedPack,
      features: {},
      fallbackLlm: async () => {
        layaCalled = true;
        return { reply: 'laya', proposed: { type: 'refuse' } };
      },
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
      onAsyncFallbackStarted: () => {
        started = true;
        return 1;
      },
      onBusyChange: (b) => {
        if (!b) busyFalse += 1;
      },
      onAssistantReply: (t) => {
        logged = t;
      },
      onRepairResolved: (outcome) => {
        resolved = outcome;
      },
    });

    handler({
      type: 'repair',
      kind: 'unknown',
      text: 'is max 300 enforced',
    } as CoachEvent);

    await Promise.resolve();
    expect(layaCalled).toBe(false);
    expect(started).toBe(false);
    expect(busyFalse).toBe(0);
    expect(resolved).toBe('hit');
    expect(logged).toBe('Max 300 caps game scores.');
    expect(messages.some((m) => m.text === 'Max 300 caps game scores.')).toBe(
      true
    );
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
