import type { HighGameEntrySummaryReport } from '../../../api/side-actions';
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

function potBlock(pot: HighGameEntrySummaryReport['pots'][number], showName: boolean): string {
  const divParts: string[] = [];
  if (pot.divisions?.men !== false) divParts.push('Men');
  if (pot.divisions?.women !== false) divParts.push('Women');
  const divisions =
    divParts.length === 2 ? 'Open (combined)' : divParts.join(' · ') || 'Open';
  const expenseLabel =
    pot.expense_type === 'per_entry'
      ? `${formatMoneyAlways(pot.expense_amount)} / entry`
      : `${formatMoneyAlways(pot.expense_amount)} flat`;
  const places = (pot.place_amounts || [])
    .map((amt, i) => `${ordinal(i + 1)} ${formatMoneyAlways(amt)}`)
    .join(' · ');
  const title = showName
    ? `<h3 class="entry-summary-setup-subtitle">${escapeHtml(pot.side_action_name)}</h3>`
    : '';

  return `
    ${title}
    <table class="report-table entry-summary-finance high-game-pot-table">
      <tbody>
        <tr><th scope="row">Squad pool</th><td>${escapeHtml(pot.squad_name)}</td></tr>
        <tr><th scope="row">Entries</th><td>${pot.entry_count}</td></tr>
        <tr><th scope="row">Entry fee</th><td>${escapeHtml(formatMoneyAlways(pot.entry_fee))}</td></tr>
        <tr><th scope="row">Scoring</th><td>${escapeHtml(
          pot.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap'
        )}</td></tr>
        <tr><th scope="row">Mode</th><td>${escapeHtml(
          pot.payout_mode === 'combined' ? 'Combined list' : 'Each game separate'
        )}</td></tr>
        <tr><th scope="row">Games</th><td>${escapeHtml(
          (pot.game_numbers || []).join(', ') || '—'
        )}</td></tr>
        <tr><th scope="row">Divisions</th><td>${escapeHtml(divisions)}</td></tr>
        <tr><th scope="row">Expenses</th><td>${escapeHtml(expenseLabel)}</td></tr>
        <tr><th scope="row">Place prizes</th><td>${escapeHtml(places || '—')}</td></tr>
        <tr><th scope="row">Collected</th><td>${escapeHtml(formatMoneyAlways(pot.fund.collected))}</td></tr>
        <tr><th scope="row">Expense total</th><td>${escapeHtml(formatMoneyAlways(pot.fund.expenses))}</td></tr>
        <tr><th scope="row">Prize fund</th><td>${escapeHtml(formatMoneyAlways(pot.fund.prize_fund))}</td></tr>
        <tr><th scope="row">Payout status</th><td>${escapeHtml(
          pot.fund.overcommitted
            ? 'Overcommitted'
            : pot.fund.payout_ready
              ? 'Ready'
              : 'Provisional'
        )}</td></tr>
        <tr><th scope="row">Places sum</th><td>${escapeHtml(
          pot.payout_mode === 'per_game'
            ? `${formatMoneyAlways(pot.fund.places_sum)} × ${(pot.game_numbers || []).length} games = ${formatMoneyAlways(pot.fund.places_sum_all_games)}`
            : formatMoneyAlways(pot.fund.places_sum)
        )}</td></tr>
      </tbody>
    </table>
  `;
}

export function buildHighGameEntrySummaryReportDocument(
  report: HighGameEntrySummaryReport
): ReportDocument {
  const dateLabel = formatDateOnly();
  const title = `High Game Entry Summary — ${report.side_action_name}`;
  const filename = reportSuggestedFilename(
    'High_Game_Entry_Summary',
    report.side_action_name,
    report.event_name,
    formatFilenameDate()
  );

  const included =
    report.scope === 'all' && (report.included_side_actions?.length ?? 0) > 0
      ? `<p class="report-note">Included: ${escapeHtml(
          (report.included_side_actions || []).join(', ')
        )}</p>`
      : '';

  const pots = report.pots || [];
  const showNames = report.scope === 'all' || pots.length > 1;
  const potBlocks = pots.map((p) => potBlock(p, showNames)).join('');

  const bodyHtml = `
    <section class="entry-summary-page">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(report.side_action_name)}</h1>
          <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
          <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
          <div class="report-doc-label">High Game Entry Summary</div>
        </div>
        <div class="report-meta">
          <div>${escapeHtml(dateLabel)}</div>
        </div>
      </header>
      <p class="report-note entry-summary-note">
        Live entry counts and configured fund math (not yet cashed-out totals). Place prizes are fixed $ amounts.
      </p>
      ${included}
      <div class="entry-summary-metrics">
        <div class="entry-summary-metric">
          <div class="entry-summary-metric-label">Total entries</div>
          <div class="entry-summary-metric-value">${report.totals.entry_count}</div>
        </div>
        <div class="entry-summary-metric">
          <div class="entry-summary-metric-label">Collected</div>
          <div class="entry-summary-metric-value">${escapeHtml(formatMoneyAlways(report.totals.collected))}</div>
        </div>
        <div class="entry-summary-metric">
          <div class="entry-summary-metric-label">Prize fund</div>
          <div class="entry-summary-metric-value">${escapeHtml(formatMoneyAlways(report.totals.prize_fund))}</div>
        </div>
      </div>
      <h2 class="entry-summary-section-title">${
        pots.length > 1 ? 'Pots' : 'Pot setup'
      }</h2>
      ${potBlocks || '<p class="report-note">No pot data.</p>'}
      ${reportFooterHtml()}
    </section>
  `;

  return buildReportDocument(title, bodyHtml, filename);
}
