import { describe, expect, it } from 'vitest';

import {
  PRINT_CSS,
  buildReportDocument,
  escapeHtml,
  formatDateOnly,
  formatFilenameDate,
  formatMoney,
  formatMoneyAlways,
  formatMoneyOrDash,
  printReportIframe,
  reportSuggestedFilename,
} from '@/utils/sideActionReportPrint';

describe('side action report print helpers', () => {
  it('sanitizes filenames and report HTML metadata', () => {
    expect(
      reportSuggestedFilename('High Series', 'Morning / A', null, '2026-07-17')
    ).toBe('High_Series_Morning_A_2026-07-17');
    expect(escapeHtml('<Squad & "Pool">')).toBe(
      '&lt;Squad &amp; &quot;Pool&quot;&gt;'
    );

    const document = buildReportDocument(
      'Unsafe <title>',
      '<main>report</main>',
      'Safe_Report'
    );
    expect(document.html).toContain('<title>Safe_Report</title>');
    expect(document.html).toContain('<main>report</main>');
  });

  it('rejects printing before an iframe document is ready', () => {
    expect(() => printReportIframe(null, 'Report')).toThrow(
      'Report preview is not ready to print yet.'
    );
  });

  it('emits a valid configured text color in shared print CSS', () => {
    expect(PRINT_CSS).not.toContain('color: undefined');
    expect(PRINT_CSS).toContain('color: #111827');
  });

  it('applies custom pageSize and bodyClass for standings lane sheets', () => {
    const document = buildReportDocument('Standings', '<main>rows</main>', 'Standings', {
      pageSize: 'letter portrait',
      pageMargin: '0.4in',
      bodyClass: 'standings-lane-sheet',
    });
    expect(document.html).toContain(
      '@page { size: letter portrait; margin: 0.4in; }'
    );
    expect(document.html).toContain('<body class="standings-lane-sheet">');
  });

  it('formats report dates and money without changing print semantics', () => {
    const d = new Date(2026, 7, 14);
    expect(formatFilenameDate(d)).toBe('2026-08-14');
    expect(formatDateOnly(d)).toMatch(/2026/);
    expect(formatMoney(0)).toBe('');
    expect(formatMoney(12.5)).toBe('$12.50');
    expect(formatMoneyAlways(0)).toBe('$0.00');
    expect(formatMoneyAlways(12.5)).toBe('$12.50');
    expect(formatMoneyOrDash(null)).toBe('—');
    expect(formatMoneyOrDash(0)).toBe('$0.00');
    expect(formatMoneyOrDash(12.5)).toBe('$12.50');
  });
});
