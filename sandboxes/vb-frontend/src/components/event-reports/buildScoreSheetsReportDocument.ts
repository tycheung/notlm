import type {
  ScoreSheetBowlerRow,
  ScoreSheetGameHeader,
  ScoreSheetPanel,
  ScoreSheetPage,
  ScoreSheetRrMatchRow,
  ScoreSheetsReport,
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

function fmtAvg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '';
  return String(Math.round(Number(value)));
}

function fmtHcp(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '';
  return String(Math.round(Number(value)));
}

function gameHeaderCell(game: ScoreSheetGameHeader): string {
  return `<th class="ss-g"><span class="ss-g-num">${escapeHtml(
    String(game.game_number)
  )}</span></th>`;
}

function laneRow(games: ScoreSheetGameHeader[], includeIndivHcp: boolean): string {
  const cells = games
    .map((g) => {
      const lane = g.lane_label?.trim() || '';
      return `<td class="ss-lane-cell">${lane ? escapeHtml(lane) : '&nbsp;'}</td>`;
    })
    .join('');
  return `<tr class="ss-lane-row">
    <td colspan="${includeIndivHcp ? 3 : 2}" class="ss-lane-label">Lane</td>
    ${cells}
    <td class="ss-lane-cell">&nbsp;</td>
  </tr>`;
}

function bowlerRow(
  row: ScoreSheetBowlerRow,
  gameCount: number,
  includeIndivHcp: boolean
): string {
  const scoreCells = Array.from({ length: gameCount }, () => '<td class="ss-score">&nbsp;</td>').join(
    ''
  );
  return `<tr class="${row.is_blank_row ? 'ss-blank' : ''}">
    <td class="ss-avg">${escapeHtml(fmtAvg(row.qualifying_average))}</td>
    <td class="ss-name">${escapeHtml(row.display_name)}</td>
    ${
      includeIndivHcp
        ? `<td class="ss-hcp">${escapeHtml(fmtHcp(row.handicap))}</td>`
        : ''
    }
    ${scoreCells}
    <td class="ss-total">&nbsp;</td>
  </tr>`;
}

function panelHtml(panel: ScoreSheetPanel, report: ScoreSheetsReport): string {
  const games = panel.games;
  const n = games.length;
  const includeIndiv = report.include_individual_handicap;
  const includeTeam = report.include_team_handicap && panel.is_team;
  const metaBits = [
    panel.team_average != null ? `Avg=${fmtAvg(panel.team_average)}` : null,
    panel.squad_name ? `Squad ${panel.squad_name}` : null,
    panel.home_lane_label ? `Lane ${panel.home_lane_label}` : null,
  ].filter(Boolean);

  const gameHeads = games.map(gameHeaderCell).join('');
  const lanes = laneRow(games, includeIndiv);
  const bowlerRows = (panel.bowlers.length ? panel.bowlers : [{ display_name: '', is_blank_row: true }])
    .map((b) => bowlerRow(b as ScoreSheetBowlerRow, n, includeIndiv))
    .join('');

  const emptyScores = Array.from({ length: n }, () => '<td class="ss-score">&nbsp;</td>').join(
    ''
  );
  const teamHcpScores = Array.from({ length: n }, () => {
    const v = includeTeam ? fmtHcp(panel.team_handicap) : '';
    return `<td class="ss-score ss-prefill">${escapeHtml(v)}</td>`;
  }).join('');

  const footer = `
    <tr class="ss-foot">
      <td colspan="${includeIndiv ? 3 : 2}" class="ss-foot-label">Total</td>
      ${emptyScores}
      <td class="ss-total">&nbsp;</td>
    </tr>
    ${
      includeTeam
        ? `<tr class="ss-foot">
            <td colspan="${includeIndiv ? 3 : 2}" class="ss-foot-label">Handicap</td>
            ${teamHcpScores}
            <td class="ss-total">&nbsp;</td>
          </tr>
          <tr class="ss-foot ss-foot-strong">
            <td colspan="${includeIndiv ? 3 : 2}" class="ss-foot-label">HDCP Total</td>
            ${emptyScores}
            <td class="ss-total">&nbsp;</td>
          </tr>`
        : ''
    }
  `;

  return `
    <section class="ss-panel">
      <div class="ss-panel-head">
        <div class="ss-panel-title">${escapeHtml(panel.title)}</div>
        <div class="ss-panel-meta">${escapeHtml(metaBits.join(' · '))}</div>
      </div>
      <table class="ss-grid">
        <thead>
          <tr>
            <th class="ss-avg">Avg</th>
            <th class="ss-name">Name</th>
            ${includeIndiv ? '<th class="ss-hcp">HDCP</th>' : ''}
            ${gameHeads}
            <th class="ss-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lanes}
          ${bowlerRows}
          ${footer}
        </tbody>
      </table>
      <div class="ss-approve">Approved: ____________________________</div>
    </section>
  `;
}

