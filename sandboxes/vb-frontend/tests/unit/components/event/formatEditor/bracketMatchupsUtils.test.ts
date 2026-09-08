import { describe, expect, it } from 'vitest';
import type { MatchSeriesRead } from '@/api/round-match-series';
import type { RoundRead } from '@/types/round';
import {
  groupBracketSeries,
  normalizeBracketSeedMode,
  seedConfigFromRound,
  seedConfigToPatch,
} from '@/components/event/formatEditor/bracketMatchupsUtils';

function series(
  patch: Partial<MatchSeriesRead> & { id: number }
): MatchSeriesRead {
  return {
    round_id: 1,
    event_id: 1,
    race_to_wins: 1,
    max_games: 1,
    status: 'pending',
    wins_side_0: 0,
    wins_side_1: 0,
    winner_side: null,
    display_order: patch.display_order ?? patch.id,
    bracket_template: 'single_elim',
    match_label: null,
    participants: [],
    ...patch,
  };
}

describe('bracketMatchupsUtils', () => {
  it('normalizes seed_mode', () => {
    expect(normalizeBracketSeedMode('by_seed')).toBe('by_seed');
    expect(normalizeBracketSeedMode('random')).toBe('random');
    expect(normalizeBracketSeedMode('manual')).toBe('manual');
    expect(normalizeBracketSeedMode('nope')).toBe('by_seed');
  });

  it('seedConfigFromRound / ToPatch round-trips', () => {
    const round = {
      id: 3,
      competition_method_config: {
        bracket_mode: 'double_elimination',
        seed_mode: 'random',
        grand_final_reset: true,
        race_to_wins: 2,
      },
    } as RoundRead;
    const draft = seedConfigFromRound(round);
    expect(draft).toEqual({
      seed_mode: 'random',
      bracket_mode: 'double_elimination',
      grand_final_reset: true,
      seed_source_mode: 'feeder',
      seed_source_round_id: null,
    });
    expect(
      seedConfigToPatch(
        { ...draft, seed_mode: 'manual', bracket_mode: 'single_elimination' },
        { race_to_wins: 2, keep: true }
      )
    ).toEqual({
      race_to_wins: 2,
      keep: true,
      seed_mode: 'manual',
      bracket_mode: 'single_elimination',
      grand_final_reset: false,
      seed_source_mode: 'feeder',
      seed_source_round_id: null,
    });
  });

  it('groups opening + later rounds with Round of N titles', () => {
    const sections = groupBracketSeries([
      series({ id: 1, bracket_round: 0, bracket_slot: 0, bracket_segment: 'winner' }),
      series({ id: 2, bracket_round: 0, bracket_slot: 1, bracket_segment: 'winner' }),
      series({ id: 3, bracket_round: 1, bracket_slot: 0, bracket_segment: 'winner' }),
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Semifinals');
    expect(sections[1].title).toBe('Final');
    expect(sections[0].series.map((s) => s.id)).toEqual([1, 2]);
  });

  it('orders losers after winners', () => {
    const sections = groupBracketSeries([
      series({ id: 10, bracket_round: 0, bracket_segment: 'loser' }),
      series({ id: 1, bracket_round: 0, bracket_segment: 'winner' }),
    ]);
    expect(sections[0].segment).toBe('winner');
    expect(sections[1].segment).toBe('loser');
    expect(sections[1].title).toContain('Losers');
  });
});
