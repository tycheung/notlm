import type { AlibiDoublesEntrySummaryReport } from '../../../../api/side-actions';
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
} from '../../../../utils/sideActionReportPrint';

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function potBlock(
  pot: AlibiDoublesEntrySummaryReport['pots'][number],
  showName: boolean
): string {
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
        <tr><th scope="row">Pair tickets</th><td>${pot.entry_count}</td></tr>
        <tr><th scope="row">Pairs</th><td>${pot.pair_count}</td></tr>
        <tr><th scope="row">Entry fee</th><td>${escapeHtml(formatMoneyAlways(pot.entry_fee))}</td></tr>
        <tr><th scope="row">Scoring</th><td>${escapeHtml(
          pot.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap'
        )}</td></tr>
        <tr><th scope="row">Games</th><td>${escapeHtml(pot.games_label || String(pot.game_number ?? ''))}</td></tr>
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
      </tbody>
    </table>
  `;
}

export function buildAlibiDoublesEntrySummaryReportDocument(
  report: AlibiDoublesEntrySummaryReport
): ReportDocument {
  const dateLabel = formatDateOnly();
  const multi = (report.pots?.length ?? 0) > 1;
  const reportName = multi
    ? 'Alibi Doubles (multiple pots)'
    : report.pots?.[0]?.side_action_name || 'Alibi Doubles';
  const title = `Alibi Doubles Entry Summary — ${reportName}`;
  const filename = reportSuggestedFilename(
    'Alibi_Doubles_Entry_Summary',
    reportName,
    report.event_name,
    formatFilenameDate()
  );

  const potsHtml = (report.pots || []).map((pot) => potBlock(pot, multi)).join('');
  const bodyHtml = `
    <section class="report-page">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(reportName)}</h1>
          <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
          <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
          <div class="report-doc-label">Alibi Doubles Entry Summary</div>
        </div>
        <div class="report-meta"><div>${escapeHtml(dateLabel)}</div></div>
      </header>
      ${potsHtml || '<p class="report-note">No pots to display.</p>'}
      ${reportFooterHtml()}
    </section>`;

  return buildReportDocument(title, bodyHtml, filename);
}
