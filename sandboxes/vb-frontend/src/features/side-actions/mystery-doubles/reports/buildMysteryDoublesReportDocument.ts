import type { MysteryDoublesReport } from '../../../../api/side-actions';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatDateOnly,
  formatFilenameDate,
  formatMoney,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../../../utils/sideActionReportPrint';

function winnerRows(
  rows: MysteryDoublesReport['sections'][number]['rows']
): MysteryDoublesReport['sections'][number]['rows'] {
  return (rows || []).filter((r) => Number(r.payout) > 0);
}

function sectionsForDocument(
  report: MysteryDoublesReport
): MysteryDoublesReport['sections'] {
  const source = report.sections || [];
  if (report.list_mode !== 'winners') return source;
  return source
    .map((section) => ({ ...section, rows: winnerRows(section.rows) }))
    .filter((section) => section.rows.length > 0);
}

function sectionTable(section: MysteryDoublesReport['sections'][number]): string {
  const rows =
    section.rows.length === 0
      ? `<tr><td colspan="5" class="hg-empty">No rows</td></tr>`
      : section.rows
          .map(
            (r) => `<tr>
              <td class="col-place">${r.place != null ? r.place : '—'}</td>
              <td class="col-name">${escapeHtml(r.display_name || '')}</td>
              <td class="col-score">${escapeHtml(`${r.score_a} + ${r.score_b}`)}</td>
              <td class="col-score">${escapeHtml(String(r.score ?? ''))}</td>
              <td class="col-money">${escapeHtml(formatMoney(r.payout))}</td>
            </tr>`
          )
          .join('');

  return `
    <article class="high-game-section">
      <h2 class="high-game-section-title">${escapeHtml(section.label)}</h2>
      <table class="report-table high-game-standings-table">
        <thead>
          <tr>
            <th class="col-place">Pl</th>
            <th class="col-name">Team</th>
            <th class="col-score">Scores</th>
            <th class="col-score">Total</th>
            <th class="col-money">Pay</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </article>
  `;
}

export function buildMysteryDoublesReportDocument(
  report: MysteryDoublesReport
): ReportDocument {
  const title = `Mystery Doubles Report — ${report.side_action_name}`;
  const filename = reportSuggestedFilename(
    'Mystery_Doubles_Report',
    report.side_action_name,
    report.event_name,
    formatFilenameDate()
  );
  const dateLabel = formatDateOnly();
  const sections = sectionsForDocument(report);
  const listLabel =
    report.list_mode === 'winners' ? 'Winners only' : 'All paired teams';
  const warning = report.entrant_warning
    ? `<p class="report-note">${escapeHtml(report.entrant_warning)}</p>`
    : '';
  const emptyNote =
    !report.pairs_drawn
      ? `<p class="report-note">Pairs have not been drawn yet.</p>`
      : sections.length === 0
        ? `<p class="report-note">No standings to display.</p>`
        : '';

  const bodyHtml = `
      <section class="high-game-report-page">
        <header class="report-header high-game-report-header">
          <div>
            <h1 class="report-title">${escapeHtml(report.side_action_name)}</h1>
            <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
            <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
            <div class="report-doc-label">Mystery Doubles Report</div>
          </div>
          <div class="report-meta">
            <div>${escapeHtml(dateLabel)}</div>
          </div>
        </header>
        <p class="report-note high-game-report-note">
          ${escapeHtml(report.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap')}
          · Game ${report.game_number}
          · ${escapeHtml(listLabel)}
          · ${report.pairs_drawn ? 'Pairs drawn' : 'Pairs not drawn'}
        </p>
        ${warning}
        ${emptyNote}
        <div class="high-game-sections high-game-sections--stack">
          ${sections.map((section) => sectionTable(section)).join('')}
        </div>
        ${reportFooterHtml()}
      </section>`;

  return buildReportDocument(title, bodyHtml, filename);
}
