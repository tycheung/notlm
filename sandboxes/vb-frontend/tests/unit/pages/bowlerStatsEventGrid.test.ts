import { describe, expect, it } from 'vitest';

import { formatStatNumber } from '@/pages/dashboard/bowlerStatDisplay';
import {
  formatHandicap,
  formatPinfall,
  formatPlace,
  gameScoreColumnNumbers,
  scoresForGameNumber,
  type BowlerBowledEvent,
} from '@/pages/dashboard/bowlerStatsEventGrid';

function event(partial: Partial<BowlerBowledEvent> & { event_id: number; event_name: string }): BowlerBowledEvent {
  return {
    tournament_id: 1,
    tournament_name: 'Open',
    start_date: '2026-08-01T09:00:00',
    games: [],
    ...partial,
  };
}

describe('bowler stats display', () => {
  it('uses No Results when a stat is missing', () => {
    expect(formatStatNumber(null)).toBe('No Results');
    expect(formatStatNumber(undefined)).toBe('No Results');
    expect(formatStatNumber(190.4)).toBe('190');
  });

  it('builds game columns and fills missing scores', () => {
    const rows = [
      event({
        event_id: 1,
        event_name: 'Singles',
        games: [
          { game_number: 1, score: 210 },
          { game_number: 3, score: 189 },
        ],
      }),
    ];
    expect(gameScoreColumnNumbers(rows)).toEqual([1, 2, 3]);
    expect(scoresForGameNumber(rows[0], 1)).toBe('210');
    expect(scoresForGameNumber(rows[0], 2)).toBe('No Results');
    expect(scoresForGameNumber(rows[0], 3)).toBe('189');
  });

  it('formats place, pinfall, and handicap for the events grid', () => {
    expect(formatPlace(1)).toBe('1');
    expect(formatPlace(null)).toBe('—');
    expect(formatPinfall(399)).toBe('399');
    expect(formatPinfall(null)).toBe('—');
    expect(formatHandicap(10)).toBe('10');
    expect(formatHandicap(0)).toBe('—');
    expect(formatHandicap(null)).toBe('—');
  });
});
