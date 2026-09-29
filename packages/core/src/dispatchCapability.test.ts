import { describe, expect, it, vi } from 'vitest';
import {
  tryDispatchCapabilityCatalog,
  tryHandleContextAsk,
  tryHandleExplainLast,
  tryHandlePendingMutationConfirm,
} from './dispatchCapability.js';
import { isVisionFallbackEnabled } from './fallbackLlm.js';
import { loadPackFromJson } from './loadPack.js';
import { emptySession } from './slots.js';
import type { DispatchDeps } from './dispatchDeps.js';
import type { SessionSlots } from './types.js';

const pack = loadPackFromJson({
  manifest: { id: 'cap-demo' },
  flow: [
    {
      id: 'create_tournament',
      title: 'Create tournament',
      keywords: ['create tournament'],
      kind: 'hard',
      requires: [],
    },
  ],
  controls: [],
  intents: { aliases: {}, meta: [] },
  binders: {},
  queries: [
    {
      id: 'td.next_tournament',
      title: 'Next tournament',
      aliases: ['when is my next tournament'],
    },
  ],
  mutations: [
    {
      id: 'td.assign_usbc_confirm',
      title: 'Assign USBC',
      aliases: ['assign usbc'],
      risk: 'high',
      confirmPrompt: 'Confirm assign?',
      stepId: 'create_tournament',
    },
  ],
});

function makeDeps(overrides: Partial<DispatchDeps> = {}): DispatchDeps & {
  assistant: string[];
  executed: string[];
  sessions: SessionSlots[];
} {
  const assistant: string[] = [];
  const executed: string[] = [];
  const sessions: SessionSlots[] = [];
  let session = emptySession();
  const deps: DispatchDeps & {
    assistant: string[];
    executed: string[];
    sessions: SessionSlots[];
  } = {
    assistant,
    executed,
    sessions,
    text: '',
    pack,
    get session() {
      return session;
    },
    ctx: { pathname: '/director', data: {} },
    pushAssistant: (msg) => {
      assistant.push(msg);
    },
    setSession: (updater) => {
      session = typeof updater === 'function' ? updater(session) : updater;
      sessions.push(session);
    },
    executeStep: (id) => {
      executed.push(id);
    },
    ...overrides,
  };
  return deps;
}

describe('capability dispatch', () => {
  it('answers matched data queries via resolveQuery', async () => {
    const deps = makeDeps({
      resolveQuery: async () => ({
        text: 'Your next tournament is Sweepers at Lane 1.',
      }),
    });
    const handled = await tryDispatchCapabilityCatalog(
      deps,
      'when is my next tournament'
    );
    expect(handled).toBe(true);
    expect(deps.assistant[0]).toMatch(/Sweepers/);
  });

  it('requires confirm before high-risk mutation execute', async () => {
    const executeMutation = vi.fn(async () => ({ text: 'Assigned.' }));
    const deps = makeDeps({
      previewMutation: async () => ({
        text: 'Confirm assign?',
        needsConfirm: true,
      }),
      executeMutation,
    });
    await tryDispatchCapabilityCatalog(deps, 'assign usbc');
    expect(executeMutation).not.toHaveBeenCalled();
    expect(deps.assistant[0]).toMatch(/Confirm/i);
    expect(deps.session.flags.pendingMutation).toMatchObject({
      mutationId: 'td.assign_usbc_confirm',
    });

    const confirmed = await tryHandlePendingMutationConfirm(deps, 'yes');
    expect(confirmed).toBe(true);
    expect(executeMutation).toHaveBeenCalledOnce();
    expect(deps.assistant.at(-1)).toBe('Assigned.');
  });

  it('cancels pending mutation on no', () => {
    const deps = makeDeps();
    deps.setSession((s) => ({
      ...s,
      flags: {
        ...s.flags,
        pendingMutation: {
          mutationId: 'td.assign_usbc_confirm',
          slots: {},
          text: 'assign usbc',
        },
      },
    }));
    expect(tryHandlePendingMutationConfirm(deps, 'no')).toBe(true);
    expect(deps.assistant[0]).toMatch(/Canceled/);
    expect(deps.session.flags.pendingMutation).toBeUndefined();
  });

  it('answers contextAsk from host or pathname fallback', () => {
    const withHost = makeDeps({
      resolveContextAsk: () => 'Name is required before you can save.',
    });
    expect(tryHandleContextAsk(withHost, "why can't I save")).toBe(true);
    expect(withHost.assistant[0]).toMatch(/Name is required/);

    const fallback = makeDeps();
    expect(tryHandleContextAsk(fallback, "what's missing on this form")).toBe(
      true
    );
    expect(fallback.assistant[0]).toMatch(/\/director/);
  });

  it('explains last coach action', async () => {
    const deps = makeDeps({
      resolveQuery: async () => ({ text: 'Next is Sweepers.' }),
    });
    await tryDispatchCapabilityCatalog(deps, 'when is my next tournament');
    expect(tryHandleExplainLast(deps, 'what did you just open')).toBe(true);
    expect(deps.assistant.at(-1)).toMatch(/Last action/);
  });
});

describe('vision fallback gate', () => {
  it('defaults off and requires explicit feature flag', () => {
    expect(isVisionFallbackEnabled(undefined)).toBe(false);
    expect(isVisionFallbackEnabled({})).toBe(false);
    expect(isVisionFallbackEnabled({ visionFallback: false })).toBe(false);
    expect(isVisionFallbackEnabled({ visionFallback: true })).toBe(true);
  });
});
