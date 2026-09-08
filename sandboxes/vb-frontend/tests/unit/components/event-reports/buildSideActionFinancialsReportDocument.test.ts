import { describe, expect, it } from 'vitest';

import { buildSideActionFinancialsReportDocument } from '@/components/event-reports/buildSideActionFinancialsReportDocument';
import type { SideActionFinancialsReport } from '@/api/event-reports';

const report = (): SideActionFinancialsReport => ({
  report_type: 'side_action_financials',
  tournament_id: 1,
  tournament_name: 'Open Classic',
  scope: 'tournament',
  event_id: null,
  totals: {
    side_action_count: 2,
    entry_count: 16,
    intake: 80,
    fees: 16,
    payouts: 56,
    refunds: 8,
    net: 0,
  },
  sections: [
    {
      event_id: 10,
      event_name: 'Singles',
      totals: {
        side_action_count: 1,
        entry_count: 8,
        intake: 40,
        fees: 8,
        payouts: 28,
        refunds: 4,
        net: 0,
      },
      side_actions: [
        {
          side_action_id: 1,
          name: 'Morning Brackets',
          side_action_type: 'bracket',
          status: 'in_progress',
          is_projected: true,
          entry_fee: 5,
          entry_count: 8,
          intake: 40,
          fees: 8,
          payouts: 28,
          refunds: 4,
          net: 0,
          prize_summary: '1st=$25.00 · 2nd=$10.00',
        },
      ],
    },
    {
      event_id: 11,
      event_name: 'Doubles',
      totals: {
        side_action_count: 1,
        entry_count: 8,
        intake: 40,
        fees: 8,
        payouts: 28,
        refunds: 4,
        net: 0,
      },
      side_actions: [
        {
          side_action_id: 2,
          name: 'High Game',
          side_action_type: 'high_game',
          status: 'registration_open',
          is_projected: true,
          entry_fee: 5,
          entry_count: 8,
          intake: 40,
          fees: 8,
          payouts: 28,
          refunds: 0,
          net: 4,
          prize_summary: '1=$20.00 · 2=$8.00',
        },
      ],
    },
  ],
});

describe('buildSideActionFinancialsReportDocument', () => {
  it('prints grand totals and per-event side action rows without bowler detail', () => {
    const doc = buildSideActionFinancialsReportDocument(report());
    expect(doc.html).toContain('Side Action Financials');
    expect(doc.html).toContain('Side action only');
    expect(doc.html).toContain('No bowler detail');
    expect(doc.html).toContain('Grand totals');
    expect(doc.html).toContain('Singles');
    expect(doc.html).toContain('Doubles');
    expect(doc.html).toContain('Morning Brackets');
    expect(doc.html).toContain('High Game');
    expect(doc.html).toContain('Intake');
    expect(doc.html).toContain('Refunds');
    expect(doc.html).not.toContain('user_id');
    expect(doc.html).not.toContain('Bowler');
  });
});
