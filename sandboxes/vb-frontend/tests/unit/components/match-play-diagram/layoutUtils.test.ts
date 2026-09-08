import { describe, expect, it } from 'vitest';
import {
  computeNextRoundTops,
  matchCenterFromTop,
  matchTop,
} from '@/components/match-play-diagram/shared/layoutUtils';
import { MATCH_BLOCK_HEIGHT } from '@/components/match-play-diagram/shared/constants';
import { roundHeader } from '@/components/match-play-diagram/adapters/helpers';

function columnTops(fieldSize: number): number[][] {
  const opening = fieldSize / 2;
  const columns: number[][] = [
    Array.from({ length: opening }, (_, i) => matchTop(i)),
  ];
  while (columns[columns.length - 1].length > 1) {
    columns.push(computeNextRoundTops(columns[columns.length - 1]));
  }
  return columns;
}

describe('bracket diagram layout', () => {
  it.each([4, 8, 16, 32, 64] as const)(
    'centers later rounds for a %s-team single-elim field',
    (field) => {
      const columns = columnTops(field);
      expect(columns).toHaveLength(Math.log2(field));
      expect(columns[0]).toHaveLength(field / 2);
      expect(columns[columns.length - 1]).toHaveLength(1);

      const firstCenters = columns[0].map(matchCenterFromTop);
      const expectedFinal =
        (firstCenters[0] + firstCenters[firstCenters.length - 1]) / 2 -
        MATCH_BLOCK_HEIGHT / 2;
      expect(columns[columns.length - 1][0]).toBeCloseTo(expectedFinal, 5);
      expect(columns[columns.length - 1][0]).not.toBe(matchTop(0));

      const quarter = columns[1][0];
      const expectedQuarter =
        (matchCenterFromTop(columns[0][0]) + matchCenterFromTop(columns[0][1])) / 2 -
        MATCH_BLOCK_HEIGHT / 2;
      expect(quarter).toBeCloseTo(expectedQuarter, 5);
    }
  );
});

describe('roundHeader', () => {
  it('labels 4/8/16/32/64 traditional round names', () => {
    expect(roundHeader(0, 2)).toBe('Semifinals');
    expect(roundHeader(1, 2)).toBe('Final');

    expect(roundHeader(0, 3)).toBe('Quarterfinals');
    expect(roundHeader(1, 3)).toBe('Semifinals');
    expect(roundHeader(2, 3)).toBe('Final');

    expect(roundHeader(0, 4)).toBe('Round of 16');
    expect(roundHeader(1, 4)).toBe('Quarterfinals');

    expect(roundHeader(0, 5)).toBe('Round of 32');
    expect(roundHeader(0, 6)).toBe('Round of 64');
    expect(roundHeader(5, 6)).toBe('Final');
  });
});
