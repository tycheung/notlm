import type { EventRosterReport } from '../../api/event-reports';
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

function formatAvg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function buildEventRosterReportDocument(report: EventRosterReport): ReportDocument {
  const title = report.include_checkin ? 'Event Roster / Check-in' : 'Event Roster';
  const filename = reportSuggestedFilename(
    'roster',
    report.tournament_name,
    report.event_name,
    report.scope === 'squad' ? report.squad_name : 'event'
  );

  const subtitleParts = [
    report.tournament_name,
    report.event_name,
    report.scope === 'squad' ? report.squad_name : null,
  ].filter(Boolean);

  const showTeam = report.event_format === 'teams';
  const colCount =
    2 +
    (report.include_usbc ? 1 : 0) +
    (report.include_average ? 1 : 0) +
    (report.include_handicap ? 1 : 0) +
    (showTeam ? 1 : 0) +
    1 +
    (report.include_lane ? 1 : 0) +
    (report.include_paid ? 2 : 0) +
    (report.include_checkin ? 1 : 0);

  const headerCells = [
    '<th class="col-num">#</th>',
    '<th class="col-name">Bowler</th>',
    report.include_usbc ? '<th class="col-usbc">USBC</th>' : '',
    report.include_average ? '<th class="col-avg">Avg</th>' : '',
    report.include_handicap ? '<th class="col-hcp">HCP</th>' : '',
    showTeam ? '<th class="col-team">Team</th>' : '',
    '<th class="col-squad">Squad</th>',
    report.include_lane ? '<th class="col-lane">Lane</th>' : '',
    report.include_paid ? '<th class="col-money">Paid</th>' : '',
    report.include_paid ? '<th class="col-money">Due</th>' : '',
    report.include_checkin ? '<th class="col-check">In</th>' : '',
  ]
    .filter(Boolean)
    .join('');

  const body =
    report.rows.length === 0
      ? `<tr><td colspan="${colCount}" class="ls-empty">No registered bowlers.</td></tr>`
      : report.rows
          .map((row, idx) => {
            const name =
              row.is_reentry && row.entry_number > 1
                ? `${row.display_name} (R${row.entry_number})`
                : row.display_name;
            const lane = row.pair_label || (row.assigned_lane != null ? String(row.assigned_lane) : '—');
            const checkClass = row.checked_in ? ' ls-checked' : '';
            const checkMark = row.checked_in ? '✓' : '';
            const trClass = (idx + 1) % 10 === 0 ? ' class="ls-guide"' : '';
            return `<tr${trClass}>
              <td class="col-num">${escapeHtml(String(row.entry_number))}</td>
              <td class="col-name">${escapeHtml(name || '—')}</td>
              ${
                report.include_usbc
                  ? `<td class="col-usbc">${escapeHtml(row.usbc_id || '—')}</td>`
                  : ''
              }
              ${
                report.include_average
                  ? `<td class="col-avg">${escapeHtml(formatAvg(row.qualifying_average))}</td>`
                  : ''
              }
              ${
                report.include_handicap
                  ? `<td class="col-hcp">${escapeHtml(
                      row.handicap != null ? String(row.handicap) : '—'
                    )}</td>`
                  : ''
              }
              ${showTeam ? `<td class="col-team">${escapeHtml(row.team_name || '—')}</td>` : ''}
              <td class="col-squad">${escapeHtml(row.squad_name || '—')}</td>
              ${report.include_lane ? `<td class="col-lane">${escapeHtml(lane)}</td>` : ''}
              ${
                report.include_paid
                  ? `<td class="col-money">${escapeHtml(formatMoneyOrDash(row.paid_amount))}</td>`
                  : ''
              }
              ${
                report.include_paid
                  ? `<td class="col-money">${escapeHtml(formatMoneyOrDash(row.balance_due))}</td>`
                  : ''
              }
              ${
                report.include_checkin
                  ? `<td class="col-check"><span class="ls-checkbox${checkClass}">${checkMark}</span></td>`
                  : ''
              }
            </tr>`;
          })
          .join('');

  const bodyHtml = `
    <header class="report-header ls-header">
      <div>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <div class="report-subtitle">${escapeHtml(withDirector(subtitleParts.join(' · '), report.director_name))}</div>
      </div>
      <div class="report-meta">${escapeHtml(formatDateOnly())} · ${report.rows.length} entries</div>
    </header>
    <table class="ls-table roster-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${body}</tbody>
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
      body.standings-lane-sheet .ls-header {
        margin-bottom: 10px;
        padding-bottom: 6px;
      }
      body.standings-lane-sheet .report-title { font-size: 14pt; }
      body.standings-lane-sheet .report-subtitle { font-size: 9pt; }
      body.standings-lane-sheet .report-meta { font-size: 8.5pt; }
      table.ls-table {
        width: 100%;
        border-collapse: collapse;
      }
      table.ls-table thead th {
        font-size: 7pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        border-bottom: 2px solid #1e3a5f;
        background: #fff;
        white-space: nowrap;
        text-align: left;
        padding: 2px 4px;
      }
      table.ls-table tbody td {
        font-size: 8pt;
        padding: 3px 4px;
        border-bottom: 0.5px solid #e5e7eb;
        font-variant-numeric: tabular-nums;
      }
      table.ls-table tbody tr.ls-guide td {
        border-bottom: 1.5px solid #9ca3af;
      }
      table.ls-table td.col-num,
      table.ls-table th.col-num,
      table.ls-table td.col-avg,
      table.ls-table th.col-avg,
      table.ls-table td.col-hcp,
      table.ls-table th.col-hcp,
      table.ls-table td.col-lane,
      table.ls-table th.col-lane,
      table.ls-table td.col-money,
      table.ls-table th.col-money {
        text-align: right;
        white-space: nowrap;
      }
      table.ls-table td.col-check,
      table.ls-table th.col-check {
        text-align: center;
      }
      .ls-checkbox {
        display: inline-block;
        width: 11pt;
        height: 11pt;
        border: 1.25px solid #1e3a5f;
        line-height: 10pt;
        font-size: 9pt;
        text-align: center;
        vertical-align: middle;
      }
      .ls-checkbox.ls-checked {
        font-weight: 700;
      }
      .ls-empty { text-align: center; color: #6b7280; padding: 12px !important; }
      @media print {
        table.ls-table thead { display: table-header-group; }
        table.ls-table tr { page-break-inside: avoid; }
      }
    </style>
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    pageSize: 'letter portrait',
    pageMargin: '0.4in',
    bodyClass: 'standings-lane-sheet',
  });
}
