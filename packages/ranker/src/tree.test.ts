import { describe, expect, it } from 'vitest';
import { parseUtterance } from '@notlm/core';
import {
  createTreeUtteranceParser,
  pickLeafModel,
  leafModelsFromPackLeaves,
} from './tree.js';
import type { RankerModelJson } from './types.js';

function stubModel(labels: string[]): RankerModelJson {
  const C = labels.length;
  const dim = 8;
  return {
    version: 1,
    dim,
    ngrams: [2, 3],
    intentLabels: labels,
    slotLabels: [],
    intentW: Array(C * dim).fill(0.01),
    intentB: Array(C).fill(0),
    slotW: [],
    slotB: [],
    trainedAt: 'test',
    exampleCount: labels.length,
  };
}

describe('tree leaf helpers', () => {
  it('pickLeafModel selects an autosplit child when both exist', () => {
    const a = stubModel(['goto:create_event']);
    const b = stubModel(['goto:side_actions']);
    const parent = stubModel(['goto:create_event', 'goto:side_actions']);
    const picked = pickLeafModel(
      'goto',
      { goto: parent, goto__a: a, goto__b: b },
      'open the checklist'
    );
    expect(picked === a || picked === b).toBe(true);
  });

  it('pickLeafModel falls back to parent leaf', () => {
    const parent = stubModel(['goto:x']);
    expect(pickLeafModel('goto', { goto: parent }, 'open x')).toBe(parent);
  });

  it('leafModelsFromPackLeaves maps stems', () => {
    const model = stubModel(['goto:x']);
    const map = leafModelsFromPackLeaves(
      { goto: 'ranker.leaves.goto', goto__a: 'ranker.leaves.goto__a' },
      {
        'ranker.leaves.goto': model,
        'ranker.leaves.goto__a': model,
      }
    );
    expect(map.goto).toBe(model);
    expect(map.goto__a).toBe(model);
  });
});

describe('createTreeUtteranceParser', () => {
  const pack = {
    steps: [
      {
        id: 'create_list',
        title: 'Create list',
        keywords: ['create list'],
        kind: 'hard' as const,
        requires: [],
      },
    ],
    aliases: { create_list: ['make a list'] },
    meta: [] as string[],
    routingTree: { enabled: true, planeSoftBiasBelow: 0.55 },
  };

  it('annotates ask plane on how-to utterances', async () => {
    const parse = createTreeUtteranceParser(parseUtterance);
    const r = await parse('how do I create a list?', pack);
    expect(r.plane).toBe('ask');
    expect(r.planeProbability).toBeGreaterThan(0.5);
  });

  it('annotates do plane on create commands', async () => {
    const parse = createTreeUtteranceParser(parseUtterance);
    const r = await parse('create a new list named groceries', pack);
    expect(r.plane).toBe('do');
  });
});
