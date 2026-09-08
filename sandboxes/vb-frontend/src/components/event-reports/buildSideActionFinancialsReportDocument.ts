import type {
  SideActionFinancialsEventSection,
  SideActionFinancialsReport,
  SideActionFinancialsRow,
  SideActionFinancialsTotals,
} from '../../api/event-reports';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatDateOnly,
  formatMoneyOrDash,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../utils/sideActionReportPrint';

function typeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

function totalsRows(totals: SideActionFinancialsTotals): string {
  return `
    <table class="ls-table fin-summary">
      <tbody>
        <tr><th>Side actions</th><td>${escapeHtml(String(totals.side_action_count))}</td></tr>
        <tr><th>Entries / tickets</th><td>${escapeHtml(String(totals.entry_count))}</td></tr>
        <tr><th>Intake</th><td>${escapeHtml(formatMoneyOrDash(totals.intake))}</td></tr>
        <tr><th>Fees / house</th><td>${escapeHtml(formatMoneyOrDash(totals.fees))}</td></tr>
        <tr><th>Payouts</th><td>${escapeHtml(formatMoneyOrDash(totals.payouts))}</td></tr>
        <tr><th>Refunds</th><td>${escapeHtml(formatMoneyOrDash(totals.refunds))}</td></tr>
        <tr class="ls-tot"><th>Net</th><td>${escapeHtml(formatMoneyOrDash(totals.net))}</td></tr>
      </tbody>
    </table>`;
}

function saRow(row: SideActionFinancialsRow): string {
  const statusBits = [
    typeLabel(row.side_action_type),
    row.status,
    row.is_projected ? 'in progress' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const prize = row.prize_summary
    ? `<div class="sa-prize">${escapeHtml(row.prize_summary)}</div>`
    : '';
  return `<tr>
    <td class="col-name">
      <div class="sa-name">${escapeHtml(row.name)}</div>
      <div class="sa-meta">${escapeHtml(statusBits)}</div>
      ${prize}
    </td>
    <td class="col-num">${escapeHtml(formatMoneyOrDash(row.entry_fee))}</td>
    <td class="col-num">${escapeHtml(String(row.entry_count))}</td>
    <td class="col-num">${escapeHtml(formatMoneyOrDash(row.intake))}</td>
    <td class="col-num">${escapeHtml(formatMoneyOrDash(row.fees))}</td>
    <td class="col-num">${escapeHtml(formatMoneyOrDash(row.payouts))}</td>
    <td class="col-num">${escapeHtml(formatMoneyOrDash(row.refunds))}</td>
    <td class="col-num col-tot">${escapeHtml(formatMoneyOrDash(row.net))}</td>
  </tr>`;
}

function sectionHtml(section: SideActionFinancialsEventSection, showEventTotals: boolean): string {
  const body =
    section.side_actions.length === 0
      ? `<tr><td colspan="8" class="ls-empty">No side actions on this event.</td></tr>`
      : section.side_actions.map(saRow).join('');
  return `
    <section class="ls-section">
      <h2 class="ls-event-title">${escapeHtml(section.event_name)}</h2>
      ${showEventTotals ? totalsRows(section.totals) : ''}
      <table class="ls-table sa-table">
        <thead>
          <tr>
            <th class="col-name">Side action</th>
            <th class="col-num">Fee</th>
            <th class="col-num">Entries</th>
            <th class="col-num">Intake</th>
            <th class="col-num">Fees</th>
            <th class="col-num">Payouts</th>
            <th class="col-num">Refunds</th>
            <th class="col-num">Net</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
}

export function buildSideActionFinancialsReportDocument(
  report: SideActionFinancialsReport
): ReportDocument {
  const title = 'Side Action Financials';
  const filename = reportSuggestedFilename(
    'sa_financials',
    report.tournament_name,
    report.scope
  );
  const subtitle = withDirector(
    report.scope === 'tournament'
      ? `${report.tournament_name} · Entire tournament`
      : `${report.tournament_name} · Event`,
    report.director_name
  );
  const showEventTotals = report.scope === 'tournament' || report.sections.length > 1;

  const bodyHtml = `
    <header class="report-header ls-header">
      <div>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <div class="report-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="report-meta">${escapeHtml(formatDateOnly())}</div>
    </header>
    <p class="report-note">Side action only — excludes event entry fees and prize fund. No bowler detail.</p>
    <h2 class="ls-event-title">Grand totals</h2>
    ${totalsRows(report.totals)}
    ${
      report.sections.length === 0
        ? `<p class="report-note">No events found.</p>`
        : report.sections.map((s) => sectionHtml(s, showEventTotals)).join('')
    }
    ${reportFooterHtml()}
    <style>
      body.standings-lane-sheet {
        width: 7.7in;
        max-width: 100%;
        margin: 0 auto;
        padding: 8px 0;
        box-sizing: border-box;
      }
      body.standings-lane-sheet .ls-header { margin-bottom: 10px; padding-bottom: 6px; }
      body.standings-lane-sheet .report-title { font-size: 14pt; }
      body.standings-lane-sheet .report-subtitle { font-size: 9pt; }
      .report-note { font-size: 8pt; color: #4b5563; margin: 0 0 8px; }
      .ls-event-title { font-size: 11pt; margin: 12px 0 6px; }
      .ls-section { margin-bottom: 14px; }
      table.ls-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      table.fin-summary th { text-align: left; font-weight: 600; width: 55%; padding: 3px 4px; font-size: 8pt; }
      table.fin-summary td { text-align: right; font-variant-numeric: tabular-nums; padding: 3px 4px; font-size: 8pt; }
      table.fin-summary tr.ls-tot th,
      table.fin-summary tr.ls-tot td { font-weight: 700; border-top: 1.5px solid #1e3a5f; }
      table.sa-table thead th {
        font-size: 7pt; font-weight: 700; text-transform: uppercase;
        border-bottom: 2px solid #1e3a5f; text-align: left; padding: 2px 4px;
      }
      table.sa-table tbody td {
        font-size: 8pt; padding: 4px; border-bottom: 0.5px solid #e5e7eb;
        vertical-align: top;
      }
      table.sa-table th.col-num,
      table.sa-table td.col-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
      table.sa-table td.col-tot { font-weight: 700; }
      .sa-name { font-weight: 600; }
      .sa-meta, .sa-prize { font-size: 7pt; color: #4b5563; }
      .ls-empty { text-align: center; color: #6b7280; padding: 10px !important; }
      @media print {
        table.sa-table thead { display: table-header-group; }
        table.sa-table tr { page-break-inside: avoid; }
      }
    </style>
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    pageSize: 'letter portrait',
    pageMargin: '0.4in',
    bodyClass: 'standings-lane-sheet',
  });
}
