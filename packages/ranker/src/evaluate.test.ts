import { describe, expect, it } from 'vitest';
import type { ScenarioCase } from '@uipilot/core';
import {
  examplesFromCorpus,
  evaluateRankerSoftScore,
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
];

const aliases = {
  create_list: ['create list', 'new list'],
  add_item: ['add item', 'add todo'],
  complete_item: ['complete item', 'mark done'],
};

describe('evaluateRankerSoftScore', () => {
  it('reports hit rate above soft floor on toy corpus', () => {
    const model = trainRanker(examplesFromCorpus(corpus, aliases), {
      dim: 64,
      epochs: 80,
      seed: 7,
    });
    const result = evaluateRankerSoftScore(model, corpus, {
      minHitRate: 0.75,
      minProbability: 0.25,
    });
    expect(result.total).toBe(corpus.length);
    expect(result.hitRate).toBeGreaterThanOrEqual(0.75);
    expect(result.ok).toBe(true);
  });
});
