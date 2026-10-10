import { describe, expect, it, vi } from 'vitest';
import {
  tryDispatchCapabilityCatalog,
  tryHandleContextAsk,
  tryHandleExplainLast,
  tryHandleOrphanConfirmNo,
  tryHandlePendingMutationConfirm,
} from './dispatchCapability.js';
import { dispatchParsed } from './dispatchParsed.js';
import { loadPackFromJson } from './loadPack.js';
import { emptySession } from './slots.js';
import type { DispatchDeps } from './dispatchDeps.js';
import type { IntentParsePack, SessionSlots } from './types.js';

const pack = loadPackFromJson({
  manifest: { id: 'cap-demo' },
  flow: [
    {
      id: 'create_record',
      title: 'Create record',
      keywords: ['create record'],
      kind: 'hard',
      requires: [],
    },
  ],
  controls: [],
  intents: { aliases: {}, meta: [] },
  binders: {},
  queries: [
    {
      id: 'assistant.next_item',
      title: 'Next item',
      aliases: ['when is my next item'],
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
      stepId: 'create_record',
    },
    {
      id: 'crm.prefill_low',
      title: 'Prefill create',
      aliases: ['prefill create form'],
      risk: 'low',
      stepId: 'create_record',
    },
  ],
  tours: [
    {
      id: 'tour_onboard',
      title: 'Onboarding',
      aliases: ['show me around'],
      steps: ['create_record'],
      lines: ['Starting onboarding walkthrough.'],
    },
  ],
  search: [
    {
      id: 'search_workspaces',
      title: 'Workspaces',
      aliases: ['find workspaces'],
      path: '/workspaces',
      stepId: 'create_record',
    },
  ],
  heuristics: {
    deskHandoffPatterns: ['\\bdesk handoff\\b', '\\bstandup\\b'],
  },
});

function makeDeps(overrides: Partial<DispatchDeps> = {}): DispatchDeps & {
  assistant: string[];
  executed: string[];
  executeOpts: Array<Record<string, unknown> | undefined>;
  sessions: SessionSlots[];
} {
  const assistant: string[] = [];
  const executed: string[] = [];
  const executeOpts: Array<Record<string, unknown> | undefined> = [];
  const sessions: SessionSlots[] = [];
  let session = emptySession();
  const deps: DispatchDeps & {
    assistant: string[];
    executed: string[];
    executeOpts: Array<Record<string, unknown> | undefined>;
    sessions: SessionSlots[];
  } = {
    assistant,
    executed,
    executeOpts,
    sessions,
    text: '',
    pack,
    get session() {
      return session;
    },
    ctx: { pathname: '/workspace', data: {} },
    pushAssistant: (msg) => {
      assistant.push(msg);
    },
    setSession: (updater) => {
      session = typeof updater === 'function' ? updater(session) : updater;
      sessions.push(session);
    },
    executeStep: (id, opts) => {
      executed.push(id);
      executeOpts.push(opts as Record<string, unknown> | undefined);
    },
    ...overrides,
  };
  return deps;
}