function rrMatchRowHtml(row: ScoreSheetRrMatchRow, showBowlerCol: boolean): string {
  const gameLabel = row.is_game_start ? `Game ${row.game_number}` : '';
  const laneLabel = row.is_game_start ? row.lane_label?.trim() || '' : '';
  const laneText = laneLabel
    ? laneLabel.toLowerCase().startsWith('lane')
      ? laneLabel
      : `Lane ${laneLabel}`
    : '';
  const gameBlank = row.is_game_start ? '&nbsp;' : '';
  return `<tr class="${row.is_game_start ? 'ss-rr-game-start' : 'ss-rr-game-cont'}">
    <td class="ss-rr-game">${escapeHtml(gameLabel)}</td>
    <td class="ss-rr-lane">${laneText ? escapeHtml(laneText) : '&nbsp;'}</td>
    ${
      showBowlerCol
        ? `<td class="ss-rr-bowler">${escapeHtml(row.bowler_name?.trim() || '')}</td>`
        : ''
    }
    <td class="ss-rr-score">&nbsp;</td>
    <td class="ss-rr-score">${gameBlank}</td>
    <td class="ss-rr-bonus">${gameBlank}</td>
    <td class="ss-rr-total">${gameBlank}</td>
    <td class="ss-rr-diff">${gameBlank}</td>
    <td class="ss-rr-opp">${gameBlank}</td>
  </tr>`;
}

function rrPanelHtml(panel: ScoreSheetPanel, report: ScoreSheetsReport): string {
  const rows = panel.match_rows || [];
  const showBowlerCol = Boolean(report.scores_per_game && report.scores_per_game > 1);
  // Compact chrome: no duplicate team title, no bonus legend (desk knows the amounts).
  const metaBits = [
    report.is_baker ? 'Baker' : null,
    panel.squad_name ? `Squad ${panel.squad_name}` : null,
    panel.home_lane_label ? `Home ${panel.home_lane_label}` : null,
  ].filter(Boolean);
  const colCount = showBowlerCol ? 9 : 8;

  const body =
    rows.length === 0
      ? `<tr><td colspan="${colCount}" class="ss-empty">No games.</td></tr>`
      : rows.map((r) => rrMatchRowHtml(r, showBowlerCol)).join('');

  return `
    <section class="ss-panel ss-rr-panel">
      ${
        metaBits.length
          ? `<div class="ss-panel-head ss-rr-meta-only">
              <div class="ss-panel-meta">${escapeHtml(metaBits.join(' · '))}</div>
            </div>`
          : ''
      }
      <table class="ss-rr-grid">
        <thead>
          <tr>
            <th class="ss-rr-game"></th>
            <th class="ss-rr-lane"></th>
            ${showBowlerCol ? '<th class="ss-rr-bowler">Bowler</th>' : ''}
            <th class="ss-rr-score">Score</th>
            <th class="ss-rr-score">Opponent Score</th>
            <th class="ss-rr-bonus">Bonus Pins</th>
            <th class="ss-rr-total">Total Score</th>
            <th class="ss-rr-diff">+/-</th>
            <th class="ss-rr-opp">Opponent Initials</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
      <div class="ss-approve">Approved: ____________________________</div>
    </section>
  `;
}

function sheetHtml(
  sheet: ScoreSheetPage,
  report: ScoreSheetsReport,
  isLast: boolean
): string {
  const isRr = report.layout === 'round_robin';
  const dual = !isRr && sheet.panels.length >= 2;
  const panels = sheet.panels
    .map((p) => (isRr ? rrPanelHtml(p, report) : panelHtml(p, report)))
    .join('');
  const subtitleParts = [
    report.tournament_name,
    report.event_name,
    `Round ${report.round_number}`,
    report.squad_name,
    sheet.pair_label ? `Lanes ${sheet.pair_label}` : null,
  ];
  // Grid sheets keep game-range in the subtitle; RR omits it (rows already list games).
  if (!isRr) {
    subtitleParts.push(
      sheet.game_start !== sheet.game_end
        ? `Games ${sheet.game_start}–${sheet.game_end}`
        : `Game ${sheet.game_start}`
    );
  }
  const subtitle = withDirector(
    subtitleParts.filter(Boolean).join(' · '),
    report.director_name
  );
  const date = formatDateOnly();

  return `
    <section class="ss-page${isLast ? ' ss-page-last' : ''}${dual ? ' ss-dual' : ''}${
      isRr ? ' ss-rr-page' : ''
    }">
      <header class="ss-page-header${isRr ? ' ss-rr-header' : ''}">
        <div class="ss-page-header-main">
          <div class="ss-page-title-row">
            <h1 class="ss-page-title">${escapeHtml(sheet.title)}</h1>
            <div class="ss-page-date">${escapeHtml(date)}</div>
          </div>
          <div class="ss-page-sub">${escapeHtml(subtitle)}</div>
        </div>
      </header>
      <div class="ss-panels">${panels || '<p class="ss-empty">No entries.</p>'}</div>
      ${
        isRr
          ? ''
          : `<p class="ss-captain-note">Captains: turn in to the tournament desk after signing.</p>`
      }
      ${reportFooterHtml()}
    </section>
  `;
}

