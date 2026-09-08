import { describe, expect, it } from 'vitest';
import { buildPrizeFundReportDocument } from '@/components/event-reports/buildPrizeFundReportDocument';
import type { PrizeFundReport } from '@/api/event-reports';

const baseReport: PrizeFundReport = {
  report_type: 'prize_fund',
  tournament_id: 9,
  tournament_name: 'Open',
  scope: 'event',
  event_id: 42,
  include_fund_summary: true,
  include_winners: false,
  sections: [
    {
      event_id: 42,
      event_name: 'Singles',
      event_format: 'singles',
      winners_available: false,
      include_winners: false,
      fund_summary: {
        approved_entries: 16,
        entry_fee: 50,
        added_money: 100,
        house_cut_type: 'percentage',
        house_cut_percentage: 20,
        house_cut_amount: null,
        house_cut_total: 180,
        lineage_fee_mode: 'flat',
        lineage_per_game: 0,
        lineage_amount: 0,
        lineage_games: 0,
        lineage_max_games: 0,
        lineage_billed_games: null,
        lineage_total: 0,
        net_prize_pool: 720,
      },
      rows: [
        {
          place: 1,
          place_label: '1st',
          amount: 400,
          display_name: null,
          is_team_row: false,
          bowlers: [],
        },
        {
          place: 2,
          place_label: '2nd',
          amount: 200,
          display_name: null,
          is_team_row: false,
          bowlers: [],
        },
      ],
    },
  ],
};

describe('buildPrizeFundReportDocument', () => {
  it('renders amounts-only mid-event sheet with fund summary', () => {
    const doc = buildPrizeFundReportDocument(baseReport);
    expect(doc.title).toBe('Prize Fund');
    expect(doc.html).toContain('Prize Fund');
    expect(doc.html).toContain('Net prize pool');
    expect(doc.html).toContain('Lineage (flat)');
    expect(doc.html).toContain('$720.00');
    expect(doc.html).toContain('1st');
    expect(doc.html).toContain('$400.00');
    expect(doc.html).toContain('Amounts only');
    expect(doc.html).not.toContain('Winner');
  });

  it('includes winner column when placements are shown', () => {
    const report: PrizeFundReport = {
      ...baseReport,
      include_winners: true,
      sections: [
        {
          ...baseReport.sections[0],
          winners_available: true,
          include_winners: true,
          rows: [
            {
              place: 1,
              place_label: '1st',
              amount: 400,
              display_name: 'Ada Bowler',
              is_team_row: false,
              bowlers: [],
            },
          ],
        },
      ],
    };
    const doc = buildPrizeFundReportDocument(report);
    expect(doc.html).toContain('Winner');
    expect(doc.html).toContain('Ada Bowler');
  });
});
