import type { HighGameReport } from '../../../api/side-actions';
import { competitorColumnLabel } from '../../../features/side-actions/competitorLabel';
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
} from '../../../utils/sideActionReportPrint';

/** Cash winners only — finish place can be set for every scored entrant. */
function winnerRows(
  rows: HighGameReport['sections'][number]['rows']
): HighGameReport['sections'][number]['rows'] {
  return (rows || []).filter((r) => Number(r.payout) > 0);
}

function sectionsForDocument(report: HighGameReport): HighGameReport['sections'] {
  const source = report.sections || [];
  if (report.list_mode !== 'winners') return source;
  return source
    .map((section) => ({ ...section, rows: winnerRows(section.rows) }))
    .filter((section) => section.rows.length > 0);
}

/**
 * Short lists (winners / compact pools) share a multi-column page.
 * Long "all entrants" lists stack full-width and flow naturally across pages.
 */
function shouldUseDenseGrid(
  sections: HighGameReport['sections'],
  listMode: HighGameReport['list_mode']
): boolean {
  if (!sections.length) return false;
  if (listMode === 'winners') return true;
  const maxRows = Math.max(...sections.map((s) => s.rows.length), 0);
  return maxRows <= 10 && sections.length <= 6;
}

function sectionTable(
  section: HighGameReport['sections'][number],
  payoutMode: string,
  competitorLabel: string
): string {
  const showGameCol = payoutMode === 'combined';
  const rows =
    section.rows.length === 0
      ? `<tr><td colspan="${showGameCol ? 5 : 4}" class="hg-empty">No rows</td></tr>`
      : section.rows
          .map(
            (r) => `<tr>
              <td class="col-place">${r.place != null ? r.place : '—'}</td>
              <td class="col-name">${escapeHtml(r.display_name || '')}</td>
              ${
                showGameCol
                  ? `<td class="col-game">${r.game_number != null ? r.game_number : '—'}</td>`
                  : ''
              }
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
            <th class="col-name">${escapeHtml(competitorLabel)}</th>
            ${showGameCol ? '<th class="col-game">G</th>' : ''}
            <th class="col-score">Score</th>
            <th class="col-money">Pay</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </article>
  `;
}

export function buildHighGameReportDocument(report: HighGameReport): ReportDocument {
  const title = `High Game Report — ${report.side_action_name}`;
  const filename = reportSuggestedFilename(
    'High_Game_Report',
    report.side_action_name,
    report.event_name,
    formatFilenameDate()
  );
  const dateLabel = formatDateOnly();
  const sections = sectionsForDocument(report);
  const dense = shouldUseDenseGrid(sections, report.list_mode);
  const listLabel = report.list_mode === 'winners' ? 'Winners only' : 'All scored entrants';
  const gamesLabel = (report.selected_games || []).join(', ') || '—';
  const emptyNote =
    sections.length === 0
      ? `<p class="report-note">No standings to display for the selected games.</p>`
      : '';
  const gridClass = dense
    ? 'high-game-sections high-game-sections--grid'
    : 'high-game-sections high-game-sections--stack';

  // One print flow — dense 3-up grid keeps typical 3-game winner sheets on a single page.
  const bodyHtml = `
      <section class="high-game-report-page${dense ? ' high-game-report-page--dense' : ''}">
        <header class="report-header high-game-report-header">
          <div>
            <h1 class="report-title">${escapeHtml(report.side_action_name)}</h1>
            <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
            <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
            <div class="report-doc-label">High Game Report</div>
          </div>
          <div class="report-meta">
            <div>${escapeHtml(dateLabel)}</div>
          </div>
        </header>
        <p class="report-note high-game-report-note">
          ${escapeHtml(
            report.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap'
          )}
          · ${escapeHtml(
            report.payout_mode === 'combined' ? 'Combined list' : 'Per game'
          )}
          · Games ${escapeHtml(gamesLabel)}
          · ${escapeHtml(listLabel)}
        </p>
        ${emptyNote}
        <div class="${gridClass}">
          ${sections.map((s) => sectionTable(s, report.payout_mode, competitorColumnLabel(report.entry_unit))).join('')}
        </div>
        ${reportFooterHtml()}
      </section>`;

  return buildReportDocument(title, bodyHtml, filename);
}
