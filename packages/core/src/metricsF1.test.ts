import { describe, expect, it } from 'vitest';
import {
  addConfusion,
  confusionForBinary,
  confusionForLabelMatch,
  emptyConfusion,
  f1FromConfusion,
} from './metricsF1.js';

describe('metricsF1', () => {
  it('computes perfect F1', () => {
    const c = addConfusion(emptyConfusion(), { tp: 10, fp: 0, fn: 0, tn: 2 });
    const s = f1FromConfusion(c);
    expect(s.precision).toBe(1);
    expect(s.recall).toBe(1);
    expect(s.f1).toBe(1);
  });

  it('handles false positives and negatives', () => {
    // 2 TP, 1 FP, 1 FN → P=2/3 R=2/3 F1=2/3
    const c = { tp: 2, fp: 1, fn: 1, tn: 0 };
    const s = f1FromConfusion(c);
    expect(s.precision).toBeCloseTo(2 / 3, 5);
    expect(s.recall).toBeCloseTo(2 / 3, 5);
    expect(s.f1).toBeCloseTo(2 / 3, 5);
  });

  it('maps binary and label-match cells', () => {
    expect(confusionForBinary(true, true).tp).toBe(1);
    expect(confusionForBinary(false, true).fp).toBe(1);
    expect(confusionForBinary(true, false).fn).toBe(1);
    expect(confusionForBinary(false, false).tn).toBe(1);

    expect(confusionForLabelMatch('a', 'a').tp).toBe(1);
    expect(confusionForLabelMatch('a', 'b')).toEqual({
      tp: 0,
      fp: 1,
      fn: 1,
      tn: 0,
    });
    expect(confusionForLabelMatch(null, 'a').fp).toBe(1);
    expect(confusionForLabelMatch('a', null).fn).toBe(1);
    expect(confusionForLabelMatch(null, null).tn).toBe(1);
  });
});
