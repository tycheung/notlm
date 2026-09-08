import { describe, expect, it } from 'vitest';

import type { SignupSheetReport } from '@/api/side-action-reports';
import { buildSignupSheetReportDocument } from '@/components/side_actions/reports/buildSignupSheetReportDocument';

function column(id: number) {
  return {
    side_action_id: id,
    name: `Side Action ${id}`,
    side_action_type: 'bracket',
    entry_fee: 5,
    pool_id: id * 10,
    squad_id: 1,
    squad_name: 'Squad A',
  };
}

function baseReport(columnCount: number): SignupSheetReport {
  const side_actions = Array.from({ length: columnCount }, (_, index) =>
    column(index + 1)
  );
  return {
    report_type: 'signup_sheet',
    tournament_id: 1,
    tournament_name: 'Test Open',
    event_id: 1,
    event_name: 'Event 1',
    mode: 'blank',
    side_actions,
    rows: [],
  };
}

describe('buildSignupSheetReportDocument', () => {
  it('uses a single portrait slice for a few columns', () => {
    const doc = buildSignupSheetReportDocument(baseReport(5), {
      entryCells: 'blank',
      blankPages: 1,
    });
    expect(doc.html).toContain('letter portrait');
    expect(doc.html).toContain('signup-sheet-portrait');
    expect(
      doc.html.match(/<section class="signup-blank-page signup-sheet-slice">/g)?.length
    ).toBe(1);
    expect(doc.html).not.toContain('Side actions 1–');
  });

  it('splits many columns across landscape pages', () => {
    const doc = buildSignupSheetReportDocument(baseReport(25), {
      entryCells: 'blank',
      blankPages: 1,
    });
    expect(doc.html).toContain('letter landscape');
    expect(
      doc.html.match(/<section class="signup-blank-page signup-sheet-slice">/g)?.length
    ).toBe(3);
    expect(doc.html).toContain('Side actions 1–10 of 25');
    expect(doc.html).toContain('Side actions 11–20 of 25');
    expect(doc.html).toContain('Side actions 21–25 of 25');
    expect(doc.html.match(/<th class="col-total">Total<\/th>/g)?.length).toBe(1);
    expect(doc.html).toContain('signup-count-cell');
    expect(doc.html).toContain('min-width: 0.72in');
  });
});
