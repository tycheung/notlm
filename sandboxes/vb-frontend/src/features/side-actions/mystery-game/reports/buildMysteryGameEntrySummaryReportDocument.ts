import type { MysteryGameEntrySummaryReport } from '../../../../api/side-actions';
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
} from '../../../../utils/sideActionReportPrint';
import { mysteryGameOutcomeLabel } from './mysteryGameOutcomeLabel';

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function gameScopeLabel(pot: MysteryGameEntrySummaryReport['pots'][number]): string {
  if (pot.game_scope === 'all_games_pool') {
    const games = (pot.game_numbers || []).join(', ');
    return `All games pool (G${games})`;
  }
  const game = pot.game_numbers?.[0] ?? 1;
  return `Game ${game}`;
}

function outcomeLabel(
  pot: MysteryGameEntrySummaryReport['pots'][number]
): string {
  if (!pot.spun && !pot.needs_respin && !pot.outcome) {
    return 'Not generated';
  }
  return mysteryGameOutcomeLabel(pot.outcome, {
    needsRespin: pot.needs_respin,
    spun: pot.spun,
  });
}

function potBlock(
  pot: MysteryGameEntrySummaryReport['pots'][number],
  showName: boolean
): string {
  const divParts: string[] = [];
  if (pot.divisions?.men !== false) divParts.push('Men');
  if (pot.divisions?.women !== false) divParts.push('Women');
  const divisions =
    divParts.length === 2 ? 'Open (combined)' : divParts.join(' · ') || 'Open';
  const places = (pot.place_amounts || [])
    .map((amt, i) => `${ordinal(i + 1)} ${formatMoneyAlways(amt)}`)
    .join(' · ');
  const title = showName
    ? `<h3 class="entry-summary-setup-subtitle">${escapeHtml(pot.side_action_name)}</h3>`
    : '';
  const noMatchPolicy =
    pot.no_match_policy === 'respin' ? 'Re-spin if no match' : 'Closest score wins';
  const entryUnit = pot.entry_unit === 'team' ? 'Team' : 'Bowler';
  const mystery =
    pot.mystery_number != null
      ? String(pot.mystery_number)
      : pot.spun
        ? '—'
        : 'Not generated';

  return `
    ${title}
    <table class="report-table entry-summary-finance high-game-pot-table">
      <tbody>
        <tr><th scope="row">Squad pool</th><td>${escapeHtml(pot.squad_name)}</td></tr>
        <tr><th scope="row">Entries</th><td>${pot.entry_count} (${escapeHtml(entryUnit)})</td></tr>
        <tr><th scope="row">Entry fee</th><td>${escapeHtml(formatMoneyAlways(pot.entry_fee))}</td></tr>
        <tr><th scope="row">Scoring</th><td>${escapeHtml(
          pot.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap'
        )}</td></tr>
        <tr><th scope="row">Games</th><td>${escapeHtml(gameScopeLabel(pot))}</td></tr>
        <tr><th scope="row">Mystery range</th><td>${pot.min_mystery_score}–${pot.max_mystery_score}</td></tr>
        <tr><th scope="row">No match</th><td>${escapeHtml(noMatchPolicy)}</td></tr>
        <tr><th scope="row">Mystery number</th><td>${escapeHtml(mystery)}</td></tr>
        <tr><th scope="row">Outcome</th><td>${escapeHtml(outcomeLabel(pot))}</td></tr>
        <tr><th scope="row">Divisions</th><td>${escapeHtml(divisions)}</td></tr>
        <tr><th scope="row">Place prizes</th><td>${escapeHtml(places || '—')}</td></tr>
        <tr><th scope="row">Collected</th><td>${escapeHtml(formatMoneyAlways(pot.fund.collected))}</td></tr>
        <tr><th scope="row">Expense total</th><td>${escapeHtml(formatMoneyAlways(pot.fund.expenses))}</td></tr>
        <tr><th scope="row">Prize fund</th><td>${escapeHtml(formatMoneyAlways(pot.fund.prize_fund))}</td></tr>
        <tr><th scope="row">Payout status</th><td>${escapeHtml(
          pot.fund.overcommitted
            ? 'Overcommitted'
            : pot.fund.payout_ready
              ? 'Ready'
              : 'Provisional'
        )}</td></tr>
      </tbody>
    </table>
  `;
}

export function buildMysteryGameEntrySummaryReportDocument(
  report: MysteryGameEntrySummaryReport
): ReportDocument {
  const dateLabel = formatDateOnly();
  const multi = (report.pots?.length ?? 0) > 1;
  const reportName = multi
    ? 'Mystery Game (multiple pots)'
    : report.pots?.[0]?.side_action_name || 'Mystery Game';
  const title = `Mystery Game Entry Summary — ${reportName}`;
  const filename = reportSuggestedFilename(
    'Mystery_Game_Entry_Summary',
    reportName,
    report.event_name,
    formatFilenameDate()
  );

  const potsHtml = (report.pots || [])
    .map((pot) => potBlock(pot, multi))
    .join('');

  const bodyHtml = `
    <section class="report-page">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(reportName)}</h1>
          <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
          <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
          <div class="report-doc-label">Mystery Game Entry Summary</div>
        </div>
        <div class="report-meta"><div>${escapeHtml(dateLabel)}</div></div>
      </header>
      ${potsHtml || '<p class="report-note">No pots to display.</p>'}
      ${reportFooterHtml()}
    </section>`;

  return buildReportDocument(title, bodyHtml, filename);
}
