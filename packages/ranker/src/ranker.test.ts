import { describe, expect, it } from 'vitest';
import type { RankerModelJson } from './types.js';
import {
  extractHeuristicSlots,
  featurizeUtterance,
  inferRankerJson,
  isOnnxRankerEnabled,
} from './index.js';

/** Tiny fixed model — bias picks goto:create_list without training. */
function toyModel(): RankerModelJson {
  const dim = 8;
  return {
    version: 1,
    dim,
    ngrams: [1],
    intentLabels: ['goto:create_list', 'unknown'],
    intentW: new Array(2 * dim).fill(0),
    intentB: [5, 0],
    slotLabels: [],
    slotW: [],
    slotB: [],
    trainedAt: 'test',
    exampleCount: 0,
  };
}

describe('ranker infer (operating)', () => {
  it('inferRankerJson returns json backend and biased intent', () => {
    const hit = inferRankerJson(toyModel(), 'anything');
    expect(hit.backend).toBe('json');
    expect(hit.intent.label).toBe('goto:create_list');
    expect(hit.intent.probability).toBeGreaterThan(0.5);
  });

  it('feature-flag defaults off', () => {
    expect(isOnnxRankerEnabled({}, {})).toBe(false);
    expect(isOnnxRankerEnabled({ onnxRanker: true }, {})).toBe(true);
    expect(isOnnxRankerEnabled({}, { NOTLM_ONNX_RANKER: '1' })).toBe(true);
  });

  it('featurize is deterministic and extracts heuristic slots', () => {
    const a = featurizeUtterance('hello world', 32);
    const b = featurizeUtterance('hello world', 32);
    expect([...a]).toEqual([...b]);
    expect(extractHeuristicSlots('set name: Milk please').name).toBe('Milk');
  });
});
