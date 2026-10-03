import { describe, expect, it } from 'vitest';
import type { IntentParsePack } from '@notlm/core';
import {
  createJsonHybridParser,
  inferDecision,
  inferRankerJson,
  labelsForStepShortlist,
  subsetIntentDistribution,
  type RankerModelJson,
} from './index.js';

function toyModel(): RankerModelJson {
  const dim = 8;
  return {
    version: 1,
    dim,
    ngrams: [1],
    intentLabels: [
      'goto:create_list',
      'goto:add_item',
      'faq',
      'unknown',
      'go_back',
      'whats_next',
    ],
    // Bias: create_list >> add_item >> rest
    intentW: new Array(6 * dim).fill(0),
    intentB: [5, 2, 0, 0, 0, 0],
    slotLabels: [],
    slotW: [],
    slotB: [],
    trainedAt: 'test',
    exampleCount: 0,
  };
}

const pack: IntentParsePack = {
  steps: [
    { id: 'create_list', title: 'Create', keywords: [], kind: 'hard', requires: [] },
    { id: 'add_item', title: 'Add', keywords: [], kind: 'hard', requires: [] },
  ],
  aliases: {},
  meta: ['go_back', 'whats_next'],
  faq: [
    {
      id: 'how_list',
      aliases: ['how do i create a list'],
      text: 'Use Create list.',
      stepId: 'create_list',
    },
  ],
};

describe('shortlist softmax', () => {
  it('renormalizes over requested labels', () => {
    const full = inferRankerJson(toyModel(), 'x');
    const short = inferRankerJson(toyModel(), 'x', {
      labels: ['goto:add_item', 'unknown'],
    });
    expect(short.intents.every((i) => ['goto:add_item', 'unknown'].includes(i.label))).toBe(
      true
    );
    const sum = short.intents.reduce((a, b) => a + b.probability, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(short.intent.label).toBe('goto:add_item');
    expect(full.intent.label).toBe('goto:create_list');
  });

  it('labelsForStepShortlist keeps meta and filters gotos', () => {
    const labels = labelsForStepShortlist(toyModel().intentLabels, ['add_item']);
    expect(labels).toContain('goto:add_item');
    expect(labels).not.toContain('goto:create_list');
    expect(labels).toContain('unknown');
    expect(labels).toContain('faq');
  });

  it('subsetIntentDistribution is identity without labels', () => {
    const intents = [
      { label: 'a', score: 1, probability: 0.7 },
      { label: 'b', score: 0, probability: 0.3 },
    ];
    expect(subsetIntentDistribution(intents)[0]?.label).toBe('a');
  });
});

describe('inferDecision heads', () => {
  it('buckets stepDist and isOod from flat softmax', () => {
    const d = inferDecision(toyModel(), 'create something', pack);
    expect(d.stepDist[0]?.stepId).toBe('create_list');
    expect(d.topProbability).toBeGreaterThan(0.5);
    expect(d.isOod).toBeGreaterThanOrEqual(0);
    expect(d.isQuestion).toBeGreaterThanOrEqual(0);
  });

  it('surfaces faqDist for question-shaped FAQ aliases', () => {
    const d = inferDecision(toyModel(), 'how do i create a list?', pack, {
      shortlistStepIds: ['create_list'],
    });
    expect(d.isQuestion).toBeGreaterThan(0.5);
    expect(d.faqDist.some((f) => f.faqId === 'how_list')).toBe(true);
  });
});

describe('hybrid bands', () => {
  it('sets confidence and probability from calibrated bands', async () => {
    const parse = createJsonHybridParser(toyModel(), { minProbability: 0.45 });
    const result = await parse('make a list', pack, {
      shortlistStepIds: ['create_list', 'add_item'],
    });
    expect(result.stepId).toBe('create_list');
    expect(result.probability).toBeGreaterThan(0.5);
    expect(result.confidence).toBeTruthy();
    expect(result.decision?.stepDist.length).toBeGreaterThan(0);
  });

  it('falls back to rules on OOD / low p', async () => {
    const weak: RankerModelJson = {
      ...toyModel(),
      intentB: [0, 0, 0, 5, 0, 0], // unknown wins
    };
    const parse = createJsonHybridParser(weak, { minProbability: 0.45 });
    const result = await parse('completely unrelated trivia', pack);
    // Rules won't know it either → unknown / null step
    expect(result.stepId).toBeNull();
  });

  it('prefers short go_back rules over ranker', async () => {
    const parse = createJsonHybridParser(toyModel());
    const result = await parse('go back', pack);
    expect(result.goBack).toBe(true);
    expect(result.rawIntent).toBe('go_back');
  });
});
