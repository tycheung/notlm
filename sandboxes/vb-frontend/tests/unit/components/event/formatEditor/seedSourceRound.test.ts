import { describe, expect, it } from 'vitest';
import type { RoundRead } from '@/types/round';
import {
  ancestorRoundsForSeeding,
  normalizeSeedSourceMode,
  normalizeSeedSourceRoundId,
  roundSeedSourceLabel,
  seedSourceFromConfig,
  seedSourceToPatch,
} from '@/components/event/formatEditor/seedSourceRound';

describe('seedSourceRound', () => {
  it('normalizes empty and invalid values to null', () => {
    expect(normalizeSeedSourceRoundId(null)).toBeNull();
    expect(normalizeSeedSourceRoundId('')).toBeNull();
    expect(normalizeSeedSourceRoundId(0)).toBeNull();
    expect(normalizeSeedSourceRoundId(7)).toBe(7);
  });

  it('resolves seed source mode with legacy round id', () => {
    expect(normalizeSeedSourceMode(null, null)).toBe('feeder');
    expect(normalizeSeedSourceMode('all_rounds', null)).toBe('all_rounds');
    expect(normalizeSeedSourceMode(null, 5)).toBe('round');
    expect(normalizeSeedSourceMode('feeder', 5)).toBe('feeder');
  });

  it('round-trips config patch for each mode', () => {
    expect(seedSourceFromConfig({})).toEqual({
      seed_source_mode: 'feeder',
      seed_source_round_id: null,
    });
    expect(seedSourceToPatch({ seed_source_mode: 'all_rounds' }, { keep: true })).toEqual({
      keep: true,
      seed_source_mode: 'all_rounds',
      seed_source_round_id: null,
    });
    expect(
      seedSourceToPatch({ seed_source_mode: 'round', seed_source_round_id: 9 }, {})
    ).toEqual({
      seed_source_mode: 'round',
      seed_source_round_id: 9,
    });
  });

  it('lists other event rounds for the dropdown', () => {
    const rounds = [
      { id: 3, round_number: 3, friendly_name: 'Pods of 3' },
      { id: 1, round_number: 1, friendly_name: 'Qualifying' },
      { id: 2, round_number: 2, friendly_name: 'Pods of 5' },
    ] as RoundRead[];
    const opts = ancestorRoundsForSeeding(rounds, 3);
    expect(opts.map((r) => r.id)).toEqual([1, 2]);
    expect(roundSeedSourceLabel(opts[0])).toBe('Round 1 · Qualifying');
  });
});
