import type { EliminatorEntrySummaryReport } from '../../../api/side-actions';
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
import { formatEliminatorDropLabel } from '../../../utils/eliminatorProjection';

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function dropLabel(pot: EliminatorEntrySummaryReport['pots'][number]): string {
  return formatEliminatorDropLabel({
    dropMode: pot.drop_mode,
    dropAmount: pot.drop_amount,
    dropSchedule: pot.drop_schedule,
    roundMode: pot.round_mode,
  });
}

function potBlock(pot: EliminatorEntrySummaryReport['pots'][number], showName: boolean): string {
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
  const cuts = (pot.cut_steps || [])
    .map((s) =>
      s.role === 'payout'
        ? `G${s.game_number} final: ${s.surviving} alive`
        : `G${s.game_number}: drop ${s.dropped} (${s.starting_alive}→${s.surviving})`
    )
    .join(' · ');

  return `
    ${title}
    <table class="report-table entry-summary-finance eliminator-pot-table">
      <tbody>
        <tr><th scope="row">Squad pool</th><td>${escapeHtml(pot.squad_name)}</td></tr>
        <tr><th scope="row">Entries</th><td>${pot.entry_count}</td></tr>
        <tr><th scope="row">Entry fee</th><td>${escapeHtml(formatMoneyAlways(pot.entry_fee))}</td></tr>
        <tr><th scope="row">Scoring</th><td>${escapeHtml(
          pot.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap'
        )}</td></tr>
        <tr><th scope="row">Window</th><td>Games ${(pot.game_numbers || []).join(', ') || '—'}</td></tr>
        <tr><th scope="row">Drop</th><td>${escapeHtml(dropLabel(pot))}</td></tr>
        <tr><th scope="row">Final alive</th><td>${pot.final_alive}</td></tr>
        <tr><th scope="row">Cut schedule</th><td>${escapeHtml(cuts || '—')}</td></tr>
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

export function buildEliminatorEntrySummaryReportDocument(
  report: EliminatorEntrySummaryReport
): ReportDocument {
  const dateLabel = formatDateOnly();
  const title = `Eliminator Entry Summary — ${report.side_action_name}`;
  const filename = reportSuggestedFilename(
    'Eliminator_Entry_Summary',
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

  const bodyHtml = `
    <section class="entry-summary-page">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(report.side_action_name)}</h1>
          <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
          <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
          <div class="report-doc-label">Eliminator Entry Summary</div>
        </div>
        <div class="report-meta">
          <div>${escapeHtml(dateLabel)}</div>
        </div>
      </header>
      <p class="report-note entry-summary-note">
        Live entry counts, cut projection from entries, and configured fund math.
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
        pots.length > 1 ? 'Eliminators' : 'Setup'
      }</h2>
      ${pots.map((p) => potBlock(p, showNames)).join('') || '<p class="report-note">No data.</p>'}
      ${reportFooterHtml()}
    </section>
  `;

  return buildReportDocument(title, bodyHtml, filename);
}
