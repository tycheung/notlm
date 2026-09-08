import { describe, expect, it } from 'vitest';

import { buildEventFinancialsReportDocument } from '@/components/event-reports/buildEventFinancialsReportDocument';
import type { EventFinancialsReport } from '@/api/event-reports';

const report = (): EventFinancialsReport => ({
  report_type: 'event_financials',
  tournament_id: 1,
  tournament_name: 'Open Classic',
  event_id: 10,
  event_name: 'Singles Event',
  event_format: 'singles',
  approved_entries: 10,
  reentry_count: 1,
  entry_fee: 100,
  reentry_fee: 80,
  entry_fees_billed: 1000,
  amount_collected: 900,
  balance_due: 100,
  added_money: 50,
  house_cut_type: 'percentage',
  house_cut_percentage: 20,
  house_cut_amount: null,
  house_cut_total: 210,
  lineage_fee_mode: 'flat',
  lineage_per_game: 0,
  lineage_amount: 40,
  lineage_games: 0,
  lineage_max_games: 0,
  lineage_billed_games: null,
  lineage_total: 40,
  net_prize_pool: 800,
  prizes_allocated: 800,
  unallocated: 0,
  lineage_bundled_in_house_cut: false,
  prize_lines: [{ place: 1, place_label: '1st Place', amount: 800 }],
});

describe('buildEventFinancialsReportDocument', () => {
  it('prints settlement totals and prize places without side action', () => {
    const doc = buildEventFinancialsReportDocument(report());
    expect(doc.html).toContain('Event Financials');
    expect(doc.html).toContain('Side action is excluded');
    expect(doc.html).toContain('House cut (20%)');
    expect(doc.html).toContain('Lineage (flat)');
    expect(doc.html).toContain('$800.00');
    expect(doc.html).toContain('1st Place');
    expect(doc.html).not.toContain('Lineage is not a separate line yet');
  });
});
