import type { EliminatorReport } from '../../../api/side-actions';
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

/** Dense letter page capacity for per-game pages layout. */
const PAGE_ROW_CAPACITY = 36;

function formatScore(score: number | null | undefined): string {
  if (score == null || Number.isNaN(Number(score))) return '';
  return String(score);
}

/** Lowest score among bowlers who advanced (cut games) or cashed (final). */
function thresholdScore(
  game: EliminatorReport['games'][number]
): number | null {
  const scored = (game.rows || []).filter((r) => r.score != null);
  if (!scored.length) return null;
  if (game.role === 'payout') {
    const paid = scored.filter((r) => Number(r.payout) > 0);
    if (!paid.length) return null;
    return Math.min(...paid.map((r) => Number(r.score)));
  }
  const advanced = scored.filter((r) => r.advanced);
  if (!advanced.length) return null;
  return Math.min(...advanced.map((r) => Number(r.score)));
}

function cutBanner(report: EliminatorReport): string {
  const chips = (report.games || [])
    .map((game) => {
      const score = thresholdScore(game);
      const label =
        game.role === 'payout'
          ? `Game ${game.game_number} low to cash`
          : `Game ${game.game_number} cut score`;
      const value = score != null ? String(score) : '—';
      const chipClass =
        game.role === 'payout' ? 'elim-cut-chip elim-cut-chip--final' : 'elim-cut-chip';
      return `<span class="${chipClass}">${escapeHtml(`${label}: ${value}`)}</span>`;
    })
    .join('');
  if (!chips) return '';
  return `
    <div class="elim-cut-banner">
      <div class="elim-cut-chips">${chips}</div>
    </div>
  `;
}

function reportHeader(report: EliminatorReport, dateLabel: string): string {
  return `
    <header class="report-header">
      <div>
        <h1 class="report-title">${escapeHtml(report.side_action_name)}</h1>
        <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
        <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
        <div class="report-doc-label">Eliminator Report</div>
      </div>
      <div class="report-meta">
        <div>${escapeHtml(dateLabel)}</div>
      </div>
    </header>
    ${cutBanner(report)}
    ${
      report.warning
        ? `<p class="report-note elim-warning">${escapeHtml(report.warning)}</p>`
        : ''
    }
  `;
}

function scoreCellClass(
  gameNumber: number,
  row: EliminatorReport['column_rows'][number],
  payoutGame: number
): string {
  const classes = ['elim-score'];
  if (row.eliminated_after_game === gameNumber) classes.push('elim-score--cut');
  if (
    gameNumber === payoutGame &&
    Number(row.payout) > 0 &&
    row.scores[String(gameNumber)] != null
  ) {
    classes.push('elim-score--paid');
  }
  return classes.join(' ');
}

function buildColumnsHtml(report: EliminatorReport): string {
  const games = report.game_numbers || [];

  // Tier boundaries (furthest_game changes) double as visual cut lines per desk sort.
  const rows = report.column_rows || [];
  const head = `
    <tr>
      <th class="elim-col-name">${escapeHtml(competitorColumnLabel(report.entry_unit))}</th>
      ${games
        .map(
          (g, idx) =>
            `${idx > 0 ? '<th class="elim-spacer" aria-hidden="true"></th>' : ''}<th class="elim-col-game">G${g}</th>`
        )
        .join('')}
      <th class="elim-spacer" aria-hidden="true"></th>
      <th class="elim-col-prize">Prize</th>
    </tr>
  `;

  const body = rows
    .map((row, idx) => {
      const prev = idx > 0 ? rows[idx - 1] : null;
      const tierBreak =
        prev != null && prev.furthest_game !== row.furthest_game
          ? ' elim-row--tier-break'
          : '';
      const cells = games
        .map((g, gIdx) => {
          const key = String(g);
          const played = row.scores[key] != null;
          const value = played ? formatScore(row.scores[key]) : '';
          return `${
            gIdx > 0 ? '<td class="elim-spacer" aria-hidden="true"></td>' : ''
          }<td class="${scoreCellClass(g, row, report.payout_game)}">${escapeHtml(value)}</td>`;
        })
        .join('');
      return `<tr class="elim-row${tierBreak}">
        <td class="elim-col-name">${escapeHtml(row.display_name || '')}</td>
        ${cells}
        <td class="elim-spacer" aria-hidden="true"></td>
        <td class="elim-col-prize">${escapeHtml(formatMoney(row.payout))}</td>
      </tr>`;
    })
    .join('');

  return `
    <section class="elim-report-page elim-report-page--columns">
      ${reportHeader(report, formatDateOnly())}
      <table class="report-table elim-columns-table">
        <thead>${head}</thead>
        <tbody>${
          body ||
          '<tr><td colspan="99" class="elim-empty">No scores yet</td></tr>'
        }</tbody>
      </table>
      ${reportFooterHtml()}
    </section>
  `;
}

