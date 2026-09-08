import { describe, expect, it } from 'vitest';

import { buildPayoutReportDocument } from '@/components/side_actions/reports/buildPayoutReportDocument';

describe('buildPayoutReportDocument', () => {
  it('renders backend not-ready metadata explicitly', () => {
    const document = buildPayoutReportDocument({
      report_type: 'payout',
      tournament_id: 1,
      tournament_name: 'Tournament',
      event_id: 2,
      event_name: 'Event',
      side_actions: [
        {
          side_action_id: 7,
          name: 'Evening High Game',
          side_action_type: 'high_game',
          entry_fee: 10,
          payout_ready: false,
          payout_not_ready_reason: 'Game 3 is incomplete',
        },
      ],
      rows: [
        {
          user_id: 1,
          display_name: 'Bowler',
          payouts: { '7': 'Not ready' },
          total_entered: 10,
          total_collected: 10,
          total_owed: 0,
        },
      ],
    });

    expect(document.html).toContain('Not ready — Game 3 is incomplete');
    expect(document.html).toContain('payout-not-ready">Not ready</td>');
    expect(document.html).not.toContain('$25.00');
  });

  it('labels the name column as Team / Bowler when group_by is team', () => {
    const document = buildPayoutReportDocument({
      report_type: 'payout',
      tournament_id: 1,
      tournament_name: 'Tournament',
      event_id: 2,
      event_name: 'Event',
      group_by: 'team',
      side_actions: [],
      rows: [
        {
          user_id: 1,
          display_name: 'Lane Crushers',
          team_id: 9,
          row_kind: 'team',
          payouts: {},
          total_entered: 20,
          total_collected: 20,
          total_owed: 0,
        },
      ],
    });

    expect(document.html).toContain('>Team / Bowler</th>');
    expect(document.html).toContain('(by team)');
    expect(document.html).toContain('Lane Crushers');
    expect(document.html).toContain('payout-team-badge');
  });

  it('prints teams and bowlers as separate alphabetical lists', () => {
    const document = buildPayoutReportDocument({
      report_type: 'payout',
      tournament_id: 1,
      tournament_name: 'Tournament',
      event_id: 2,
      event_name: 'Event',
      group_by: 'bowler',
      side_actions: [
        {
          side_action_id: 2,
          name: 'Team Bracket',
          side_action_type: 'bracket',
          entry_fee: 10,
          entry_unit: 'team',
        },
        {
          side_action_id: 1,
          name: 'High Game',
          side_action_type: 'high_game',
          entry_fee: 10,
          entry_unit: 'bowler',
        },
      ],
      rows: [
        {
          user_id: 10,
          display_name: 'Aces',
          team_id: 5,
          row_kind: 'team',
          payouts: { '2': 200, '1': 0 },
          total_entered: 25,
          total_collected: 0,
          total_owed: 200,
        },
        {
          user_id: 1,
          display_name: 'Bowler A',
          row_kind: 'bowler',
          payouts: { '1': 150, '2': 0 },
          total_entered: 10,
          total_collected: 10,
          total_owed: 150,
        },
      ],
    });

    expect(document.html).toContain('>Teams</td>');
    expect(document.html).toContain('>Bowlers</td>');
    expect(document.html.indexOf('Teams')).toBeLessThan(document.html.indexOf('Bowlers'));
    expect(document.html.indexOf('Aces')).toBeLessThan(document.html.indexOf('Bowler A'));
    expect(document.html).toContain('payout-col-team');
    expect(document.html).toContain('payout-na">—</td>');
  });

  it('splits many side-action columns across landscape pages', () => {
    const side_actions = Array.from({ length: 25 }, (_, index) => ({
      side_action_id: index + 1,
      name: `Side Action ${index + 1}`,
      side_action_type: 'bracket',
      entry_fee: 5,
    }));
    const document = buildPayoutReportDocument({
      report_type: 'payout',
      tournament_id: 1,
      tournament_name: 'Tournament',
      event_id: 2,
      event_name: 'Event',
      group_by: 'bowler',
      side_actions,
      rows: [
        {
          user_id: 1,
          display_name: 'Bowler A',
          row_kind: 'bowler',
          payouts: Object.fromEntries(
            side_actions.map((column) => [String(column.side_action_id), 10])
          ),
          total_entered: 100,
          total_collected: 100,
          total_owed: 250,
        },
      ],
    });

    expect(document.html).toContain('letter landscape');
    expect(document.html).toContain('payout-sheet-landscape');
    expect(
      document.html.match(/<section class="payout-report-page payout-sheet-slice">/g)?.length
    ).toBe(3);
    expect(document.html).toContain('Side actions 1–10 of 25');
    expect(document.html).toContain('Side actions 21–25 of 25');
    expect(document.html.match(/<th class="col-money">Owed<\/th>/g)?.length).toBe(1);
    expect(document.html.match(/<th class="col-signature">Signature<\/th>/g)?.length).toBe(1);
  });
});
