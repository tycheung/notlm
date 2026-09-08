import type { MysteryGameReport } from '../../../../api/side-actions';
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
import { mysteryGameOutcomeLabel } from './mysteryGameOutcomeLabel';

function gameScopeLabel(report: MysteryGameReport): string {
  if (report.game_scope === 'all_games_pool') {
    const games = (report.game_numbers || []).join(', ');
    return `All games pool (G${games})`;
  }
  const game = report.game_numbers?.[0] ?? 1;
  return `Game ${game}`;
}

function winnerRowsHtml(
  winners: MysteryGameReport['sections'][number]['winners'],
  showGame: boolean
): string {
  if (!winners.length) {
    return `<tr><td colspan="${showGame ? 4 : 3}" class="hg-empty">No winner yet</td></tr>`;
  }
  return winners
    .map(
      (row) => `<tr>
        <td class="col-name">${escapeHtml(row.display_name || '')}</td>
        <td class="col-score">${escapeHtml(String(row.score ?? ''))}</td>
        ${showGame ? `<td class="col-score">${row.game_number != null ? `G${row.game_number}` : '—'}</td>` : ''}
        <td class="col-money">${escapeHtml(formatMoney(row.payout))}</td>
      </tr>`
    )
    .join('');
}

function missRowsHtml(
  misses: MysteryGameReport['sections'][number]['misses'],
  showGame: boolean
): string {
  if (!misses.length) {
    return `<tr><td colspan="${showGame ? 4 : 3}" class="hg-empty">No misses</td></tr>`;
  }
  return misses
    .map(
      (row) => `<tr>
        <td class="col-name">${escapeHtml(row.display_name || '')}</td>
        <td class="col-score">${escapeHtml(String(row.score ?? ''))}</td>
        ${showGame ? `<td class="col-score">${row.game_number != null ? `G${row.game_number}` : '—'}</td>` : ''}
        <td class="col-score">${row.distance != null ? escapeHtml(String(row.distance)) : '—'}</td>
      </tr>`
    )
    .join('');
}

function sectionBlock(
  section: MysteryGameReport['sections'][number],
  showGame: boolean
): string {
  const mystery =
    section.mystery_number != null
      ? String(section.mystery_number)
      : section.spun
        ? '—'
        : 'Not generated';
  const outcome = mysteryGameOutcomeLabel(section.outcome);

  return `
    <article class="high-game-section">
      <h2 class="high-game-section-title">${escapeHtml(section.label)}</h2>
      <div class="report-note high-game-report-note">
        <strong>Mystery Number:</strong> ${escapeHtml(mystery)}
        · ${escapeHtml(outcome)}
      </div>
      <h3 class="entry-summary-setup-subtitle">Winner${section.winners.length === 1 ? '' : 's'}</h3>
      <table class="report-table high-game-standings-table">
        <thead>
          <tr>
            <th class="col-name">${escapeHtml(showGame ? 'Entrant' : 'Bowler')}</th>
            <th class="col-score">Score</th>
            ${showGame ? '<th class="col-score">Game</th>' : ''}
            <th class="col-money">Pay</th>
          </tr>
        </thead>
        <tbody>${winnerRowsHtml(section.winners, showGame)}</tbody>
      </table>
      <h3 class="entry-summary-setup-subtitle">Misses (closest first)</h3>
      <table class="report-table high-game-standings-table">
        <thead>
          <tr>
            <th class="col-name">${escapeHtml(showGame ? 'Entrant' : 'Bowler')}</th>
            <th class="col-score">Score</th>
            ${showGame ? '<th class="col-score">Game</th>' : ''}
            <th class="col-score">Miss</th>
          </tr>
        </thead>
        <tbody>${missRowsHtml(section.misses, showGame)}</tbody>
      </table>
    </article>
  `;
}

export function buildMysteryGameReportDocument(report: MysteryGameReport): ReportDocument {
  const title = `Mystery Game Report — ${report.side_action_name}`;
  const filename = reportSuggestedFilename(
    'Mystery_Game_Report',
    report.side_action_name,
    report.event_name,
    formatFilenameDate()
  );
  const dateLabel = formatDateOnly();
  const showGame = report.game_scope === 'all_games_pool';
  const entryLabel = report.entry_unit === 'team' ? 'Team entries' : 'Bowler entries';
  const sections = report.sections || [];
  const emptyNote =
    sections.length === 0
      ? `<p class="report-note">No pools to display.</p>`
      : !report.spun
        ? `<p class="report-note">Mystery number has not been generated yet.</p>`
        : report.needs_respin
          ? `<p class="report-note">Re-spin required — no winner yet.</p>`
          : '';

  const bodyHtml = `
      <section class="high-game-report-page">
        <header class="report-header high-game-report-header">
          <div>
            <h1 class="report-title">${escapeHtml(report.side_action_name)}</h1>
            <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
            <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
            <div class="report-doc-label">Mystery Game Report</div>
          </div>
          <div class="report-meta">
            <div>${escapeHtml(dateLabel)}</div>
          </div>
        </header>
        <p class="report-note high-game-report-note">
          ${escapeHtml(report.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap')}
          · ${escapeHtml(gameScopeLabel(report))}
          · ${escapeHtml(entryLabel)}
          · Range ${report.min_mystery_score}–${report.max_mystery_score}
        </p>
        ${emptyNote}
        <div class="high-game-sections high-game-sections--stack">
          ${sections.map((section) => sectionBlock(section, showGame)).join('')}
        </div>
        ${reportFooterHtml()}
      </section>`;

  return buildReportDocument(title, bodyHtml, filename);
}
