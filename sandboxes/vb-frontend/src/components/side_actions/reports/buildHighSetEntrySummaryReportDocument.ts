import type { HighSetEntrySummaryReport } from '../../../api/side-actions';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatDateOnly,
  formatFilenameDate,
  formatMoneyAlways,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../../utils/sideActionReportPrint';

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function potBlock(pot: HighSetEntrySummaryReport['pots'][number], showName: boolean): string {
  const divParts: string[] = [];
  if (pot.divisions?.men !== false) divParts.push('Men');
  if (pot.divisions?.women !== false) divParts.push('Women');
  const divisions =
    divParts.length === 2 ? 'Open (combined)' : divParts.join(' · ') || 'Open';
  const expenseLabel =
    pot.expense_type === 'per_entry'
      ? `${formatMoneyAlways(pot.expense_amount)} / entry`
      : pot.expense_type === 'percentage'
        ? `${pot.expense_amount}%`
        : `${formatMoneyAlways(pot.expense_amount)} flat`;
  const places = (pot.place_amounts || [])
    .map((amt, i) => `${ordinal(i + 1)} ${formatMoneyAlways(amt)}`)
    .join(' · ');
  const title = showName
    ? `<h3 class="entry-summary-setup-subtitle">${escapeHtml(pot.side_action_name)}</h3>`
    : '';
  const games = (pot.game_numbers || []).join(', ') || '—';

  return `
    ${title}
    <table class="report-table entry-summary-finance high-game-pot-table">
      <tbody>
        <tr><th scope="row">Entries</th><td>${pot.entry_count}</td></tr>
        <tr><th scope="row">Squad pool</th><td>${escapeHtml(pot.squad_name)}</td></tr>
        <tr><th scope="row">Entry fee</th><td>${escapeHtml(formatMoneyAlways(pot.entry_fee))}</td></tr>
        <tr><th scope="row">Scoring</th><td>${escapeHtml(
          pot.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap'
        )}</td></tr>
        <tr><th scope="row">Series games</th><td>${escapeHtml(games)}</td></tr>
        <tr><th scope="row">Series mode</th><td>${escapeHtml(
          pot.series_mode === 'best_n' ? `Best ${pot.best_n}` : 'Sum selected'
        )}</td></tr>
        <tr><th scope="row">Divisions</th><td>${escapeHtml(divisions)}</td></tr>
        <tr><th scope="row">Expenses</th><td>${escapeHtml(expenseLabel)}</td></tr>
        <tr><th scope="row">Place prizes</th><td>${escapeHtml(places || '—')}</td></tr>
        <tr><th scope="row">Collected</th><td>${escapeHtml(formatMoneyAlways(pot.fund.collected))}</td></tr>
        <tr><th scope="row">Expense total</th><td>${escapeHtml(formatMoneyAlways(pot.fund.expenses))}</td></tr>
        <tr><th scope="row">Prize fund</th><td>${escapeHtml(formatMoneyAlways(pot.fund.prize_fund))}</td></tr>
        <tr><th scope="row">Places sum</th><td>${escapeHtml(formatMoneyAlways(pot.fund.places_sum))}</td></tr>
      </tbody>
    </table>
  `;
}

export function buildHighSetEntrySummaryReportDocument(
  report: HighSetEntrySummaryReport
): ReportDocument {
  const dateLabel = formatDateOnly();
  const reportName = report.scope === 'all' ? 'All High Series' : report.side_action_name;
  const title = `High Series Entry Summary — ${reportName}`;
  const filename = reportSuggestedFilename(
    'High_Series_Entry_Summary',
    reportName,
    report.event_name,
    formatFilenameDate()
  );

  const included =
    report.scope === 'all' && (report.included_side_actions?.length ?? 0) > 0
      ? `<p class="report-note">Included: ${escapeHtml(
          (report.included_side_actions || []).join(', ')
        )}</p>`
      : '';

  const potsHtml = (report.pots || [])
    .map((pot) => potBlock(pot, report.scope === 'all' || (report.pots?.length ?? 0) > 1))
    .join('');

  const bodyHtml = `
    <section class="report-page">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(reportName)}</h1>
          <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
          <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
          <div class="report-doc-label">High Series Entry Summary</div>
        </div>
        <div class="report-meta"><div>${escapeHtml(dateLabel)}</div></div>
      </header>
      ${included}
      ${potsHtml}
      ${reportFooterHtml()}
    </section>`;

  return buildReportDocument(title, bodyHtml, filename);
}
