import type {
  PrizeFundEventSection,
  PrizeFundFundSummary,
  PrizeFundPlaceRow,
  PrizeFundReport,
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

function houseCutLabel(summary: PrizeFundFundSummary): string {
  if (summary.house_cut_type === 'percentage') {
    return `House cut (${summary.house_cut_percentage}%)`;
  }
  if (summary.house_cut_type === 'dollars_per_entry') {
    return `House cut (${formatMoneyOrDash(summary.house_cut_amount ?? summary.house_cut_percentage)} / entry)`;
  }
  return 'House cut (flat)';
}

function lineageLabel(summary: PrizeFundFundSummary): string {
  if (summary.lineage_fee_mode === 'per_game') {
    const used = summary.lineage_games;
    const max = summary.lineage_max_games;
    const rate = formatMoneyOrDash(summary.lineage_per_game);
    if (max > 0 && used !== max) {
      return `Lineage (${rate} / game × ${used} of ${max} games)`;
    }
    return `Lineage (${rate} / game × ${used} games)`;
  }
  return 'Lineage (flat)';
}

function summaryRow(label: string, value: string, strong = false): string {
  const cls = strong ? ' class="ls-tot"' : '';
  return `<tr${cls}><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}

function fundSummaryHtml(summary: PrizeFundFundSummary): string {
  return `
    <table class="ls-table fin-summary">
      <tbody>
        ${summaryRow('Approved entries', String(summary.approved_entries))}
        ${summaryRow('Entry fee', formatMoneyOrDash(summary.entry_fee))}
        ${summaryRow('Added money', formatMoneyOrDash(summary.added_money))}
        ${summaryRow(houseCutLabel(summary), formatMoneyOrDash(summary.house_cut_total))}
        ${summaryRow(lineageLabel(summary), formatMoneyOrDash(summary.lineage_total))}
        ${summaryRow('Net prize pool', formatMoneyOrDash(summary.net_prize_pool), true)}
      </tbody>
    </table>
  `;
}

function winnerCell(row: PrizeFundPlaceRow): string {
  if (!row.display_name) return '—';
  const bowlers =
    row.bowlers.length > 0
      ? `<div class="pf-bowlers">${row.bowlers
          .map((b) => escapeHtml(b.display_name))
          .join(', ')}</div>`
      : '';
  return `<div>${escapeHtml(row.display_name)}</div>${bowlers}`;
}

function placesTableHtml(section: PrizeFundEventSection): string {
  const showWinners = section.include_winners;
  if (section.rows.length === 0) {
    return `<table class="ls-table"><tbody><tr><td class="ls-empty" colspan="${
      showWinners ? 3 : 2
    }">No prize places configured.</td></tr></tbody></table>`;
  }
  const head = showWinners
    ? '<thead><tr><th>Place</th><th>Winner</th><th class="col-money">Amount</th></tr></thead>'
    : '<thead><tr><th>Place</th><th class="col-money">Amount</th></tr></thead>';
  const body = section.rows
    .map((row) =>
      showWinners
        ? `<tr>
            <td>${escapeHtml(row.place_label || String(row.place))}</td>
            <td>${winnerCell(row)}</td>
            <td class="col-money">${escapeHtml(formatMoneyOrDash(row.amount))}</td>
          </tr>`
        : `<tr>
            <td>${escapeHtml(row.place_label || String(row.place))}</td>
            <td class="col-money">${escapeHtml(formatMoneyOrDash(row.amount))}</td>
          </tr>`
    )
    .join('');
  return `<table class="ls-table">${head}<tbody>${body}</tbody></table>`;
}

function sectionHtml(section: PrizeFundEventSection, showEventTitle: boolean): string {
  const title = showEventTitle
    ? `<h2 class="ls-event-title">${escapeHtml(section.event_name)}</h2>`
    : '';
  const note =
    section.include_winners
      ? ''
      : section.winners_available
        ? '<p class="report-note">Winners available but hidden by options — amounts only.</p>'
        : '<p class="report-note">Amounts only — championship placements not posted yet.</p>';
  const summary = section.fund_summary ? fundSummaryHtml(section.fund_summary) : '';
  return `${title}${note}${summary}${placesTableHtml(section)}`;
}

export function buildPrizeFundReportDocument(report: PrizeFundReport): ReportDocument {
  const title = 'Prize Fund';
  const scopeLabel = report.scope === 'tournament' ? 'Tournament' : 'Event';
  const firstEvent = report.sections[0]?.event_name ?? null;
  const filename = reportSuggestedFilename(
    'prize_fund',
    report.tournament_name,
    report.scope === 'event' ? firstEvent : scopeLabel
  );
  const showEventTitles = report.scope === 'tournament' || report.sections.length > 1;
  const sections =
    report.sections.length === 0
      ? '<p class="report-note">No events in this report.</p>'
      : report.sections.map((s) => sectionHtml(s, showEventTitles)).join('');

  const bodyHtml = `
    <header class="report-header ls-header">
      <div>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <div class="report-subtitle">${escapeHtml(
          withDirector(`${report.tournament_name} · ${scopeLabel}`, report.director_name)
        )}</div>
      </div>
      <div class="report-meta">${escapeHtml(formatDateOnly())}</div>
    </header>
    <p class="report-note">Configured prize places — excludes side-action money.</p>
    ${sections}
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
      table.ls-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      table.fin-summary th { text-align: left; font-weight: 600; width: 60%; padding: 3px 4px; }
      table.fin-summary td { text-align: right; font-variant-numeric: tabular-nums; padding: 3px 4px; }
      table.fin-summary tr.ls-tot th,
      table.fin-summary tr.ls-tot td { font-weight: 700; border-top: 1.5px solid #1e3a5f; }
      table.ls-table thead th {
        font-size: 7pt; font-weight: 700; text-transform: uppercase;
        border-bottom: 2px solid #1e3a5f; text-align: left; padding: 2px 4px;
      }
      table.ls-table tbody td { font-size: 8pt; padding: 3px 4px; border-bottom: 0.5px solid #e5e7eb; }
      table.ls-table td.col-money, table.ls-table th.col-money { text-align: right; }
      .ls-event-title { font-size: 11pt; margin: 12px 0 6px; }
      .report-note { font-size: 8pt; color: #4b5563; margin: 0 0 8px; }
      .ls-empty { text-align: center; color: #6b7280; }
      .pf-bowlers { font-size: 7pt; color: #4b5563; margin-top: 1px; }
    </style>
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    pageSize: 'letter portrait',
    pageMargin: '0.4in',
    bodyClass: 'standings-lane-sheet',
  });
}
