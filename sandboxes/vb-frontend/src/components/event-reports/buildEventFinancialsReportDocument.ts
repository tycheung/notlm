import type { EventFinancialsReport } from '../../api/event-reports';
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

function houseCutLabel(report: EventFinancialsReport): string {
  if (report.house_cut_type === 'percentage') {
    return `House cut (${report.house_cut_percentage}%)`;
  }
  if (report.house_cut_type === 'dollars_per_entry') {
    return `House cut (${formatMoneyOrDash(report.house_cut_percentage)} / entry)`;
  }
  return 'House cut (flat)';
}

function lineageLabel(report: EventFinancialsReport): string {
  if (report.lineage_fee_mode === 'per_game') {
    const used = report.lineage_games;
    const max = report.lineage_max_games;
    const rate = formatMoneyOrDash(report.lineage_per_game);
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

export function buildEventFinancialsReportDocument(
  report: EventFinancialsReport
): ReportDocument {
  const title = 'Event Financials';
  const filename = reportSuggestedFilename(
    'event_financials',
    report.tournament_name,
    report.event_name
  );
  const prizeBody =
    report.prize_lines.length === 0
      ? '<tr><td colspan="2" class="ls-empty">No prize places configured.</td></tr>'
      : report.prize_lines
          .map(
            (line) =>
              `<tr>
                <td>${escapeHtml(line.place_label || `${line.place}`)}</td>
                <td class="col-money">${escapeHtml(formatMoneyOrDash(line.amount))}</td>
              </tr>`
          )
          .join('');

  const bodyHtml = `
    <header class="report-header ls-header">
      <div>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <div class="report-subtitle">${escapeHtml(
          withDirector(`${report.tournament_name} · ${report.event_name}`, report.director_name)
        )}</div>
      </div>
      <div class="report-meta">${escapeHtml(formatDateOnly())}</div>
    </header>
    <p class="report-note">Side action is excluded from this report.</p>
    <table class="ls-table fin-summary">
      <tbody>
        ${summaryRow('Approved entries', String(report.approved_entries))}
        ${summaryRow('Re-entries', String(report.reentry_count))}
        ${summaryRow('Entry fee', formatMoneyOrDash(report.entry_fee))}
        ${summaryRow('Entry fees billed', formatMoneyOrDash(report.entry_fees_billed))}
        ${summaryRow('Collected', formatMoneyOrDash(report.amount_collected))}
        ${summaryRow('Balance due', formatMoneyOrDash(report.balance_due))}
        ${summaryRow('Added money', formatMoneyOrDash(report.added_money))}
        ${summaryRow(houseCutLabel(report), formatMoneyOrDash(report.house_cut_total))}
        ${summaryRow(lineageLabel(report), formatMoneyOrDash(report.lineage_total))}
        ${summaryRow('Net prize pool', formatMoneyOrDash(report.net_prize_pool), true)}
        ${summaryRow('Prizes allocated', formatMoneyOrDash(report.prizes_allocated))}
        ${summaryRow('Unallocated', formatMoneyOrDash(report.unallocated))}
      </tbody>
    </table>
    ${
      report.lineage_bundled_in_house_cut
        ? '<p class="report-note">Lineage is not a separate line yet — it is included in house cut.</p>'
        : ''
    }
    <h2 class="ls-event-title">Prize places</h2>
    <table class="ls-table">
      <thead><tr><th>Place</th><th class="col-money">Amount</th></tr></thead>
      <tbody>${prizeBody}</tbody>
    </table>
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
    </style>
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    pageSize: 'letter portrait',
    pageMargin: '0.4in',
    bodyClass: 'standings-lane-sheet',
  });
}
