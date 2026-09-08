import type { HighSetReport } from '../../../api/side-actions';
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

function winnerRows(
  rows: HighSetReport['sections'][number]['rows']
): HighSetReport['sections'][number]['rows'] {
  return (rows || []).filter((r) => Number(r.payout) > 0);
}

function sectionsForDocument(report: HighSetReport): HighSetReport['sections'] {
  const source = report.sections || [];
  if (report.list_mode !== 'winners') return source;
  return source
    .map((section) => ({ ...section, rows: winnerRows(section.rows) }))
    .filter((section) => section.rows.length > 0);
}

function sectionTable(
  section: HighSetReport['sections'][number],
  gameNumbers: number[],
  competitorLabel: string
): string {
  const gameHeaders = gameNumbers
    .map((g) => `<th class="col-score">G${g}</th>`)
    .join('');
  const colCount = 3 + gameNumbers.length + 1;
  const rows =
    section.rows.length === 0
      ? `<tr><td colspan="${colCount}" class="hg-empty">No rows</td></tr>`
      : section.rows
          .map((r) => {
            const gameCells = gameNumbers
              .map((g) => {
                const sc = r.game_scores?.[String(g)];
                return `<td class="col-score">${sc != null ? escapeHtml(String(sc)) : '—'}</td>`;
              })
              .join('');
            return `<tr>
              <td class="col-place">${r.place != null ? r.place : '—'}</td>
              <td class="col-name">${escapeHtml(r.display_name || '')}</td>
              ${gameCells}
              <td class="col-score">${escapeHtml(String(r.score ?? ''))}</td>
              <td class="col-money">${escapeHtml(formatMoney(r.payout))}</td>
            </tr>`;
          })
          .join('');

  return `
    <article class="high-game-section">
      <h2 class="high-game-section-title">${escapeHtml(section.label)}</h2>
      <table class="report-table high-game-standings-table">
        <thead>
          <tr>
            <th class="col-place">Pl</th>
            <th class="col-name">${escapeHtml(competitorLabel)}</th>
            ${gameHeaders}
            <th class="col-score">Series</th>
            <th class="col-money">Pay</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </article>
  `;
}

export function buildHighSetReportDocument(report: HighSetReport): ReportDocument {
  const title = `High Series Report — ${report.side_action_name}`;
  const filename = reportSuggestedFilename(
    'High_Series_Report',
    report.side_action_name,
    report.event_name,
    formatFilenameDate()
  );
  const dateLabel = formatDateOnly();
  const sections = sectionsForDocument(report);
  const listLabel = report.list_mode === 'winners' ? 'Winners only' : 'All scored entrants';
  const effectiveGames =
    sections.length === 1 && sections[0].game_numbers?.length
      ? sections[0].game_numbers
      : report.game_numbers || [];
  const gamesLabel = effectiveGames.join(', ') || '—';
  const emptyNote =
    sections.length === 0
      ? `<p class="report-note">No standings to display.</p>`
      : '';

  const bodyHtml = `
      <section class="high-game-report-page">
        <header class="report-header high-game-report-header">
          <div>
            <h1 class="report-title">${escapeHtml(report.side_action_name)}</h1>
            <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
            <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
            <div class="report-doc-label">High Series Report</div>
          </div>
          <div class="report-meta">
            <div>${escapeHtml(dateLabel)}</div>
          </div>
        </header>
        <p class="report-note high-game-report-note">
          ${escapeHtml(report.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap')}
          · ${escapeHtml(
            report.series_mode === 'best_n'
              ? `Best ${report.best_n} selected games`
              : 'Sum selected games'
          )}
          · Games ${escapeHtml(gamesLabel)}
          · ${escapeHtml(listLabel)}
        </p>
        ${emptyNote}
        <div class="high-game-sections high-game-sections--stack">
          ${sections
            .map((section) =>
              sectionTable(
                section,
                section.game_numbers?.length
                  ? section.game_numbers
                  : report.game_numbers || [],
                competitorColumnLabel(report.entry_unit)
              )
            )
            .join('')}
        </div>
        ${reportFooterHtml()}
      </section>`;

  return buildReportDocument(title, bodyHtml, filename);
}
