import { describe, expect, it } from 'vitest';
import { loadPackFromJson, wrapPack } from './loadPack.js';
import { evaluateFlowStatuses } from './flowStatus.js';
import { isStepVisible } from './visibility.js';
import { enterSubgraph, activeFlowSteps, exitSubgraph } from './subgraph.js';
import { runDraftCompiler } from './draftCompiler.js';
import { emptySession } from './slots.js';
import type { DraftCompiler, FlowStepDef } from './types.js';

const flow: FlowStepDef[] = [
  {
    id: 'create_list',
    title: 'Create list',
    keywords: ['create list'],
    kind: 'hard',
    requires: [],
  },
  {
    id: 'secret',
    title: 'Secret',
    keywords: ['secret'],
    kind: 'soft',
    requires: [],
    hideWhen: ['hideSecret'],
  },
  {
    id: 'plan_a',
    title: 'Plan A only',
    keywords: ['plan a'],
    kind: 'soft',
    requires: [],
    showWhen: [{ path: 'data.planAMode', op: 'truthy' }],
  },
  {
    id: 'apply_format',
    title: 'Format',
    keywords: ['format'],
    kind: 'hard',
    requires: ['create_list'],
    subgraph: 'event_format',
  },
];

function basePack() {
  return loadPackFromJson({
    manifest: { id: 'lab' },
    flow,
    controls: [
      {
        id: 'c1',
        stepId: 'create_list',
        path: '/lists',
        compilerId: 'list_compiler',
        draftKey: 'list',
      },
      { id: 'c2', stepId: 'apply_format', path: '/format' },
    ],
    intents: { aliases: { create_list: ['make a list'], apply_format: ['format'] } },
    binders: {
      create_list: { path: 'data.listCount', op: 'gte', value: 1 },
    },
    subgraphs: {
      event_format: [
        {
          id: 'add_stage',
          title: 'Add stage',
          keywords: ['stage'],
          kind: 'hard',
          requires: [],
        },
        {
          id: 'save_format',
          title: 'Save format',
          keywords: ['save'],
          kind: 'hard',
          requires: ['add_stage'],
        },
      ],
    },
  });
}

describe('visibility + wrapPack', () => {
  it('hides via string hideWhen and binder showWhen', () => {
    expect(
      isStepVisible(flow[1]!, { pathname: '/', data: { hideSecret: true } })
    ).toBe(false);
    expect(
      isStepVisible(flow[2]!, { pathname: '/', data: { planAMode: false } })
    ).toBe(false);
    expect(
      isStepVisible(flow[2]!, { pathname: '/', data: { planAMode: true } })
    ).toBe(true);
  });

  it('evaluateFlowStatuses honors showWhen', () => {
    const pack = basePack();
    const hidden = evaluateFlowStatuses(pack, { pathname: '/', data: {} });
    expect(hidden.find((s) => s.id === 'plan_a')).toBeUndefined();
    const shown = evaluateFlowStatuses(pack, {
      pathname: '/',
      data: { planAMode: true },
    });
    expect(shown.find((s) => s.id === 'plan_a')).toBeTruthy();
  });

  it('wrapPack overlays resolveNav', () => {
    const pack = wrapPack(basePack(), {
      resolveNav: (stepId, ctx, base) => {
        if (stepId === 'create_list') {
          return { path: '/overridden', openSurface: 'drawer' };
        }
        return base(stepId, ctx);
      },
      unavailableReason: (stepId) =>
        stepId === 'apply_format' ? 'Need event' : null,
    });
    expect(pack.resolveNav('create_list', { pathname: '/', data: {} })).toMatchObject({
      path: '/overridden',
      openSurface: 'drawer',
    });
    expect(pack.unavailableReason?.('apply_format', { pathname: '/', data: {} })).toBe(
      'Need event'
    );
  });
});

describe('subgraph', () => {
  it('scopes active flow steps when entered', () => {
    const pack = basePack();
    let session = emptySession();
    session = enterSubgraph(session, 'apply_format', 'event_format');
    expect(session.activeSubgraphId).toBe('event_format');
    expect(activeFlowSteps(pack, session).map((s) => s.id)).toEqual([
      'add_stage',
      'save_format',
    ]);
    session = exitSubgraph(session);
    expect(session.activeSubgraphId).toBeNull();
    expect(activeFlowSteps(pack, session).map((s) => s.id)).toContain('create_list');
  });
});

describe('draftCompiler', () => {
  it('compiles and reports missing fields', () => {
    const compiler: DraftCompiler = {
      id: 'list_compiler',
      match: (t) => /\blist\b/i.test(t),
      compile: (text) => ({
        draft: { name: text.includes('Shopping') ? 'Shopping' : '' },
        summary: 'Updated list draft.',
        finishRequested: text.includes('save'),
      }),
      listMissing: (draft) =>
        draft.name ? [] : [{ key: 'name', label: 'list name' }],
    };
    const run = runDraftCompiler({
      text: 'make a list',
      stepId: 'create_list',
      compilerId: 'list_compiler',
      draftKey: 'list',
      compilers: { list_compiler: compiler },
      session: emptySession(),
    });
    expect(run.handled).toBe(true);
    expect(run.missing?.[0]?.key).toBe('name');
  });
});
