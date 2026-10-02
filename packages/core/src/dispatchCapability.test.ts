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
    {
      id: 'desk_handoff',
      title: 'Desk handoff',
      aliases: ['desk handoff summary'],
    },
  ],
  mutations: [
    {
      id: 'crm.assign_badge_confirm',
      title: 'Assign badge',
      aliases: ['Assign badge'],
      risk: 'high',
      confirmPrompt: 'Confirm assign?',
      stepId: 'create_tournament',
    },
    {
      id: 'crm.prefill_low',
      title: 'Prefill create',
      aliases: ['prefill create form'],
      risk: 'low',
      stepId: 'create_tournament',
    },
  ],
  tours: [
    {
      id: 'tour_onboard',
      title: 'Onboarding',
      aliases: ['show me around'],
      steps: ['create_tournament'],
      lines: ['Starting onboarding walkthrough.'],
    },
  ],
  search: [
    {
      id: 'search_centers',
      title: 'Centers',
      aliases: ['find centers'],
      path: '/centers',
      stepId: 'create_tournament',
    },
  ],
  heuristics: {
    deskHandoffPatterns: ['\\bdesk handoff\\b', '\\bstandup\\b'],
  },
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
    await tryDispatchCapabilityCatalog(deps, 'Assign badge');
    expect(executeMutation).not.toHaveBeenCalled();
    expect(deps.assistant[0]).toMatch(/Confirm/i);
    expect(deps.session.flags.pendingMutation).toMatchObject({
      mutationId: 'crm.assign_badge_confirm',
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
          mutationId: 'crm.assign_badge_confirm',
          slots: {},
          text: 'Assign badge',
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

  it('explains empty history when no prior coach action', () => {
    const deps = makeDeps();
    expect(tryHandleExplainLast(deps, 'what did you just do')).toBe(true);
    expect(deps.assistant[0]).toMatch(/haven’t taken an assistant action/i);
  });

  it('handles query match when resolveQuery is missing', async () => {
    const deps = makeDeps();
    const handled = await tryDispatchCapabilityCatalog(
      deps,
      'when is my next tournament'
    );
    expect(handled).toBe(true);
  });

  it('opens mutation step when previewMutation is not wired', async () => {
    const deps = makeDeps();
    const handled = await tryDispatchCapabilityCatalog(deps, 'Assign badge');
    expect(handled).toBe(true);
    expect(deps.executed).toContain('create_tournament');
  });

  it('executes low-risk mutation preview without confirm', async () => {
    const deps = makeDeps({
      previewMutation: async () => ({
        text: 'Prefill ready.',
        needsConfirm: false,
        navigatePath: '/create',
        stepId: 'create_tournament',
      }),
      navigate: vi.fn(),
    });
    const handled = await tryDispatchCapabilityCatalog(deps, 'prefill create form');
    expect(handled).toBe(true);
    expect(deps.assistant.at(-1)).toBe('Prefill ready.');
  });

  it('runs tour and search catalog hits', async () => {
    const tourDeps = makeDeps({
      runTour: async () => ({ text: 'Tour started.' }),
    });
    expect(await tryDispatchCapabilityCatalog(tourDeps, 'show me around')).toBe(
      true
    );
    expect(tourDeps.assistant[0]).toMatch(/Tour started/);

    const searchDeps = makeDeps({
      openSearchHit: async () => ({ text: 'Search open.' }),
      navigate: vi.fn(),
    });
    expect(await tryDispatchCapabilityCatalog(searchDeps, 'find centers')).toBe(
      true
    );
    expect(searchDeps.assistant[0]).toMatch(/Search open/);

    const searchFallback = makeDeps({ navigate: vi.fn() });
    expect(await tryDispatchCapabilityCatalog(searchFallback, 'find centers')).toBe(
      true
    );
    expect(searchFallback.assistant[0]).toMatch(/Opening/);
  });

  it('forces desk handoff query when handoff phrasing matches', async () => {
    const deps = makeDeps({
      resolveQuery: async ({ queryId }) => ({
        text: `Handoff via ${queryId}`,
      }),
    });
    expect(await tryDispatchCapabilityCatalog(deps, 'desk handoff please')).toBe(
      true
    );
    expect(deps.assistant[0]).toMatch(/desk_handoff/);
  });

  it('accepts explicit catalog ids via opts', async () => {
    const deps = makeDeps({
      resolveQuery: async () => ({ text: 'Forced query.' }),
      runTour: async () => ({ text: 'Forced tour.' }),
      openSearchHit: async () => ({ text: 'Forced search.' }),
    });
    expect(
      await tryDispatchCapabilityCatalog(deps, 'anything', {
        queryId: 'td.next_tournament',
      })
    ).toBe(true);
    expect(
      await tryDispatchCapabilityCatalog(deps, 'anything', {
        tourId: 'tour_onboard',
      })
    ).toBe(true);
    expect(
      await tryDispatchCapabilityCatalog(deps, 'anything', {
        searchId: 'search_centers',
      })
    ).toBe(true);
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
