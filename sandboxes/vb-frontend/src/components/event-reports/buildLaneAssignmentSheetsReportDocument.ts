import type {
  LaneAssignmentSheetPage,
  LaneAssignmentSheetsReport,
  LaneAssignmentUnit,
} from '../../api/event-reports';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatDateOnly,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../utils/sideActionReportPrint';

function unitRow(unit: LaneAssignmentUnit): string {
  const cells = unit.games
    .map((g) => {
      const label = g.lane_label?.trim() || '';
      const cls = g.is_position_round ? 'la-cell la-pos' : 'la-cell';
      return `<td class="${cls}">${label ? escapeHtml(label) : '&nbsp;'}</td>`;
    })
    .join('');
  const home = unit.home_lane_label?.trim() || '';
  return `<tr>
    <td class="la-name">${escapeHtml(unit.title)}</td>
    <td class="la-home">${home ? escapeHtml(home) : '&nbsp;'}</td>
    ${cells}
  </tr>`;
}

function sheetHtml(
  sheet: LaneAssignmentSheetPage,
  report: LaneAssignmentSheetsReport,
  isLast: boolean
): string {
  const games = sheet.units[0]?.games ?? [];
  const nameHeader = report.event_format === 'teams' ? 'Team' : 'Bowler';
  const heads = games
    .map((g) => {
      const star = g.is_position_round ? '*' : '';
      return `<th class="la-g">G${escapeHtml(String(g.game_number))}${star}</th>`;
    })
    .join('');
  const body =
    sheet.units.length === 0
      ? `<tr><td colspan="${games.length + 2}" class="la-empty">No seated entries.</td></tr>`
      : sheet.units.map(unitRow).join('');

  const subtitle = withDirector(
    [
      report.tournament_name,
      report.event_name,
      `Round ${report.round_number}`,
      report.squad_name,
      report.movement_label,
      sheet.game_start !== sheet.game_end
        ? `Games ${sheet.game_start}–${sheet.game_end}`
        : `Game ${sheet.game_start}`,
    ]
      .filter(Boolean)
      .join(' · '),
    report.director_name
  );

  const posNote =
    report.position_round_game != null
      ? `<p class="la-note">* Game ${escapeHtml(
          String(report.position_round_game)
        )} is the position round — lane blank until place assignment is stamped.</p>`
      : '';

  return `
    <section class="la-page${isLast ? ' la-page-last' : ''}">
      <header class="la-header">
        <div class="la-header-main">
          <div class="la-title-row">
            <h1 class="la-title">${escapeHtml(sheet.title)}</h1>
            <div class="la-date">${escapeHtml(formatDateOnly())}</div>
          </div>
          <div class="la-sub">${escapeHtml(subtitle)}</div>
        </div>
      </header>
      ${posNote}
      <table class="la-grid">
        <thead>
          <tr>
            <th class="la-name">${escapeHtml(nameHeader)}</th>
            <th class="la-home">Home</th>
            ${heads}
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
      ${reportFooterHtml()}
    </section>
  `;
}

export function buildLaneAssignmentSheetsReportDocument(
  report: LaneAssignmentSheetsReport
): ReportDocument {
  const title = 'Lane Assignments';
  const filename = reportSuggestedFilename(
    'lane_assignments',
    report.tournament_name,
    report.event_name,
    `r${report.round_number}`
  );
  const sheets =
    report.sheets.length === 0
      ? `<section class="la-page la-page-last">
          <header class="la-header">
            <div class="la-header-main">
              <div class="la-title-row">
                <h1 class="la-title">${escapeHtml(title)}</h1>
                <div class="la-date">${escapeHtml(formatDateOnly())}</div>
              </div>
              <div class="la-sub">${escapeHtml(
                withDirector(
                  `${report.tournament_name} · ${report.event_name} · Round ${report.round_number}`,
                  report.director_name
                )
              )}</div>
            </div>
          </header>
          <p class="la-empty">No approved entries for this round/squad.</p>
          ${reportFooterHtml()}
        </section>`
      : report.sheets
          .map((sheet, idx) =>
            sheetHtml(sheet, report, idx === report.sheets.length - 1)
          )
          .join('');

  const bodyHtml = `
    ${sheets}
    <style>
      body.lane-assignment-sheets-print {
        width: 10in;
        max-width: 100%;
        margin: 0 auto;
        padding: 0 !important;
        box-sizing: border-box;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #111;
      }
      .la-page {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        page-break-after: always;
        break-after: page;
        padding: 0;
      }
      .la-page-last { page-break-after: auto; break-after: auto; }
      .la-header {
        margin: 0 0 6px;
        padding: 0 0 4px;
        border-bottom: 2px solid #1e3a5f;
      }
      .la-title-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
      }
      .la-title { font-size: 12pt; margin: 0; font-weight: 700; }
      .la-date { font-size: 8pt; color: #374151; white-space: nowrap; }
      .la-sub { font-size: 7.5pt; color: #374151; margin-top: 2px; }
      .la-note { font-size: 7.5pt; color: #4b5563; margin: 0 0 6px; }
      table.la-grid {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      table.la-grid thead th {
        font-size: 7pt;
        font-weight: 700;
        text-transform: uppercase;
        border: 1px solid #1e3a5f;
        background: #f3f4f6;
        padding: 3px 2px;
        text-align: center;
      }
      table.la-grid tbody td {
        font-size: 8pt;
        border: 1px solid #9ca3af;
        padding: 3px 4px;
        height: 0.24in;
        vertical-align: middle;
      }
      th.la-name, td.la-name {
        text-align: left;
        width: 1.6in;
        font-weight: 600;
      }
      th.la-home, td.la-home {
        width: 0.55in;
        text-align: center;
        color: #c1121f;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      th.la-g { text-transform: none; width: auto; }
      td.la-cell {
        text-align: center;
        font-weight: 700;
        color: #c1121f;
        font-variant-numeric: tabular-nums;
      }
      td.la-pos { background: #fff7ed; }
      .la-empty { text-align: center; color: #6b7280; font-size: 9pt; }
      .la-page .report-footer { margin-top: 6px; padding-top: 4px; }
      @media print {
        body.lane-assignment-sheets-print { padding: 0 !important; }
      }
    </style>
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    pageSize: 'letter landscape',
    pageMargin: '0.35in',
    bodyClass: 'lane-assignment-sheets-print',
  });
}