function selectRowsForPagesGame(
  game: EliminatorReport['games'][number]
): EliminatorReport['games'][number]['rows'][] {
  const rows = game.rows || [];
  const isPayout = game.role === 'payout';
  const advancers = rows.filter((r) => r.advanced);
  const eliminated = rows.filter((r) => !r.advanced);

  if (isPayout) {
    // Everyone alive at final advances to payout consideration — multi-page OK.
    const pages: typeof rows[] = [];
    for (let i = 0; i < Math.max(1, rows.length); i += PAGE_ROW_CAPACITY) {
      pages.push(rows.slice(i, i + PAGE_ROW_CAPACITY));
    }
    if (!pages.length) pages.push([]);
    return pages;
  }

  if (rows.length <= PAGE_ROW_CAPACITY) {
    return [rows];
  }
  if (advancers.length <= PAGE_ROW_CAPACITY) {
    const remaining = PAGE_ROW_CAPACITY - advancers.length;
    return [[...advancers, ...eliminated.slice(0, remaining)]];
  }
  // Advancers alone need more than one page
  const pages: typeof rows[] = [];
  for (let i = 0; i < advancers.length; i += PAGE_ROW_CAPACITY) {
    pages.push(advancers.slice(i, i + PAGE_ROW_CAPACITY));
  }
  return pages;
}

function gamePageTable(
  game: EliminatorReport['games'][number],
  rows: EliminatorReport['games'][number]['rows'],
  pageIndex: number,
  pageCount: number,
  competitorLabel: string
): string {
  const isPayout = game.role === 'payout';
  const threshold = thresholdScore(game);
  const cutNote =
    game.role === 'cut'
      ? threshold != null
        ? `Cut score: ${threshold}`
        : 'Cut score: —'
      : threshold != null
        ? `Low to cash: ${threshold}`
        : 'Low to cash: —';
  const pageNote =
    pageCount > 1 ? ` · Page ${pageIndex + 1} of ${pageCount}` : '';

  let seenCutLine = false;
  const body = rows
    .map((r) => {
      const isCut = !r.advanced;
      const afterCut =
        game.role === 'cut' && isCut && !seenCutLine
          ? ((seenCutLine = true), ' elim-page-row--cut-line')
          : '';
      const scoreClass = [
        'elim-score',
        isCut ? 'elim-score--cut' : '',
        isPayout && Number(r.payout) > 0 ? 'elim-score--paid' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<tr class="elim-page-row${afterCut}${isCut ? ' elim-page-row--eliminated' : ''}">
        <td class="col-place">${r.place ?? r.rank ?? '—'}</td>
        <td class="col-name">${escapeHtml(r.display_name || '')}</td>
        <td class="${scoreClass}">${escapeHtml(formatScore(r.score))}</td>
        <td class="col-status">${escapeHtml(isCut ? 'Cut' : isPayout ? 'Final' : 'Advance')}</td>
        <td class="col-money">${escapeHtml(formatMoney(r.payout))}</td>
      </tr>`;
    })
    .join('');

  return `
    <article class="elim-game-page-block">
      <h2 class="elim-game-page-title">${escapeHtml(game.label)}</h2>
      <p class="report-note">${escapeHtml(cutNote)}${escapeHtml(pageNote)}</p>
      <table class="report-table elim-pages-table">
        <thead>
          <tr>
            <th class="col-place">Pl</th>
            <th class="col-name">${escapeHtml(competitorLabel)}</th>
            <th class="col-score">Score</th>
            <th class="col-status">Status</th>
            <th class="col-money">Pay</th>
          </tr>
        </thead>
        <tbody>${
          body || '<tr><td colspan="5" class="elim-empty">No scores yet</td></tr>'
        }</tbody>
      </table>
    </article>
  `;
}

function buildPagesHtml(report: EliminatorReport): string {
  const dateLabel = formatDateOnly();
  const sections: string[] = [];
  const games = report.games || [];

  games.forEach((game, gameIdx) => {
    const pages = selectRowsForPagesGame(game);
    pages.forEach((pageRows, pageIdx) => {
      const isFirstOverall = gameIdx === 0 && pageIdx === 0;
      sections.push(`
        <section class="elim-report-page elim-report-page--pages">
          ${
            isFirstOverall
              ? reportHeader(report, dateLabel)
              : `<div class="elim-page-continuation">
                  <div class="report-doc-label">${escapeHtml(report.side_action_name)} — continued</div>
                  ${cutBanner(report)}
                </div>`
          }
          ${gamePageTable(game, pageRows, pageIdx, pages.length, competitorColumnLabel(report.entry_unit))}
          ${reportFooterHtml()}
        </section>
      `);
    });
  });

  if (!sections.length) {
    sections.push(`
      <section class="elim-report-page elim-report-page--pages">
        ${reportHeader(report, dateLabel)}
        <p class="report-note">No game scores yet.</p>
        ${reportFooterHtml()}
      </section>
    `);
  }

  return sections.join('');
}

export function buildEliminatorReportDocument(report: EliminatorReport): ReportDocument {
  const title = `Eliminator Report — ${report.side_action_name}`;
  const filename = reportSuggestedFilename(
    'Eliminator_Report',
    report.side_action_name,
    report.event_name,
    formatFilenameDate()
  );
  const mode = report.display_mode === 'pages' ? 'pages' : 'columns';
  const scopedReports = report.sections?.length
    ? report.sections.map((section) => ({
        ...report,
        side_action_name: `${report.side_action_name} · ${section.squad_name}`,
        game_numbers: section.game_numbers,
        games: section.games,
        column_rows: section.column_rows,
        fund: section.fund,
        sections: [],
      }))
    : [report];
  const bodyHtml = scopedReports
    .map((scopedReport) =>
      mode === 'columns'
        ? buildColumnsHtml(scopedReport)
        : buildPagesHtml(scopedReport)
    )
    .join('');
  return buildReportDocument(title, bodyHtml, filename);
}