function gridStyles(): string {
  return `
      body.score-sheets-print {
        width: 10in;
        max-width: 100%;
        margin: 0 auto;
        padding: 0;
        box-sizing: border-box;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #111;
      }
      .ss-page {
        box-sizing: border-box;
        min-height: 7.2in;
        display: flex;
        flex-direction: column;
        page-break-after: always;
        break-after: page;
        padding: 0.05in 0 0.15in;
      }
      .ss-page-last { page-break-after: auto; break-after: auto; }
      .ss-page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
        border-bottom: 2px solid #1e3a5f;
        padding-bottom: 4px;
      }
      .ss-page-header-main { flex: 1 1 auto; min-width: 0; }
      .ss-page-title-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
      }
      .ss-page-title { font-size: 13pt; margin: 0; font-weight: 700; }
      .ss-page-sub { font-size: 8pt; color: #374151; margin-top: 2px; }
      .ss-page-date { font-size: 8pt; color: #374151; white-space: nowrap; }
      .ss-panels { flex: 1 1 auto; display: flex; gap: 10px; align-items: stretch; }
      .ss-dual .ss-panels > .ss-panel { flex: 1 1 50%; min-width: 0; }
      .ss-panel { display: flex; flex-direction: column; min-width: 0; }
      .ss-panel-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
        align-items: baseline;
      }
      .ss-panel-title { font-size: 10pt; font-weight: 700; }
      .ss-panel-meta { font-size: 7.5pt; color: #4b5563; text-align: right; }
      table.ss-grid {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      table.ss-grid thead th {
        font-size: 7pt;
        font-weight: 700;
        text-transform: uppercase;
        border: 1px solid #1e3a5f;
        background: #f3f4f6;
        padding: 2px 2px 3px;
        text-align: center;
        vertical-align: bottom;
      }
      table.ss-grid tbody td {
        font-size: 8.5pt;
        border: 1px solid #9ca3af;
        padding: 4px 3px;
        height: 0.28in;
        vertical-align: middle;
      }
      th.ss-avg, td.ss-avg { width: 0.42in; text-align: center; }
      th.ss-name, td.ss-name { text-align: left; width: auto; }
      th.ss-hcp, td.ss-hcp { width: 0.42in; text-align: center; }
      th.ss-g {
        width: 0.58in;
        text-transform: none;
      }
      .ss-g-num {
        display: block;
        font-size: 8pt;
        font-weight: 700;
        line-height: 1.1;
      }
      tr.ss-lane-row td {
        background: #fff5f5;
        border: 1px solid #1e3a5f;
        height: 0.22in;
        padding: 2px 2px;
        vertical-align: middle;
      }
      td.ss-lane-label {
        text-align: right;
        font-size: 7.5pt;
        font-weight: 700;
        text-transform: uppercase;
        color: #c1121f;
      }
      td.ss-lane-cell {
        text-align: center;
        font-size: 8pt;
        font-weight: 700;
        color: #c1121f;
        font-variant-numeric: tabular-nums;
      }
      th.ss-total, td.ss-total { width: 0.55in; text-align: center; }
      td.ss-score { text-align: center; }
      td.ss-prefill { font-variant-numeric: tabular-nums; color: #111; }
      tr.ss-blank td { height: 0.28in; }
      tr.ss-foot td { background: #fafafa; }
      tr.ss-foot-strong td { font-weight: 700; border-top: 1.5px solid #1e3a5f; }
      td.ss-foot-label { text-align: right; font-weight: 600; font-size: 7.5pt; text-transform: uppercase; }
      .ss-approve {
        margin-top: 6px;
        font-size: 7.5pt;
        color: #374151;
      }
      .ss-captain-note {
        margin: 8px 0 0;
        font-size: 7.5pt;
        color: #4b5563;
        text-align: center;
      }
      .ss-empty { text-align: center; color: #6b7280; font-size: 9pt; }
      .ss-page .report-footer { margin-top: 6px; padding-top: 4px; }
      @media print {
        .ss-page { min-height: 0; }
      }
  `;
}

