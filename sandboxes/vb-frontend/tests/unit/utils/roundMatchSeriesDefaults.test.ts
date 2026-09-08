import { describe, expect, it } from 'vitest';

import { resolveMatchSeriesDefaults } from '@/utils/roundMatchSeriesDefaults';

describe('resolveMatchSeriesDefaults', () => {
  const rounds = [
    { id: 10, format_id: 100 },
    { id: 20, format_id: 200 },
  ];

  it('uses race_to_wins and max_games from the selected round format', () => {
    const formats = [
      { id: 100, options: { race_to_wins: 3, max_games: 5 } },
      { id: 200, options: { race_to_wins: 1, max_games: 1 } },
    ];
    expect(resolveMatchSeriesDefaults(10, rounds, formats)).toEqual({
      race_to_wins: 3,
      max_games: 5,
    });
  });

  it('falls back to {2,3} when format is missing', () => {
    const formats = [{ id: 999, options: { race_to_wins: 4, max_games: 7 } }];
    expect(resolveMatchSeriesDefaults(10, rounds, formats)).toEqual({
      race_to_wins: 2,
      max_games: 3,
    });
  });

  it('falls back when options are non-finite', () => {
    const formats = [{ id: 100, options: { race_to_wins: NaN, max_games: 7 } }];
    expect(resolveMatchSeriesDefaults(10, rounds, formats)).toEqual({
      race_to_wins: 2,
      max_games: 3,
    });
  });
});
