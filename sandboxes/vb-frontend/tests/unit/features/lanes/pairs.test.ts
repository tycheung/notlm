import { describe, expect, it } from 'vitest';
import {
  allCenterPairs,
  lanesFromPairs,
  pairsFromLanes,
  pairsToExpression,
  parsePairsFromExpression,
  togglePair,
} from '@/features/lanes/pairs';

describe('lane pairs helpers', () => {
  it('rejects lone lanes', () => {
    expect(() => pairsFromLanes([1, 2, 3])).toThrow(/Lone lane/);
  });

  it('supports gapped complete pairs and compact expression', () => {
    const pairs = pairsFromLanes([1, 2, 3, 4, 9, 10]);
    expect(pairs).toEqual([
      [1, 2],
      [3, 4],
      [9, 10],
    ]);
    expect(pairsToExpression(pairs)).toBe('1-4, 9-10');
    expect(lanesFromPairs(pairs)).toEqual([1, 2, 3, 4, 9, 10]);
  });

  it('toggles pairs and builds center pair list', () => {
    expect(allCenterPairs(8)).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ]);
    expect(togglePair([[1, 2]], [3, 4])).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(togglePair(
      [
        [1, 2],
        [3, 4],
      ],
      [1, 2]
    )).toEqual([[3, 4]]);
  });

  it('parses range expressions into pairs', () => {
    expect(parsePairsFromExpression('1-4, 9-10')).toEqual([
      [1, 2],
      [3, 4],
      [9, 10],
    ]);
  });
});
