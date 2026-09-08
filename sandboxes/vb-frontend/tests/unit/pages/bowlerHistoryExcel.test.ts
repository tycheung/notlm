import { describe, expect, it } from 'vitest';

import {
  buildBowlerFinancialsExcelCsv,
  buildBowlerScoresExcelCsv,
} from '@/pages/dashboard/bowlerHistoryExcel';
import type { BowlerBowledEvent } from '@/pages/dashboard/bowlerStatsEventGrid';
import type { BowlerFinancialEvent } from '@/pages/dashboard/bowlerFinancialEvents';

describe('buildBowlerScoresExcelCsv', () => {
  it('matches the event grid: place, pinfall, HCP, and Game N cells', () => {
    const events: BowlerBowledEvent[] = [
      {
        event_id: 1,
        event_name: 'Singles',
        tournament_id: 9,
        tournament_name: 'Open',
        start_date: '2026-08-01T09:00:00',
        place: 4,
        pinfall: 612,
        handicap: 48,
        games: [
          { game_number: 1, score: 210 },
          { game_number: 3, score: 189 },
        ],
      },
    ];
    const csv = buildBowlerScoresExcelCsv(events);
    expect(csv.split('\r\n')[0]).toBe(
      'Event,Tournament,Date,Place,Pinfall,HCP,Game 1,Game 2,Game 3'
    );
    expect(csv).toContain('Singles');
    expect(csv).toContain('Open');
    expect(csv).toContain('4,612,48');
    expect(csv).toContain('210');
    expect(csv).toContain('No Results');
    expect(csv).toContain('189');
  });
});

describe('buildBowlerFinancialsExcelCsv', () => {
  it('matches the financials grid currency cells including dashes', () => {
    const rows: BowlerFinancialEvent[] = [
      {
        event_id: 1,
        event_name: 'Singles',
        tournament_id: 9,
        tournament_name: 'Open',
        start_date: '2026-08-01T09:00:00',
        entry_fee: 80,
        entry_fee_paid: 80,
        prize_fund: 0,
        side_action_entries: 0,
        side_action_entry_fees: 0,
        side_action_winnings: 0,
        team_side_action_entries: 0,
        team_side_action_entry_fees: 0,
        team_side_action_winnings: 0,
      },
    ];
    const csv = buildBowlerFinancialsExcelCsv(rows);
    expect(csv).toContain('Event,Tournament,Date,Entry fee,Prize fund,SA entered,SA won,Team SA entered,Team SA won');
    expect(csv).toContain('$80.00');
    expect(csv).toContain('$0.00');
    expect(csv).toContain('—');
  });
});
