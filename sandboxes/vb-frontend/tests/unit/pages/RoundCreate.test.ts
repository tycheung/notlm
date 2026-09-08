import { describe, expect, it } from 'vitest';

import { ScoreType } from '@/types/round_enums';
import type { RoundFormatRead } from '@/types/round';
import { resolveRoundCreateGameCount } from '@/utils/roundCreateUtils';

function format(overrides: Partial<RoundFormatRead>): RoundFormatRead {
  return {
    id: 1,
    created_at: '',
    name: 'Format',
    games_count: 3,
    score_type: ScoreType.TOTAL_PINFALL,
    round_tiebreaker_rules: 'highest_game' as any,
    options: {},
    ...overrides,
  };
}

describe('resolveRoundCreateGameCount', () => {
  it('keeps game count for non-match-play formats', () => {
    const value = resolveRoundCreateGameCount(3, format({ score_type: ScoreType.TOTAL_PINFALL }));
    expect(value).toBe(3);
  });

  it('raises game count to match_play max_games when needed', () => {
    const value = resolveRoundCreateGameCount(
      3,
      format({ score_type: ScoreType.MATCH_PLAY, options: { race_to_wins: 4, max_games: 7 } })
    );
    expect(value).toBe(7);
  });

  it('does not reduce game count when already above max_games', () => {
    const value = resolveRoundCreateGameCount(
      9,
      format({ score_type: ScoreType.MATCH_PLAY, options: { race_to_wins: 4, max_games: 7 } })
    );
    expect(value).toBe(9);
  });
});

