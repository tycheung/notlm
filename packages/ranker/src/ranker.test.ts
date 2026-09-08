import { describe, expect, it } from 'vitest';
import type { IntentParsePack, ScenarioCase } from '@uipilot/core';
import {
  createJsonHybridParser,
  examplesFromCorpus,
  exportIntentOnnx,
  extractHeuristicSlots,
  featurizeUtterance,
  inferRankerJson,
  isOnnxRankerEnabled,
  trainRanker,
} from './index.js';

const corpus: ScenarioCase[] = [
  { utterance: 'create a list', expect: { stepId: 'create_list' } },
  { utterance: 'make a new list', expect: { stepId: 'create_list' } },
  { utterance: 'add an item', expect: { stepId: 'add_item' } },
  { utterance: 'add a todo', expect: { stepId: 'add_item' } },
  { utterance: 'mark it done', expect: { stepId: 'complete_item' } },
  { utterance: 'complete item', expect: { stepId: 'complete_item' } },
  { utterance: "what's next", expect: { rawIntent: 'whats_next' } },
  { utterance: 'go back', expect: { goBack: true } },
  { utterance: "what's the weather", expect: { stepId: null } },
  {
    utterance: 'rename to name: Shopping',
    expect: { stepId: 'create_list', slots: { name: 'Shopping' } } as ScenarioCase['expect'],
  },
];

const pack: IntentParsePack = {
  steps: [
    {
      id: 'create_list',
      title: 'Create list',
      keywords: ['list'],
      kind: 'hard',
      requires: [],
    },
    {
      id: 'add_item',
      title: 'Add item',
      keywords: ['item'],
      kind: 'hard',
      requires: ['create_list'],
    },
    {
      id: 'complete_item',
      title: 'Complete item',
      keywords: ['done'],
      kind: 'hard',
      requires: ['add_item'],
    },
  ],
  aliases: {
    create_list: ['create list', 'new list'],
    add_item: ['add item', 'add todo'],
    complete_item: ['complete item', 'mark done'],
  },
  meta: ['whats_next', 'go_back'],
};

describe('ranker train + infer', () => {
  it('trains from corpus and ranks intents', () => {
    const examples = examplesFromCorpus(corpus, pack.aliases);
    const model = trainRanker(examples, { dim: 64, epochs: 60, seed: 7 });
    expect(model.intentLabels.length).toBeGreaterThan(2);
    const hit = inferRankerJson(model, 'make a new list');
    expect(hit.backend).toBe('json');
    expect(hit.intent.label).toBe('goto:create_list');
    expect(hit.intent.probability).toBeGreaterThan(0.3);
  });

  it('hybrid parser uses ranker when confident', async () => {
    const model = trainRanker(examplesFromCorpus(corpus, pack.aliases), {
      dim: 64,
      epochs: 60,
      seed: 7,
    });
    const parse = createJsonHybridParser(model, { minProbability: 0.25 });
    const result = await parse('add a todo', pack);
    expect(result.stepId).toBe('add_item');
  });

  it('exports onnx bytes and feature-flag defaults off', () => {
    const model = trainRanker(examplesFromCorpus(corpus), { dim: 32, epochs: 5, seed: 1 });
    const bytes = exportIntentOnnx(model);
    expect(bytes.byteLength).toBeGreaterThan(64);
    expect(isOnnxRankerEnabled({}, {})).toBe(false);
    expect(isOnnxRankerEnabled({ onnxRanker: true }, {})).toBe(true);
    expect(isOnnxRankerEnabled({}, { UIPILOT_ONNX_RANKER: '1' })).toBe(true);
  });

  it('featurize is deterministic and extracts heuristic slots', () => {
    const a = featurizeUtterance('hello world', 32);
    const b = featurizeUtterance('hello world', 32);
    expect([...a]).toEqual([...b]);
    expect(extractHeuristicSlots('set name: Milk please').name).toBe('Milk');
  });
});
