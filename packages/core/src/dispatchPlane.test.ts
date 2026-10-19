import { describe, expect, it } from 'vitest';
import { loadPackFromJson } from './loadPack.js';
import { emptySession } from './slots.js';
import type { FlowStepDef } from './types.js';
import {
  applyLaneMaskToParsed,
  resolveDispatchPlane,
} from './dispatchPlane.js';
import { normalizeRoutingTree } from './routingTree.js';

const flow: FlowStepDef[] = [
  {
    id: 'create_list',
    title: 'Create list',
    keywords: ['create list'],
    kind: 'hard',
    requires: [],
  },
];

function demoPack(tree?: Record<string, unknown>) {
  return loadPackFromJson({
    manifest: { id: 'demo-tree' },
    flow,
    controls: [{ id: 'nav-create', stepId: 'create_list', path: '/lists/new' }],
    intents: {
      aliases: { create_list: ['make a list'] },
      meta: ['go_back', 'whats_next'],
    },
    binders: { create_list: { path: 'data.listCount', op: 'gte', value: 1 } },
    routingTree: tree as never,
  });
}

describe('dispatchPlane + routingTree', () => {
  it('normalizeRoutingTree promotes remap.plane → laneMask', () => {
    const n = normalizeRoutingTree({
      enabled: true,
      remap: {
        plane: {
          ask: ['faq', 'query'],
          guide: ['faq', 'goto'],
          do: ['faq', 'mutation'],
        },
      },
    });
    expect(n?.laneMask?.ask).toEqual(['faq', 'query']);
    expect(n?.laneMask?.guide).toContain('goto');
  });

  it('resolveDispatchPlane: confident do overrides chrome ask', () => {
    const pack = demoPack({ enabled: true, planeSoftBiasBelow: 0.55 });
    const session = {
      ...emptySession(),
      flags: { interactionMode: 'ask' },
    };
    const ctx = resolveDispatchPlane({
      session,
      features: { routingTree: true },
      pack,
      text: 'Create a new list named groceries',
      parsed: {
        stepId: 'create_list',
        slotPatches: {},
        isCorrection: false,
        goBack: false,
        rawIntent: 'goto:create_list',
        plane: 'do',
        planeProbability: 0.9,
        lane: 'goto',
      },
    });
    expect(ctx.treeEnabled).toBe(true);
    expect(ctx.plane).toBe('do');
    expect(ctx.blockMutate).toBe(false);
  });

  it('applyLaneMaskToParsed strips goto under ask plane', () => {
    const pack = demoPack({ enabled: true });
    const masked = applyLaneMaskToParsed(
      {
        stepId: 'create_list',
        slotPatches: {},
        isCorrection: false,
        goBack: false,
        rawIntent: 'goto:create_list',
        lane: 'goto',
        confidence: 'high',
      },
      'ask',
      pack
    );
    expect(masked.stepId).toBeNull();
    expect(masked.rawIntent).toBe('unknown');
    expect(masked.lane).toBe('disambiguation');
  });

  it('applyLaneMaskToParsed keeps faq under ask', () => {
    const pack = demoPack({ enabled: true });
    const masked = applyLaneMaskToParsed(
      {
        stepId: null,
        slotPatches: {},
        isCorrection: false,
        goBack: false,
        rawIntent: 'faq',
        faqId: 'how-lists',
        lane: 'faq',
        confidence: 'high',
      },
      'ask',
      pack
    );
    expect(masked.faqId).toBe('how-lists');
    expect(masked.lane).toBe('faq');
  });

  it('applyLaneMaskToParsed scrubs goto heads even when lane says faq', () => {
    const pack = demoPack({ enabled: true });
    const masked = applyLaneMaskToParsed(
      {
        stepId: 'create_list',
        slotPatches: {},
        isCorrection: false,
        goBack: false,
        rawIntent: 'faq',
        faqId: 'how-lists',
        lane: 'faq',
        confidence: 'high',
      },
      'ask',
      pack
    );
    expect(masked.stepId).toBeNull();
    expect(masked.faqId).toBe('how-lists');
    expect(masked.lane).toBe('faq');
  });
});
