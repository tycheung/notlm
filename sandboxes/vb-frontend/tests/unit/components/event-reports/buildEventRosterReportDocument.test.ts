import { describe, expect, it } from 'vitest';

import type { EventRosterReport } from '@/api/event-reports';
import { buildEventRosterReportDocument } from '@/components/event-reports/buildEventRosterReportDocument';

const roster = (): EventRosterReport => ({
  report_type: 'event_roster',
  tournament_id: 1,
  tournament_name: 'Open Classic',
  event_id: 10,
  event_name: 'Singles Event',
  event_format: 'singles',
  scope: 'event',
  squad_id: null,
  squad_name: null,
  include_checkin: true,
  include_usbc: true,
  include_average: true,
  include_handicap: true,
  include_lane: true,
  include_paid: true,
  rows: [
    {
      event_participant_id: 11,
      user_id: 1,
      display_name: 'Alex One',
      usbc_id: '12-3-456',
      entry_number: 1,
      is_reentry: false,
      status: 'approved',
      team_id: null,
      team_name: null,
      squad_id: 1,
      squad_name: 'Morning',
      assigned_lane: 5,
      pair_label: '5/6',
      qualifying_average: 200,
      handicap: 21,
      checked_in: true,
      paid_amount: 100,
      entry_fee: 100,
      balance_due: 0,
    },
    {
      event_participant_id: 12,
      user_id: 2,
      display_name: 'Blair Two',
      usbc_id: null,
      entry_number: 2,
      is_reentry: true,
      status: 'approved',
      team_id: null,
      team_name: null,
      squad_id: 1,
      squad_name: 'Morning',
      assigned_lane: null,
      pair_label: null,
      qualifying_average: null,
      handicap: null,
      checked_in: false,
      paid_amount: 0,
      entry_fee: 100,
      balance_due: 100,
    },
  ],
});

describe('buildEventRosterReportDocument', () => {
  it('prints roster rows with check-in boxes and re-entry labels', () => {
    const doc = buildEventRosterReportDocument(roster());
    expect(doc.html).toContain('Event Roster / Check-in');
    expect(doc.html).toContain('Alex One');
    expect(doc.html).toContain('12-3-456');
    expect(doc.html).toContain('5/6');
    expect(doc.html).toContain('Blair Two (R2)');
    expect(doc.html).toContain('$100.00');
    expect(doc.html).toContain('ls-checkbox');
    expect(doc.html).toContain('ls-checked');
  });
});
