import { describe, expect, it } from 'vitest';

import type { EntrySummaryReport } from '@/api/side-action-reports';
import { buildEntrySummaryReportDocument } from '@/components/side_actions/reports/buildEntrySummaryReportDocument';

function baseReport(overrides: Partial<EntrySummaryReport> = {}): EntrySummaryReport {
  return {
    report_type: 'entry_summary',
    tournament_id: 1,
    tournament_name: 'Test Open',
    event_id: 1,
    event_name: 'Event 1',
    side_action_id: 1,
    side_action_name: 'Handicap 1-3',
    scope: 'this',
    total_entries: 24,
    bracket_count: 3,
    unplaced_tickets: 0,
    entry_fee: 5,
    financials: {
      total_collected: 120,
      total_refunds: 0,
      winnings: 105,
      total_payout: 105,
      fees: 15,
    },
    bracket_setups: [
      {
        side_action_id: 1,
        side_action_name: 'Handicap 1-3',
        pool_id: 10,
        squad_id: 1,
        squad_name: 'Squad 1',
        game_numbers: [1, 2, 3],
        entry_fee: 5,
        slots_full: 2,
        total_entries: 24,
        bracket_count: 3,
        unplaced_tickets: 0,
        payouts: { first: 20, second: 10, fee: 5 },
        bye_payouts: { first: 20, second: 10, fee: 0 },
        scenarios: [
          {
            label: '8 entries',
            entries: 8,
            entry_fee: 5,
            collected: 40,
            fees: 5,
            first: 20,
            second: 10,
            winnings: 30,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('buildEntrySummaryReportDocument', () => {
  it('includes entries by bracket set table with per-set counts', () => {
    const doc = buildEntrySummaryReportDocument(
      baseReport({
        scope: 'all',
        total_entries: 50,
        bracket_count: 6,
        unplaced_tickets: 2,
        bracket_setups: [
          {
            side_action_id: 1,
            side_action_name: 'Handicap 1-3',
            pool_id: 10,
            squad_id: 1,
            squad_name: 'Squad 1',
            game_numbers: [1, 2, 3],
            entry_fee: 5,
            slots_full: 2,
            total_entries: 24,
            bracket_count: 3,
            unplaced_tickets: 0,
            payouts: { first: 20, second: 10, fee: 5 },
            scenarios: [],
          },
          {
            side_action_id: 2,
            side_action_name: 'Scratch 2-4',
            pool_id: 20,
            squad_id: 1,
            squad_name: 'Squad 1',
            game_numbers: [2, 3, 4],
            entry_fee: 5,
            slots_full: 2,
            total_entries: 26,
            bracket_count: 3,
            unplaced_tickets: 2,
            payouts: { first: 20, second: 10, fee: 5 },
            scenarios: [],
          },
        ],
      })
    );

    expect(doc.html).toContain('Entries by bracket set');
    expect(doc.html).toContain('entry-summary-by-set');
    expect(doc.html).toContain('Handicap 1-3');
    expect(doc.html).toContain('Scratch 2-4');
    expect(doc.html).toContain('>24<');
    expect(doc.html).toContain('>26<');
    expect(doc.html).toContain('>50<');
  });

  it('shows entry counts in bracket setup subtitle', () => {
    const doc = buildEntrySummaryReportDocument(baseReport());

    expect(doc.html).toContain('24 entries');
    expect(doc.html).toContain('3 brackets');
  });
});
