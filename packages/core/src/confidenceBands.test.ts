import { describe, expect, it } from 'vitest';
import {
  CONFIDENCE_HIGH_MIN,
  CONFIDENCE_MID_MIN,
  probabilityToConfidence,
  ruleScoreToProbability,
} from './confidenceBands.js';

describe('confidenceBands', () => {
  it('maps probability thresholds to high/mid/low', () => {
    expect(probabilityToConfidence(CONFIDENCE_HIGH_MIN)).toBe('high');
    expect(probabilityToConfidence(0.99)).toBe('high');
    expect(probabilityToConfidence(CONFIDENCE_MID_MIN)).toBe('mid');
    expect(probabilityToConfidence(0.7)).toBe('mid');
    expect(probabilityToConfidence(CONFIDENCE_MID_MIN - 0.01)).toBe('low');
    expect(probabilityToConfidence(0)).toBe('low');
    expect(probabilityToConfidence(Number.NaN)).toBe('low');
  });

  it('approximates rule scores as probabilities', () => {
    expect(ruleScoreToProbability(500)).toBe(1);
    expect(ruleScoreToProbability(250)).toBe(0.5);
    expect(ruleScoreToProbability(1000)).toBe(1);
    expect(ruleScoreToProbability(0)).toBe(0);
  });
});
