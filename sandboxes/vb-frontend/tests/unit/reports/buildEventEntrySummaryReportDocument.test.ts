import { describe, expect, it } from 'vitest';

import type { EventEntrySummaryReport } from '../../../src/api/side-actions';
import { buildEventEntrySummaryReportDocument } from '../../../src/components/side_actions/reports/buildEventEntrySummaryReportDocument';

describe('buildEventEntrySummaryReportDocument', () => {
  it('stitches bracket and high game sections with a cover page', () => {
    const report: EventEntrySummaryReport = {
      report_type: 'event_entry_summary',
      side_action_id: 1,
      tournament_id: 10,
      tournament_name: 'Spring Open',
      event_id: 20,
      event_name: 'Saturday Squad',
      sections: [
        {
          section_type: 'bracket',
          label: 'Brackets',
          report: {
            report_type: 'entry_summary',
            side_action_name: 'All brackets',
            tournament_id: 10,
            tournament_name: 'Spring Open',
            event_id: 20,
            event_name: 'Saturday Squad',
            scope: 'all',
            source: 'preview',
            total_entries: 12,
            bracket_count: 3,
            unplaced_tickets: 0,
            financials: {
              total_collected: 84,
              total_refunds: 0,
              winnings: 60,
              total_payout: 60,
              fees: 24,
            },
            bracket_setups: [],
          },
        },
        {
          section_type: 'high_game',
          label: 'High Games',
          report: {
            report_type: 'high_game_entry_summary',
            side_action_name: 'All high games',
            tournament_id: 10,
            tournament_name: 'Spring Open',
            event_id: 20,
            event_name: 'Saturday Squad',
            scope: 'all',
            included_side_actions: ['G1 High'],
            pots: [],
            totals: {
              entry_count: 0,
              collected: 0,
              expenses: 0,
              prize_fund: 0,
              places_sum_all_games: 0,
            },
          },
        },
      ],
    };

    const doc = buildEventEntrySummaryReportDocument(report);
    expect(doc.title).toContain('Saturday Squad');
    expect(doc.html).toContain('All Side Actions — Entry Summary');
    expect(doc.html).toContain('Bracket Entry Summary');
    expect(doc.html).toContain('High Game Entry Summary');
    expect(doc.html).toContain('<li>Brackets</li>');
    expect(doc.html).toContain('<li>High Games</li>');
  });
});
