import { describe, expect, it } from 'vitest';
import {
  computeLineageTotal,
  computeNetPrizePool,
  configuredGameCount,
} from '@/utils/prizePoolClient';

describe('prizePoolClient lineage', () => {
  it('keeps net pool unchanged when lineage is zero', () => {
    expect(computeNetPrizePool(10, 0, 'percentage', 10, 0, 10)).toBe(90);
  });

  it('subtracts flat lineage from house-cut net', () => {
    // 10 * 100 + 50 = 1050; house 20% = 210; lineage 150; net 690
    expect(computeNetPrizePool(100, 50, 'percentage', 20, 0, 10, 'flat', 0, 150, 6)).toBe(
      690
    );
  });

  it('computes per-game lineage from games × bowlers', () => {
    expect(computeLineageTotal('per_game', 2.5, 0, 8, 6)).toBe(120);
    expect(configuredGameCount([{ game_count: 3 }, { game_count: 3 }])).toBe(6);
  });

  it('uses billed games instead of live max when set', () => {
    expect(computeLineageTotal('per_game', 1, 0, 10, 100, 990)).toBe(990);
  });
});
