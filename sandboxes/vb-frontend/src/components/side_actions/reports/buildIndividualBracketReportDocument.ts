import type {
  IndividualBracketGameSlot,
  IndividualBracketReport,
} from '../../../api/side-actions';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatDateOnly,
  formatFilenameDate,
  formatMoneyAlways,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../../utils/sideActionReportPrint';

function scoreCell(score: string, won: boolean): string {
  const text = escapeHtml(score || '—');
  return `<td class="ind-score${won ? ' is-winner' : ''}">${text}</td>`;
}

function gameCells(slot: IndividualBracketGameSlot): string {
  if (!slot.reached) {
    return `
      <td class="ind-opp ind-empty">—</td>
      <td class="ind-score ind-empty">—</td>
      <td class="ind-score ind-empty">—</td>`;
  }
  const oppWon = slot.result === 'opponent';
  const selfWon = slot.result === 'self' || slot.result === 'tie';
  return `
    <td class="ind-opp">${escapeHtml(slot.opponent_name || 'TBD')}</td>
    ${scoreCell(slot.opponent_score, oppWon)}
    ${scoreCell(slot.own_score, selfWon)}`;
}

function tableHeader(gameNumbers: number[]): string {
  const g1 = gameNumbers[0] != null ? `Game ${gameNumbers[0]}` : 'Game 1';
  const g2 = gameNumbers[1] != null ? `Game ${gameNumbers[1]}` : 'Game 2';
  const final =
    gameNumbers[2] != null ? `Final (Game ${gameNumbers[2]})` : 'Final';
  return `
    <thead>
      <tr>
        <th rowspan="2" class="ind-num">Brkt</th>
        <th colspan="3">${escapeHtml(g1)}</th>
        <th colspan="3">${escapeHtml(g2)}</th>
        <th colspan="3">${escapeHtml(final)}</th>
        <th rowspan="2" class="ind-prize">Prize</th>
      </tr>
      <tr>
        <th>Opponent</th><th>Opp</th><th>Score</th>
        <th>Opponent</th><th>Opp</th><th>Score</th>
        <th>Opponent</th><th>Opp</th><th>Score</th>
      </tr>
    </thead>`;
}

function sectionTable(
  section: IndividualBracketReport['sections'][number],
  showHeading: boolean
): string {
  const bodyRows =
    section.rows.length === 0
      ? `<tr><td colspan="11" class="ind-empty">No pots seated for this bowler.</td></tr>`
      : section.rows
          .map(
            (row) => `<tr>
        <td class="ind-num">${row.bracket_number}</td>
        ${gameCells(row.g1)}
        ${gameCells(row.g2)}
        ${gameCells(row.final)}
        <td class="ind-prize">${row.prize > 0 ? escapeHtml(formatMoneyAlways(row.prize)) : ''}</td>
      </tr>`
          )
          .join('');

  const heading = showHeading
    ? `<h2 class="individual-section-title">${escapeHtml(section.side_action_name)} · ${escapeHtml(section.squad_name)} · Pool ${section.pool_id}</h2>`
    : '';

  return `
    <section class="individual-bracket-section">
      ${heading}
      <table class="report-table individual-bracket-table">
        ${tableHeader(section.game_numbers || [])}
        <tbody>${bodyRows}</tbody>
      </table>
    </section>`;
}

export function buildIndividualBracketReportDocument(
  report: IndividualBracketReport
): ReportDocument {
  const selectedSection = report.scope === 'this' ? report.sections?.[0] : undefined;
  const title = `Individual — ${report.display_name} — ${report.side_action_name}${selectedSection ? ` — ${selectedSection.squad_name}` : ''}`;
  const filename = reportSuggestedFilename(
    'individual_bracket',
    report.display_name,
    report.side_action_name,
    selectedSection?.squad_name,
    formatFilenameDate()
  );
  const dateLabel = formatDateOnly();
  const summary = report.summary;
  const sections =
    report.sections?.length > 0
      ? report.sections
      : [
          {
            side_action_id: report.side_action_id ?? 0,
            side_action_name: report.side_action_name,
            pool_id: 0,
            squad_id: 0,
            squad_name: '',
            entry_fee: report.entry_fee ?? 0,
            rows: report.rows,
          },
        ];
  const showSectionHeadings = report.scope === 'all' || sections.length > 1;

  const html = `
    <section class="individual-bracket-page">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(report.display_name)}</h1>
          <div class="report-subtitle">${escapeHtml(report.event_name)} · ${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
          <div class="report-doc-label">Bracket Individual Report</div>
          <div class="report-subtitle" style="margin-top:4px;">${escapeHtml(report.side_action_name)}</div>
          ${
            selectedSection
              ? `<div class="report-subtitle">${escapeHtml(selectedSection.squad_name)} · Pool ${selectedSection.pool_id}</div>`
              : ''
          }
        </div>
        <div class="report-meta">
          <div>${escapeHtml(dateLabel)}</div>
        </div>
      </header>
      <p class="report-note">
        Winner score cells are highlighted. Prize shows place money for completed pots
        (1st/2nd from finals; 3rd/4th from Game 2 losers when configured; bye pots use
        bye payouts when seated short).
      </p>
      ${sections.map((s) => sectionTable(s, showSectionHeadings)).join('')}

      <section class="individual-summary">
        <h2 class="individual-summary-title">Summary</h2>
        <div class="individual-summary-grid">
          <div><span class="label">Brackets entered</span><span class="value">${summary.brackets_entered}</span></div>
          <div><span class="label">Lost Game 1</span><span class="value">${summary.lost_game_1}</span></div>
          <div><span class="label">Lost Game 2</span><span class="value">${summary.lost_game_2}</span></div>
          <div><span class="label">2nd place</span><span class="value">${summary.second_place}</span></div>
          <div><span class="label">1st place</span><span class="value">${summary.first_place}</span></div>
          ${
            (summary.third_place ?? 0) > 0
              ? `<div><span class="label">3rd place</span><span class="value">${summary.third_place}</span></div>`
              : ''
          }
          ${
            (summary.fourth_place ?? 0) > 0
              ? `<div><span class="label">4th place</span><span class="value">${summary.fourth_place}</span></div>`
              : ''
          }
          ${
            summary.splits > 0
              ? `<div><span class="label">Ties</span><span class="value">${summary.splits}</span></div>`
              : ''
          }
          <div><span class="label">Total entered</span><span class="value">${escapeHtml(formatMoneyAlways(summary.total_entered))}</span></div>
          <div><span class="label">Total winnings</span><span class="value">${escapeHtml(formatMoneyAlways(summary.total_winnings))}</span></div>
          <div><span class="label">Brackets refunded</span><span class="value">${summary.unused_tickets}</span></div>
          <div><span class="label">Refund</span><span class="value">${escapeHtml(formatMoneyAlways(summary.refund_amount))}</span></div>
          <div class="individual-summary-total"><span class="label">Total payout</span><span class="value">${escapeHtml(formatMoneyAlways(summary.total_payout))}</span></div>
        </div>
      </section>
      ${reportFooterHtml()}
    </section>`;

  return buildReportDocument(title, html, filename);
}