function rrStyles(): string {
  return `
      body.score-sheets-print.ss-rr-print {
        width: 8in;
        max-width: 100%;
        margin: 0 auto;
        padding: 0 !important;
        box-sizing: border-box;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #111;
      }
      .ss-rr-page {
        min-height: 0;
        padding: 0;
        page-break-after: always;
        break-after: page;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }
      .ss-rr-page.ss-page-last { page-break-after: auto; break-after: auto; }
      .ss-rr-header {
        display: block;
        margin: 0 0 4px;
        padding: 0 0 3px;
        border-bottom: 1.5px solid #1e3a5f;
      }
      .ss-rr-header .ss-page-title-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 8px;
      }
      .ss-rr-header .ss-page-title {
        font-size: 11pt;
        margin: 0;
        font-weight: 700;
        line-height: 1.15;
      }
      .ss-rr-header .ss-page-date {
        font-size: 7.5pt;
        color: #374151;
        white-space: nowrap;
        flex: 0 0 auto;
      }
      .ss-rr-header .ss-page-sub {
        font-size: 7pt;
        color: #374151;
        margin-top: 1px;
        line-height: 1.2;
      }
      .ss-rr-page .ss-panels {
        display: block;
        flex: 1 1 auto;
      }
      .ss-rr-meta-only {
        margin: 0 0 2px;
        justify-content: flex-start;
      }
      .ss-rr-meta-only .ss-panel-meta {
        text-align: left;
        font-size: 7pt;
      }
      table.ss-rr-grid {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      table.ss-rr-grid thead th {
        font-size: 6.5pt;
        font-weight: 700;
        text-transform: uppercase;
        border: 1px solid #1e3a5f;
        background: #f3f4f6;
        padding: 1px 2px;
        text-align: center;
        line-height: 1.1;
      }
      table.ss-rr-grid tbody td {
        font-size: 8pt;
        border: 1px solid #9ca3af;
        padding: 0 3px;
        height: 0.22in;
        max-height: 0.22in;
        vertical-align: middle;
        line-height: 1.1;
      }
      th.ss-rr-game, td.ss-rr-game { width: 0.62in; text-align: left; font-weight: 600; }
      th.ss-rr-lane, td.ss-rr-lane {
        width: 0.62in;
        text-align: left;
        color: #c1121f;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      th.ss-rr-bowler, td.ss-rr-bowler { width: 1in; text-align: left; font-size: 7pt; }
      th.ss-rr-score, td.ss-rr-score { width: 0.68in; text-align: center; }
      th.ss-rr-bonus, td.ss-rr-bonus { width: 0.62in; text-align: center; }
      th.ss-rr-total, td.ss-rr-total { width: 0.68in; text-align: center; }
      th.ss-rr-diff, td.ss-rr-diff { width: 0.48in; text-align: center; }
      th.ss-rr-opp, td.ss-rr-opp {
        width: 0.82in;
        text-align: center;
        font-weight: 600;
      }
      tr.ss-rr-game-start td { border-top: 1px solid #1e3a5f; }
      .ss-rr-page .ss-approve {
        margin-top: 3px;
        font-size: 7pt;
      }
      .ss-rr-page .report-footer {
        margin-top: 2px;
        padding-top: 2px;
      }
      .ss-rr-page .report-footer svg {
        width: 28px;
        height: 20px;
      }
      @media print {
        body.score-sheets-print.ss-rr-print { padding: 0 !important; }
        .ss-rr-page { min-height: 0; }
      }
  `;
}

export function buildScoreSheetsReportDocument(
  report: ScoreSheetsReport
): ReportDocument {
  const title = 'Score Sheets';
  const isRr = report.layout === 'round_robin';
  const filename = reportSuggestedFilename(
    'score_sheets',
    report.tournament_name,
    report.event_name,
    `r${report.round_number}`,
    report.layout
  );
  const sheets =
    report.sheets.length === 0
      ? `<section class="ss-page ss-page-last${isRr ? ' ss-rr-page' : ''}">
          <header class="ss-page-header${isRr ? ' ss-rr-header' : ''}">
            <div class="ss-page-header-main">
              <div class="ss-page-title-row">
                <h1 class="ss-page-title">${escapeHtml(title)}</h1>
                <div class="ss-page-date">${escapeHtml(formatDateOnly())}</div>
              </div>
              <div class="ss-page-sub">${escapeHtml(
                withDirector(
                  `${report.tournament_name} · ${report.event_name} · Round ${report.round_number}`,
                  report.director_name
                )
              )}</div>
            </div>
          </header>
          <p class="ss-empty">No approved entries for this round/squad.</p>
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
      ${isRr ? rrStyles() : gridStyles()}
    </style>
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    pageSize: isRr ? 'letter' : 'letter landscape',
    pageMargin: isRr ? '0.25in' : '0.35in',
    bodyClass: isRr ? 'score-sheets-print ss-rr-print' : 'score-sheets-print',
  });
}