describe('capability dispatch', () => {
  it('answers matched data queries via resolveQuery', async () => {
    const deps = makeDeps({
      resolveQuery: async () => ({
        text: 'Your next item is Sample Event at Sample Venue.',
      }),
    });
    const handled = await tryDispatchCapabilityCatalog(
      deps,
      'when is my next item'
    );
    expect(handled).toBe(true);
    expect(deps.assistant[0]).toMatch(/Sample Event/);
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

  it('acks confirmed mutation when host returns empty UI', async () => {
    const deps = makeDeps({
      executeMutation: async () => ({ text: '' }),
    });
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
    expect(await tryHandlePendingMutationConfirm(deps, 'yes')).toBe(true);
    expect(deps.assistant.at(-1)).toBe('Done.');
    expect(deps.session.flags.pendingMutation).toBeUndefined();
  });

  it('opens surface when executeMutation returns forceOpenSurface without stepId', async () => {
    const openSurface = vi.fn();
    const executeMutation = vi.fn(async () => ({
      text: 'Confirm on screen.',
      slots: { forceOpenSurface: 'confirmDeleteCenter', centerId: 7 },
    }));
    const deps = makeDeps({ executeMutation, openSurface });
    deps.setSession((s) => ({
      ...s,
      flags: {
        ...s.flags,
        pendingMutation: {
          mutationId: 'crm.assign_badge_confirm',
          slots: {},
          text: 'yes',
        },
      },
    }));
    expect(await tryHandlePendingMutationConfirm(deps, 'yes')).toBe(true);
    expect(openSurface).toHaveBeenCalledWith('confirmDeleteCenter', '7');
  });

  it('clears pendingMutation before execute so double yes cannot re-enter', async () => {
    let release!: (value: { text: string }) => void;
    const gate = new Promise<{ text: string }>((r) => {
      release = r;
    });
    const executeMutation = vi.fn(async () => gate);
    const deps = makeDeps({ executeMutation });
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
    const first = tryHandlePendingMutationConfirm(deps, 'yes');
    expect(deps.session.flags.pendingMutation).toBeUndefined();
    const second = tryHandlePendingMutationConfirm(deps, 'yes');
    expect(second).toBe(false);
    release({ text: 'Assigned once.' });
    expect(await first).toBe(true);
    expect(executeMutation).toHaveBeenCalledOnce();
    expect(deps.assistant.at(-1)).toBe('Assigned once.');
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

  it('orphan Cancel without pending confirm does not fall through', () => {
    const deps = makeDeps();
    expect(tryHandleOrphanConfirmNo(deps, 'Cancel')).toBe(true);
    expect(deps.assistant[0]).toMatch(/Nothing pending to cancel/);
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
    expect(fallback.assistant[0]).toMatch(/\/workspace/);
  });

  it('explains last coach action', async () => {
    const deps = makeDeps({
      resolveQuery: async () => ({ text: 'Next is Sample Event.' }),
    });
    await tryDispatchCapabilityCatalog(deps, 'when is my next item');
    expect(tryHandleExplainLast(deps, 'what did you just open')).toBe(true);
    expect(deps.assistant.at(-1)).toMatch(/Last action/);
  });

  it('explains empty history when no prior coach action', () => {
    const deps = makeDeps();
    expect(tryHandleExplainLast(deps, 'what did you just do')).toBe(true);
    expect(deps.assistant[0]).toMatch(/haven’t taken an assistant action/i);
  });

  it('falls through when query matches but resolveQuery is missing', async () => {
    const deps = makeDeps();
    const handled = await tryDispatchCapabilityCatalog(
      deps,
      'when is my next item'
    );
    expect(handled).toBe(false);
  });

  it('does not auto-open high-risk mutation when previewMutation is unwired', async () => {
    const deps = makeDeps();
    const handled = await tryDispatchCapabilityCatalog(deps, 'Assign badge');
    expect(handled).toBe(true);
    expect(deps.executed).toHaveLength(0);
    expect(deps.assistant[0]).toMatch(/once it’s wired|once it's wired/i);
  });

  it('opens low-risk mutation step when previewMutation is not wired', async () => {
    const deps = makeDeps();
    const handled = await tryDispatchCapabilityCatalog(deps, 'prefill create form');
    expect(handled).toBe(true);
    expect(deps.executed).toContain('create_record');
  });

  it('executes low-risk mutation preview without confirm', async () => {
    const navigate = vi.fn();
    const deps = makeDeps({
      previewMutation: async () => ({
        text: 'Prefill ready.',
        needsConfirm: false,
        navigatePath: '/create',
        autoNavigate: true,
        stepId: 'create_record',
      }),
      navigate,
    });
    const handled = await tryDispatchCapabilityCatalog(deps, 'prefill create form');
    expect(handled).toBe(true);
    expect(deps.assistant.at(-1)).toBe('Prefill ready.');
    expect(navigate).toHaveBeenCalledWith('/create');
  });

  it('does not auto-navigate from navigatePath without autoNavigate', async () => {
    const navigate = vi.fn();
    const deps = makeDeps({
      previewMutation: async () => ({
        text: 'Info only.',
        needsConfirm: false,
        navigatePath: '/create',
        stepId: 'create_record',
      }),
      navigate,
    });
    await tryDispatchCapabilityCatalog(deps, 'prefill create form');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('acks low-risk executeMutation empty/null without repair', async () => {
    const deps = makeDeps({
      previewMutation: async () => ({
        text: '',
        needsConfirm: false,
      }),
      executeMutation: async () => null,
    });
    expect(await tryDispatchCapabilityCatalog(deps, 'prefill create form')).toBe(
      true
    );
    // null execute still honors pack/preview stepId (not a silent Done drop).
    expect(deps.assistant.at(-1)).toMatch(/Opening/);
    expect(deps.executed).toContain('create_record');
  });

  it('falls through when previewMutation returns null', async () => {
    const deps = makeDeps({
      previewMutation: async () => null,
    });
    expect(await tryDispatchCapabilityCatalog(deps, 'prefill create form')).toBe(
      false
    );
    expect(deps.assistant).toHaveLength(0);
  });

  it('pushes blocked preview text without confirm chips', async () => {
    const deps = makeDeps({
      previewMutation: async () => ({
        text: 'Deletes are blocked while read-only.',
        needsConfirm: false,
      }),
    });
    expect(await tryDispatchCapabilityCatalog(deps, 'Assign badge')).toBe(true);
    expect(deps.assistant[0]).toMatch(/blocked/);
    expect(deps.session.flags.pendingMutation).toBeUndefined();
  });

  it('acks Done when executeMutation null and no step/nav UI', async () => {
    const barePack = loadPackFromJson({
      manifest: { id: 'cap-bare' },
      flow: pack.steps,
      controls: [],
      intents: { aliases: {}, meta: [] },
      binders: {},
      mutations: [
        {
          id: 'crm.prefill_low',
          title: 'Prefill create',
          aliases: ['prefill create form'],
          risk: 'low',
        },
      ],
    });
    const deps = makeDeps({
      pack: barePack,
      previewMutation: async () => ({
        text: '',
        needsConfirm: false,
      }),
      executeMutation: async () => null,
    });
    expect(await tryDispatchCapabilityCatalog(deps, 'prefill create form')).toBe(
      true
    );
    expect(deps.assistant.at(-1)).toBe('Done.');
    expect(deps.executed).toHaveLength(0);
  });

  it('low-risk mutation empty text still acks and passes prefill slots', async () => {
    const deps = makeDeps({
      previewMutation: async () => ({
        text: '',
        needsConfirm: false,
        stepId: 'create_record',
        slots: { name: 'Acme' },
      }),
    });
    const handled = await tryDispatchCapabilityCatalog(deps, 'prefill create form');
    expect(handled).toBe(true);
    expect(deps.assistant.at(-1)).toMatch(/Opening/);
    expect(deps.executed).toContain('create_record');
    expect(deps.executeOpts.at(-1)).toMatchObject({
      skipCoach: true,
      prefill: { name: 'Acme' },
    });
  });

  it('low-risk preview falls back to pack stepId when executeMutation unwired', async () => {
    const deps = makeDeps({
      previewMutation: async () => ({
        text: 'Opening form.',
        needsConfirm: false,
        // omit stepId — pack mutation declares create_record
      }),
    });
    const handled = await tryDispatchCapabilityCatalog(deps, 'prefill create form');
    expect(handled).toBe(true);
    expect(deps.executed).toContain('create_record');
    expect(deps.assistant.at(-1)).toBe('Opening form.');
  });

  it('low-risk executeMutation result does not re-open pack stepId', async () => {
    const executeMutation = vi.fn(async () => ({ text: 'Committed.' }));
    const deps = makeDeps({
      previewMutation: async () => ({
        text: 'Opening form.',
        needsConfirm: false,
        stepId: 'create_record',
      }),
      executeMutation,
    });
    const handled = await tryDispatchCapabilityCatalog(deps, 'prefill create form');
    expect(handled).toBe(true);
    expect(executeMutation).toHaveBeenCalledOnce();
    expect(deps.executed).not.toContain('create_record');
    expect(deps.assistant.at(-1)).toBe('Committed.');
  });

  it('preserves preview autoNavigate when executeMutation omits it', async () => {
    const navigate = vi.fn();
    const deps = makeDeps({
      previewMutation: async () => ({
        text: 'Prefill ready.',
        needsConfirm: false,
        navigatePath: '/create',
        autoNavigate: true,
      }),
      executeMutation: async () => ({ text: 'Saved.' }),
      navigate,
    });
    await tryDispatchCapabilityCatalog(deps, 'prefill create form');
    expect(navigate).toHaveBeenCalledWith('/create');
    expect(deps.assistant.at(-1)).toBe('Saved.');
  });

  it('fuzzy query empty resolve falls through', async () => {
    const deps = makeDeps({
      resolveQuery: async () => ({ text: '' }),
    });
    expect(await tryDispatchCapabilityCatalog(deps, 'when is my next item')).toBe(
      false
    );
    expect(deps.assistant).toHaveLength(0);
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
    expect(await tryDispatchCapabilityCatalog(searchDeps, 'find workspaces')).toBe(
      true
    );
    expect(searchDeps.assistant[0]).toMatch(/Search open/);

    const searchFallback = makeDeps({ navigate: vi.fn() });
    expect(await tryDispatchCapabilityCatalog(searchFallback, 'find workspaces')).toBe(
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

  it('accepts explicit catalog ids via opts when aliases match', async () => {
    const deps = makeDeps({
      resolveQuery: async () => ({ text: 'Forced query.' }),
      runTour: async () => ({ text: 'Forced tour.' }),
      openSearchHit: async () => ({ text: 'Forced search.' }),
    });
    expect(
      await tryDispatchCapabilityCatalog(deps, 'when is my next item', {
        queryId: 'assistant.next_item',
      })
    ).toBe(true);
    expect(
      await tryDispatchCapabilityCatalog(deps, 'show me around', {
        tourId: 'tour_onboard',
      })
    ).toBe(true);
    expect(
      await tryDispatchCapabilityCatalog(deps, 'find workspaces', {
        searchId: 'search_workspaces',
      })
    ).toBe(true);
  });

  it('does not claim handled for empty resolver answers', async () => {
    const deps = makeDeps({
      resolveQuery: async () => ({ text: '   ' }),
    });
    expect(
      await tryDispatchCapabilityCatalog(deps, 'when is my next item', {
        queryId: 'assistant.next_item',
      })
    ).toBe(false);
    expect(deps.assistant).toHaveLength(0);
  });

  it('side-effect-only answers push a visible ack bubble', async () => {
    const deps = makeDeps({
      resolveQuery: async () => ({
        text: '',
        stepId: 'create_record',
        autoStartStep: true,
      }),
    });
    expect(
      await tryDispatchCapabilityCatalog(deps, 'when is my next item', {
        queryId: 'assistant.next_item',
      })
    ).toBe(true);
    expect(deps.assistant.some((t) => /Opening/.test(t))).toBe(true);
    expect(deps.executed).toContain('create_record');
  });

  it('resolves trusted semantic queryId without catalog alias match', async () => {
    const resolveQuery = vi.fn(async () => ({ text: 'Semantic paraphrase answer.' }));
    const deps = makeDeps({ resolveQuery });
    expect(
      await tryDispatchCapabilityCatalog(deps, 'totally unrelated paraphrase', {
        queryId: 'assistant.next_item',
        trustedQueryId: true,
      })
    ).toBe(true);
    expect(resolveQuery).toHaveBeenCalledOnce();
  });

  it('rejects forced query/tour/search ids when utterance aliases miss', async () => {
    const resolveQuery = vi.fn(async () => ({ text: 'Should not run.' }));
    const runTour = vi.fn(async () => ({ text: 'Should not run.' }));
    const openSearchHit = vi.fn(async () => ({ text: 'Should not run.' }));
    const deps = makeDeps({ resolveQuery, runTour, openSearchHit });
    expect(
      await tryDispatchCapabilityCatalog(deps, 'generate the brackets', {
        queryId: 'assistant.next_item',
      })
    ).toBe(false);
    expect(
      await tryDispatchCapabilityCatalog(deps, 'generate the brackets', {
        tourId: 'tour_onboard',
      })
    ).toBe(false);
    expect(
      await tryDispatchCapabilityCatalog(deps, 'generate the brackets', {
        searchId: 'search_workspaces',
      })
    ).toBe(false);
    expect(resolveQuery).not.toHaveBeenCalled();
    expect(runTour).not.toHaveBeenCalled();
    expect(openSearchHit).not.toHaveBeenCalled();
  });

  it('falls through to tour when mutation preview returns null', async () => {
    const previewMutation = vi.fn(async () => null);
    const runTour = vi.fn(async () => ({ text: 'Tour started.' }));
    const overlapPack = loadPackFromJson({
      manifest: { id: 'cap-mut-tour' },
      flow: pack.steps,
      controls: [],
      intents: { aliases: {}, meta: [] },
      binders: {},
      mutations: [
        {
          id: 'crm.prefill_low',
          title: 'Prefill create',
          aliases: ['prefill create form'],
          risk: 'low',
          stepId: 'create_record',
        },
      ],
      tours: [
        {
          id: 'tour_onboard',
          title: 'Onboard tour',
          aliases: ['prefill create form'],
          steps: ['create_record'],
          lines: ['Welcome aboard.'],
        },
      ],
    });
    const deps = makeDeps({ pack: overlapPack, previewMutation, runTour });
    expect(await tryDispatchCapabilityCatalog(deps, 'prefill create form')).toBe(true);
    expect(previewMutation).toHaveBeenCalledOnce();
    expect(runTour).toHaveBeenCalledOnce();
  });

  it('falls through to mutation when query alias hits but resolve is empty', async () => {
    const overlapPack = loadPackFromJson({
      manifest: { id: 'cap-overlap' },
      flow: pack.steps,
      controls: [],
      intents: { aliases: {}, meta: [] },
      binders: {},
      queries: [
        {
          id: 'desk.status',
          title: 'Status',
          aliases: ['prefill create form'],
        },
      ],
      mutations: [
        {
          id: 'crm.prefill_low',
          title: 'Prefill create',
          aliases: ['prefill create form'],
          risk: 'low',
          stepId: 'create_record',
        },
      ],
    });
    const previewMutation = vi.fn(async () => ({
      text: 'Prefill ready.',
      needsConfirm: false,
      stepId: 'create_record',
    }));
    const resolveQuery = vi.fn(async () => ({ text: '' }));
    const deps = makeDeps({ pack: overlapPack, previewMutation, resolveQuery });
    const handled = await tryDispatchCapabilityCatalog(deps, 'prefill create form');
    expect(handled).toBe(true);
    expect(resolveQuery).toHaveBeenCalledOnce();
    expect(previewMutation).toHaveBeenCalledOnce();
  });

  it('falls through to co-passed mutationId when forced queryId aliases miss', async () => {
    const previewMutation = vi.fn(async () => ({
      text: 'Prefill ready.',
      needsConfirm: false,
      stepId: 'create_record',
    }));
    const resolveQuery = vi.fn(async () => ({ text: 'Should not run.' }));
    const deps = makeDeps({ previewMutation, resolveQuery });
    const handled = await tryDispatchCapabilityCatalog(
      deps,
      'prefill create form',
      {
        queryId: 'assistant.next_item',
        mutationId: 'crm.prefill_low',
      }
    );
    expect(handled).toBe(true);
    expect(resolveQuery).not.toHaveBeenCalled();
    expect(previewMutation).toHaveBeenCalledOnce();
  });

  it('ignores forced mutationId when utterance aliases do not match', async () => {
    const previewMutation = vi.fn(async () => ({
      text: 'Should not run.',
      needsConfirm: false,
      stepId: 'create_record',
    }));
    const deps = makeDeps({ previewMutation });
    // Laya proposed create/prefill mutation for an unrelated ask.
    const handled = await tryDispatchCapabilityCatalog(
      deps,
      'generate the brackets',
      { mutationId: 'crm.prefill_low' }
    );
    expect(handled).toBe(false);
    expect(previewMutation).not.toHaveBeenCalled();
    expect(deps.executed).toHaveLength(0);
  });

  it('does not fuzzy another mutation when forced mutationId aliases miss', async () => {
    const previewMutation = vi.fn(async ({ mutationId }: { mutationId: string }) => ({
      text: `Ran ${mutationId}`,
      needsConfirm: false,
      stepId: 'create_record',
    }));
    const deps = makeDeps({ previewMutation });
    // Forced prefill, but utterance matches assign badge — must not run assign.
    const handled = await tryDispatchCapabilityCatalog(deps, 'Assign badge', {
      mutationId: 'crm.prefill_low',
    });
    expect(handled).toBe(false);
    expect(previewMutation).not.toHaveBeenCalled();
  });

  it('honors forced mutationId when utterance aliases match', async () => {
    const previewMutation = vi.fn(async () => ({
      text: 'Prefill ready.',
      needsConfirm: false,
      stepId: 'create_record',
    }));
    const deps = makeDeps({ previewMutation });
    const handled = await tryDispatchCapabilityCatalog(
      deps,
      'prefill create form',
      { mutationId: 'crm.prefill_low' }
    );
    expect(handled).toBe(true);
    expect(previewMutation).toHaveBeenCalled();
  });

  it('forced mutationId still matches when another mutation wins global catalog', async () => {
    // Normalizer strips leading "please" so matchText = "create form", which hits
    // crm.steal first globally — forced check must still use the forced entry only.
    const stealPack = loadPackFromJson({
      manifest: { id: 'cap-steal' },
      flow: [
        {
          id: 'create_record',
          title: 'Create record',
          keywords: ['create record'],
          kind: 'hard',
          requires: [],
        },
      ],
      controls: [],
      intents: { aliases: {}, meta: [] },
      binders: {},
      normalize: { leadingPoliteness: ['please'] },
      mutations: [
        {
          id: 'crm.steal',
          title: 'Steal',
          aliases: ['create form'],
          risk: 'low',
          stepId: 'create_record',
        },
        {
          id: 'crm.prefill_low',
          title: 'Prefill create',
          aliases: ['please create form'],
          risk: 'low',
          stepId: 'create_record',
        },
      ],
    });
    const previewMutation = vi.fn(async ({ mutationId }: { mutationId: string }) => ({
      text: `Ran ${mutationId}`,
      needsConfirm: false,
      stepId: 'create_record',
    }));
    const deps = makeDeps({
      pack: stealPack,
      previewMutation,
    });
    const handled = await tryDispatchCapabilityCatalog(
      deps,
      'please create form',
      { mutationId: 'crm.prefill_low' }
    );
    expect(handled).toBe(true);
    expect(previewMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationId: 'crm.prefill_low' })
    );
  });

  it('dispatchParsed drops bundled stepId when forced mutationId aliases miss', async () => {
    const previewMutation = vi.fn(async () => ({
      text: 'Should not run.',
      needsConfirm: false,
      stepId: 'create_record',
    }));
    const deps = makeDeps({
      text: 'generate the brackets',
      previewMutation,
    });
    const intentPack: IntentParsePack = {
      steps: pack.steps,
      aliases: pack.aliases,
      faq: pack.faq,
      compiledHeuristics: pack.compiledHeuristics,
    };
    await dispatchParsed(deps, intentPack, {
      stepId: 'create_record',
      candidates: ['create_record'],
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'mutation',
      mutationId: 'crm.prefill_low',
      confidence: 'high',
    });
    expect(previewMutation).not.toHaveBeenCalled();
    expect(deps.executed).toHaveLength(0);
  });

  it('dispatchParsed keeps stepId on rawIntent-only catalog miss', async () => {
    const deps = makeDeps({ text: 'open create record please' });
    const intentPack: IntentParsePack = {
      steps: pack.steps,
      aliases: pack.aliases,
      faq: pack.faq,
      compiledHeuristics: pack.compiledHeuristics,
    };
    // No forced catalog id — only rawIntent mutation. Catalog miss must not drop stepId.
    await dispatchParsed(deps, intentPack, {
      stepId: 'create_record',
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'mutation',
      confidence: 'high',
    });
    expect(deps.executed).toContain('create_record');
  });

  it('dispatchParsed fuzzy-matches pack mutation after forced mutationId reject', async () => {
    const previewMutation = vi.fn(async ({ mutationId }: { mutationId: string }) => ({
      text: `Ran ${mutationId}`,
      needsConfirm: false,
      stepId: 'create_record',
    }));
    const deps = makeDeps({
      text: 'Assign badge',
      previewMutation,
    });
    const intentPack: IntentParsePack = {
      steps: pack.steps,
      aliases: pack.aliases,
      faq: pack.faq,
      compiledHeuristics: pack.compiledHeuristics,
    };
    // Forced wrong id fails; fuzzy should still run assign_badge from aliases.
    await dispatchParsed(deps, intentPack, {
      stepId: null,
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: 'mutation',
      mutationId: 'crm.prefill_low',
      confidence: 'high',
    });
    expect(previewMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationId: 'crm.assign_badge_confirm' })
    );
  });
});
