import type {
  EventStandingsGameScore,
  EventStandingsMemberResults,
  EventStandingsReport,
  EventStandingsRow,
  EventStandingsSection,
  StepladderStandingsBlock,
  StepladderStandingsMatch,
  StepladderStandingsSide,
} from '../../api/event-reports';
import { cutLineAfterIndex } from './standingsCutLine';
import { standingsIdentityParts } from './standingsIdentity';
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

export interface EventStandingsPrintOptions {
  showTeamNames: boolean;
  showBowlerNames: boolean;
  /** Default true: show per-game scores in the Results column. */
  includeGameScores: boolean;
  /** Team standings only: show each member's game line instead of team aggregate line when available. */
  showIndividualTeamScores?: boolean;
}

/** Letter portrait: ~10 three-digit scores fill the Results column without tall stacks. */
const GAMES_PER_RESULTS_LINE = 10;
const GUIDE_EVERY_N_ROWS = 10;

function formatScore(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function placeCell(row: EventStandingsRow): string {
  const label = (row.place_label || '').replace(/\s*Place\s*$/i, '').trim();
  if (row.standing_status === 'advance') {
    // Keep numeric place on the feeder board; "Advance" shows in Prize/Status.
    return escapeHtml(String(row.place));
  }
  return escapeHtml(label || String(row.place));
}

function prizeOrStatusCell(row: EventStandingsRow, showPrizes: boolean): string {
  if (row.standing_status === 'advance') {
    return '<span class="ls-advance">Advance</span>';
  }
  if (!showPrizes) return '—';
  if (row.prize_amount != null) {
    return escapeHtml(formatMoneyOrDash(row.prize_amount));
  }
  return '—';
}

function handicapPinsFor(row: EventStandingsRow): number {
  if (row.handicap_pins != null) return Number(row.handicap_pins);
  return Number(row.score_handicap) - Number(row.score_scratch);
}

function bonusPinsFor(row: EventStandingsRow): number {
  return Number(row.bonus_pins ?? 0);
}

function totalWithBonusFor(row: EventStandingsRow): number {
  return Number(row.score_scratch) + bonusPinsFor(row);
}

/**
 * Team identity: stack bowler names (one per line) so a 5-bowler roster stays
 * readable next to a multi-line Results cell.
 */
function identityCell(
  row: EventStandingsRow,
  section: EventStandingsSection,
  options: EventStandingsPrintOptions
): string {
  const { isTeam, teamNumber, teamName, bowlerNames } = standingsIdentityParts(row, section, {
    showTeamNames: options.showTeamNames,
    showBowlerNames: options.showBowlerNames,
  });
  if (!isTeam) {
    return escapeHtml(row.display_name || row.bowlers?.[0]?.display_name || '—');
  }

  const showTeam = options.showTeamNames;
  const showBowlers = options.showBowlerNames;

  if (!showTeam && !showBowlers) {
    return escapeHtml(teamNumber);
  }

  const bowlerStack = bowlerNames
    .map((name) => `<div class="ls-sub">${escapeHtml(name)}</div>`)
    .join('');

  if (showTeam && showBowlers) {
    const primary = `<div class="ls-team-name">${escapeHtml(teamName)}</div>`;
    if (!bowlerNames.length) return primary;
    return `${primary}${bowlerStack}`;
  }
  if (showTeam) {
    return `<div class="ls-team-name">${escapeHtml(teamName)}</div>`;
  }
  if (!bowlerNames.length) {
    return `${escapeHtml(teamNumber)}<div class="ls-sub">—</div>`;
  }
  return `${escapeHtml(teamNumber)}${bowlerStack}`;
}

function sortedGames(games: EventStandingsGameScore[] | undefined): EventStandingsGameScore[] {
  return [...(games || [])].sort(
    (a, b) => Number(a.game_number) - Number(b.game_number)
  );
}

function resultsLineHtml(games: EventStandingsGameScore[]): string {
  const lines: string[] = [];
  for (let i = 0; i < games.length; i += GAMES_PER_RESULTS_LINE) {
    const chunk = games.slice(i, i + GAMES_PER_RESULTS_LINE);
    // Same 10-column grid as full rows so partial leftovers sit in columns 1..n.
    const cells = chunk
      .map((g) => {
        const val = formatScore(g.score_scratch);
        const extra = g.dylg_dropped
          ? ' ls-score-dylg-dropped'
          : g.dylg_candidate
            ? ' ls-score-dylg-candidate'
            : g.is_win
              ? ' ls-score-win'
              : '';
        return `<span class="ls-score${extra}">${escapeHtml(val)}</span>`;
      })
      .join('');
    lines.push(`<div class="ls-results-line">${cells}</div>`);
  }
  return lines.join('');
}

function memberResultsCell(memberResults: EventStandingsMemberResults[] | undefined): string | null {
  const rows = (memberResults || []).filter((m) => (m.display_name || '').trim() && (m.games || []).length);
  if (!rows.length) return null;
  return rows
    .map((m) => `
      <div class="ls-member-results">
        <span class="ls-member-label">${escapeHtml(m.display_name)}</span>
        <span class="ls-member-scores">${resultsLineHtml(sortedGames(m.games))}</span>
      </div>`)
    .join('');
}

/**
 * Left-align scores under the Results header with a modest fixed gap.
 * Do not stretch to the full column width — that leaves huge empty gaps.
 * Lines wrap every 8 games; continuation lines also start at the left edge.
 */
function resultsCell(
  row: EventStandingsRow,
  section: EventStandingsSection,
  options: EventStandingsPrintOptions
): string {
  const showMemberLines =
    Boolean(options.showIndividualTeamScores) &&
    !section.is_baker &&
    (section.event_format === 'teams' || row.is_team_row);
  if (showMemberLines) {
    const memberHtml = memberResultsCell(row.member_results);
    if (memberHtml) return memberHtml;
  }

  const games = sortedGames(row.games);
  if (games.length === 0) return '—';
  return resultsLineHtml(games);
}

function gamesInSet(section: EventStandingsSection): number {
  let max = 0;
  for (const row of section.rows) {
    max = Math.max(max, sortedGames(row.games).length);
  }
  return max;
}

function sectionShowsBonus(section: EventStandingsSection): boolean {
  if (section.includes_bonus) return true;
  return section.rows.some((row) => bonusPinsFor(row) > 0);
}

function seriesHeadersHtml(showHandicap: boolean, showBonus: boolean): string {
  const parts: string[] = ['<th class="col-score">Scr</th>'];
  if (showBonus) parts.push('<th class="col-score">Bonus</th>');
  if (showHandicap) {
    parts.push('<th class="col-score">HCP</th>');
    parts.push('<th class="col-score">Tot</th>');
  }
  if (showBonus) parts.push('<th class="col-score">T+B</th>');
  return parts.join('');
}

function seriesColsHtml(showHandicap: boolean, showBonus: boolean): string {
  const n = 1 + (showBonus ? 2 : 0) + (showHandicap ? 2 : 0);
  return Array.from({ length: n }, () => '<col class="col-score" />').join('');
}

function seriesCellsHtml(
  row: EventStandingsRow,
  showHandicap: boolean,
  showBonus: boolean
): string {
  const pins = handicapPinsFor(row);
  const bonus = bonusPinsFor(row);
  let html = `<td class="col-score">${escapeHtml(formatScore(row.score_scratch))}</td>`;
  if (showBonus) {
    html += `<td class="col-score">${escapeHtml(formatScore(bonus))}</td>`;
  }
  if (showHandicap) {
    html += `<td class="col-score">${escapeHtml(formatScore(pins))}</td>`;
    html += `<td class="col-score col-tot">${escapeHtml(formatScore(row.score_handicap))}</td>`;
  }
  if (showBonus) {
    html += `<td class="col-score col-tot">${escapeHtml(
      formatScore(totalWithBonusFor(row))
    )}</td>`;
  }
  return html;
}

function sectionTable(
  section: EventStandingsSection,
  report: EventStandingsReport,
  options: EventStandingsPrintOptions
): string {
  const showPrizes = report.include_prizes;
  const showStatusCol =
    showPrizes ||
    section.layout === 'stepladder_final' ||
    section.rows.some((r) => Boolean(r.standing_status));
  const statusHeader = showPrizes ? 'Prize' : 'Status';
  const showHandicap = report.include_handicap;
  const showBonus = sectionShowsBonus(section);
  const showGames = options.includeGameScores;
  const isTeam = section.event_format === 'teams';
  const nameHeader = isTeam ? 'Team / Bowlers' : 'Bowler';
  const sortHeader = showHandicap ? 'Tot' : 'Scr';
  const seriesColCount = 1 + (showBonus ? 2 : 0) + (showHandicap ? 2 : 0);
  const colCount =
    3 + (showGames ? 1 : 0) + seriesColCount + (showStatusCol ? 1 : 0);
  const cutAfter = cutLineAfterIndex(
    section.rows,
    Boolean(report.show_cut_line),
    section.cut_line_after_index
  );

  if (section.note && section.rows.length === 0) {
    return `<p class="report-note">${escapeHtml(section.note)}</p>`;
  }

  const body =
    section.rows.length === 0
      ? `<tr><td colspan="${colCount}" class="ls-empty">No standings rows yet.</td></tr>`
      : section.rows
          .map((row, idx) => {
            const sortScore =
              row.sort_score != null
                ? Number(row.sort_score)
                : showHandicap
                  ? row.score_handicap
                  : row.score_scratch;
            const trClass = [
              (idx + 1) % GUIDE_EVERY_N_ROWS === 0 ? 'ls-guide' : '',
              isTeam || row.is_team_row ? 'ls-team-row' : '',
              row.standing_status === 'advance' ? 'ls-advance-row' : '',
              cutAfter === idx ? 'ls-cut-line' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const trAttr = trClass ? ` class="${trClass}"` : '';
            const prevPod = idx > 0 ? section.rows[idx - 1]?.pod_index : undefined;
            const showPodHeader =
              section.layout === 'pods' &&
              row.pod_index != null &&
              row.pod_index !== prevPod;
            const podHeader = showPodHeader
              ? `<tr class="ls-pod-header"><td colspan="${colCount}">${escapeHtml(
                  row.pod_label || `Pod ${(row.pod_index ?? 0) + 1}`
                )}</td></tr>`
              : '';
            return `${podHeader}<tr${trAttr}>
              <td class="col-place">${placeCell(row)}</td>
              <td class="col-sort">${escapeHtml(formatScore(sortScore))}</td>
              <td class="col-name">${identityCell(row, section, options)}</td>
              ${
                showGames
                  ? `<td class="col-results">${resultsCell(row, section, options)}</td>`
                  : ''
              }
              ${seriesCellsHtml(row, showHandicap, showBonus)}
              ${
                showStatusCol
                  ? `<td class="col-money">${prizeOrStatusCell(row, showPrizes)}</td>`
                  : ''
              }
            </tr>`;
          })
          .join('');

  return `
    <table class="ls-table">
      <colgroup>
        <col class="col-place" />
        <col class="col-sort" />
        <col class="col-name" />
        ${showGames ? '<col class="col-results" />' : ''}
        ${seriesColsHtml(showHandicap, showBonus)}
        ${showStatusCol ? '<col class="col-money" />' : ''}
      </colgroup>
      <thead>
        <tr>
          <th class="col-place">#</th>
          <th class="col-sort">${sortHeader}</th>
          <th class="col-name">${nameHeader}</th>
          ${showGames ? '<th class="col-results">Results</th>' : ''}
          ${seriesHeadersHtml(showHandicap, showBonus)}
          ${showStatusCol ? `<th class="col-money">${statusHeader}</th>` : ''}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function stepladderSideHtml(side: StepladderStandingsSide): string {
  if (side.is_tbd) {
    return `
      <div class="sl-side sl-tbd">
        <div class="sl-name">TBD</div>
      </div>`;
  }
  const seed =
    side.seed != null ? `<span class="sl-seed">#${escapeHtml(String(side.seed))}</span>` : '';
  const qual =
    side.qualifying_score != null
      ? `<span class="sl-qual">Qual ${escapeHtml(formatScore(side.qualifying_score))}</span>`
      : '';
  const games =
    side.game_scores.length > 0
      ? `<div class="sl-games">${side.game_scores
          .map((g) => `<span>${escapeHtml(formatScore(g))}</span>`)
          .join('<span class="sl-gap">·</span>')}</div>`
      : '<div class="sl-games">—</div>';
  const total =
    side.match_total != null
      ? `<div class="sl-total">${escapeHtml(formatScore(side.match_total))}</div>`
      : '';
  const prize =
    side.prize_amount != null
      ? `<div class="sl-prize">${
          side.place != null
            ? `<span class="sl-place">${escapeHtml(String(side.place))}${
                side.place === 1 ? 'st' : side.place === 2 ? 'nd' : side.place === 3 ? 'rd' : 'th'
              }</span> `
            : ''
        }${escapeHtml(formatMoneyOrDash(side.prize_amount))}</div>`
      : '';
  const winClass = side.is_winner ? ' sl-winner' : '';
  return `
    <div class="sl-side${winClass}">
      <div class="sl-side-main">
        <div class="sl-name-row">${seed}<span class="sl-name">${escapeHtml(
          side.display_name || '—'
        )}</span></div>
        <div class="sl-meta">${qual}</div>
        ${games}
        ${total}
      </div>
      ${prize}
    </div>`;
}

function stepladderMatchHtml(match: StepladderStandingsMatch): string {
  const sides = [...(match.sides || [])].sort((a, b) => a.side - b.side);
  const status = String(match.status || '').toLowerCase();
  const statusLabel =
    status === 'complete' ? 'Complete' : status === 'in_progress' ? 'Live' : 'Pending';
  return `
    <div class="sl-match">
      <div class="sl-match-head">
        <span class="sl-match-label">${escapeHtml(match.match_label || 'Match')}</span>
        <span class="sl-match-status">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="sl-sides">
        ${sides.map((s) => stepladderSideHtml(s)).join('<div class="sl-vs">vs</div>')}
      </div>
    </div>`;
}

function stepladderBlockHtml(block: StepladderStandingsBlock): string {
  const champion =
    block.champion_name
      ? `<div class="sl-champion">Champion: <strong>${escapeHtml(
          block.champion_name
        )}</strong>${
          block.champion_prize != null
            ? ` · ${escapeHtml(formatMoneyOrDash(block.champion_prize))}`
            : ''
        }</div>`
      : '';
  return `
    <div class="sl-block">
      <h3 class="sl-title">${escapeHtml(block.title || 'Stepladder')}</h3>
      <div class="sl-matches">
        ${(block.matches || []).map((m) => stepladderMatchHtml(m)).join('')}
      </div>
      ${champion}
    </div>`;
}

function sectionBlock(
  section: EventStandingsSection,
  report: EventStandingsReport,
  options: EventStandingsPrintOptions
): string {
  const isStepladderFinal = section.layout === 'stepladder_final' && section.stepladder;
  const gameCount = gamesInSet(section);
  const metaLeft = [
    isStepladderFinal ? 'Final · Stepladder' : section.basis_label,
    section.squad_name ? `Squad: ${section.squad_name}` : null,
    section.event_format === 'teams' ? 'Teams' : 'Singles',
  ]
    .filter(Boolean)
    .join(' · ');
  const metaRight =
    !isStepladderFinal && gameCount > 0
      ? report.report_type === 'single_game'
        ? ''
        : `${gameCount} Game${gameCount === 1 ? '' : 's'}`
      : '';

  const feederHeading = section.feeder_basis_label
    ? `<h3 class="sl-feeder-title">${escapeHtml(section.feeder_basis_label)}</h3>`
    : '';

  const body = isStepladderFinal
    ? `${stepladderBlockHtml(section.stepladder!)}
       ${feederHeading}
       ${sectionTable(section, report, options)}`
    : sectionTable(section, report, options);

  return `
    <section class="ls-section">
      <h2 class="ls-event-title">${escapeHtml(section.event_name)}</h2>
      <div class="ls-event-meta">
        <span>${escapeHtml(metaLeft)}</span>
        <span>${escapeHtml(metaRight)}</span>
      </div>
      ${body}
    </section>`;
}

export function buildEventStandingsReportDocument(
  report: EventStandingsReport,
  options: EventStandingsPrintOptions
): ReportDocument {
  const isSingleGame = report.report_type === 'single_game';
  const title = isSingleGame ? 'Game Results' : 'Standings';
  const filename = reportSuggestedFilename(
    isSingleGame ? 'game_results' : 'standings',
    report.tournament_name,
    report.scope,
    report.basis === 'round' ? `r${report.round_number ?? ''}` : 'final',
    isSingleGame && report.game_number != null ? `g${report.game_number}` : null
  );

  const subtitleParts = [
    report.tournament_name,
    report.basis === 'round'
      ? `Round ${report.round_number ?? '—'}`
      : 'Final',
    isSingleGame && report.game_number != null ? `Game ${report.game_number}` : null,
  ].filter(Boolean);

  const bodyHtml = `
    <header class="report-header ls-header">
      <div>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <div class="report-subtitle">${escapeHtml(withDirector(subtitleParts.join(' · '), report.director_name))}</div>
      </div>
      <div class="report-meta">${escapeHtml(formatDateOnly())}</div>
    </header>
    ${
      report.sections.length === 0
        ? `<p class="report-note">No standings sections available.</p>`
        : report.sections
            .map((section) => sectionBlock(section, report, options))
            .join('')
    }
    ${reportFooterHtml()}
    <style>
      body.standings-lane-sheet {
        /* Match letter printable width (8.5in − 0.4in margins each side). */
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
      body.standings-lane-sheet .report-footer {
        margin-top: 12px;
        padding-top: 6px;
      }
      body.standings-lane-sheet .report-footer svg { height: 12px; }

      .ls-section { margin-bottom: 16px; }
      .ls-event-title {
        margin: 0 0 2px;
        font-size: 11pt;
        font-weight: 700;
      }
      .ls-event-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 6px;
        font-size: 8pt;
        color: #4b5563;
      }
      .ls-advance {
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        font-size: 7.5pt;
        color: #1e3a5f;
      }
      .ls-advance-row td.col-place {
        font-weight: 700;
      }
      .sl-block {
        margin: 0 0 14px;
        padding: 8px 0 10px;
        border-bottom: 1px solid #d1d5db;
      }
      .sl-title {
        margin: 0 0 8px;
        font-size: 10pt;
        font-weight: 700;
      }
      .sl-feeder-title {
        margin: 10px 0 6px;
        font-size: 9.5pt;
        font-weight: 700;
      }
      .sl-matches {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: stretch;
      }
      .sl-match {
        flex: 1 1 1.85in;
        min-width: 1.7in;
        max-width: 2.4in;
        border: 1px solid #d1d5db;
        padding: 5px 6px;
        page-break-inside: avoid;
        overflow: visible;
      }
      .sl-match-head {
        display: flex;
        justify-content: space-between;
        gap: 4px;
        margin-bottom: 4px;
        font-size: 7pt;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #4b5563;
      }
      .sl-match-label { font-weight: 700; color: #111827; }
      .sl-sides { display: flex; flex-direction: column; gap: 3px; }
      .sl-vs {
        text-align: center;
        font-size: 7pt;
        color: #9ca3af;
        line-height: 1;
      }
      .sl-side {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 3px 4px;
        border: 1px solid transparent;
      }
      .sl-side-main {
        min-width: 0;
        flex: 1 1 auto;
      }
      .sl-prize {
        flex: 0 0 auto;
        text-align: right;
        font-size: 8.5pt;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        color: #111827;
        line-height: 1.2;
      }
      .sl-prize .sl-place {
        display: block;
        font-size: 6.5pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #4b5563;
      }
      .sl-side.sl-winner {
        border-color: #86efac;
        background: #f0fdf4;
      }
      .sl-side.sl-tbd {
        color: #9ca3af;
        font-style: italic;
      }
      .sl-name-row {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }
      .sl-seed {
        font-size: 7.5pt;
        font-weight: 700;
        color: #1e3a5f;
        white-space: nowrap;
      }
      .sl-name {
        font-size: 8.5pt;
        font-weight: 700;
        line-height: 1.15;
      }
      .sl-meta {
        margin-top: 1px;
        font-size: 7pt;
        color: #4b5563;
      }
      .sl-games {
        margin-top: 2px;
        font-size: 8pt;
        font-variant-numeric: tabular-nums;
        display: flex;
        flex-wrap: wrap;
        gap: 2px 0;
      }
      .sl-gap { color: #9ca3af; padding: 0 3px; }
      .sl-total {
        margin-top: 1px;
        font-size: 9pt;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .sl-champion {
        margin-top: 8px;
        font-size: 9pt;
      }
      .ls-team-name {
        font-weight: 700;
      }
      .ls-sub {
        margin-top: 1px;
        font-size: 7.5pt;
        color: #4b5563;
        font-weight: 400;
        line-height: 1.2;
      }
      .ls-results-line {
        display: grid;
        grid-template-columns: repeat(${GAMES_PER_RESULTS_LINE}, minmax(0, 1fr));
        column-gap: 0.05in;
        align-items: baseline;
        width: 100%;
        line-height: 1.2;
      }
      .ls-results-line + .ls-results-line {
        margin-top: 2px;
      }
      .ls-member-results {
        display: grid;
        grid-template-columns: 0.95in 1fr;
        gap: 0.08in;
        align-items: start;
      }
      .ls-member-results + .ls-member-results {
        margin-top: 2px;
      }
      .ls-member-label {
        display: block;
        font-size: 7.5pt;
        font-weight: 600;
        color: #374151;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ls-member-scores {
        display: block;
        min-width: 0;
      }
      .ls-score {
        min-width: 0;
        text-align: center;
        font-size: 7.5pt;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        font-weight: 400;
      }
      .ls-score-win {
        font-weight: 700;
      }
      .ls-score-dylg-dropped {
        text-decoration: line-through;
        color: #9ca3af;
      }
      .ls-score-dylg-candidate {
        font-weight: 700;
      }
      .ls-empty {
        text-align: center;
        color: #4b5563;
        font-style: italic;
        padding: 10px 0;
      }

      table.ls-table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
      }
      table.ls-table th,
      table.ls-table td {
        border: none;
        border-bottom: 1px solid #e5e7eb;
        padding: 3px 3px;
        vertical-align: top;
        line-height: 1.2;
      }
      table.ls-table thead th {
        font-size: 7pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        border-bottom: 2px solid #1e3a5f;
        background: #fff;
        white-space: nowrap;
      }
      table.ls-table tbody td {
        font-size: 8pt;
        height: auto;
        font-variant-numeric: tabular-nums;
      }
      table.ls-table tbody tr:nth-child(even) td {
        background: transparent;
      }
      table.ls-table tbody tr.ls-guide td {
        border-bottom: 1.5px solid #9ca3af;
      }
      table.ls-table tbody tr.ls-cut-line td {
        border-bottom: 2.5px solid #1e3a5f;
      }
      table.ls-table tbody tr.ls-team-row td {
        padding-top: 4px;
        padding-bottom: 4px;
      }
      table.ls-table tbody tr.ls-pod-header td {
        background: #eef2f7;
        color: #c45c26;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding-top: 6px;
        padding-bottom: 6px;
      }

      table.ls-table th.col-place,
      table.ls-table td.col-place {
        text-align: center;
        white-space: nowrap;
      }
      table.ls-table th.col-sort,
      table.ls-table td.col-sort,
      table.ls-table th.col-score,
      table.ls-table td.col-score,
      table.ls-table th.col-money,
      table.ls-table td.col-money {
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
      }
      table.ls-table td.col-sort,
      table.ls-table td.col-tot {
        font-weight: 700;
      }
      table.ls-table th.col-name,
      table.ls-table td.col-name {
        text-align: left;
        text-transform: none;
        letter-spacing: 0;
        font-variant-numeric: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
        overflow: hidden;
      }
      table.ls-table th.col-results,
      table.ls-table td.col-results {
        text-align: left;
        text-transform: none;
        letter-spacing: 0;
        white-space: normal;
        font-variant-numeric: tabular-nums;
        padding-left: 3px;
        padding-right: 4px;
        overflow: hidden;
      }

      /* Portrait letter (~7.7in): fixed left/right cols; Results takes the rest and stretches scores. */
      table.ls-table col.col-place { width: 0.30in; }
      table.ls-table col.col-sort { width: 0.46in; }
      table.ls-table col.col-score { width: 0.46in; }
      table.ls-table col.col-money { width: 0.62in; }
      table.ls-table col.col-name { width: 1.15in; }
      table.ls-table col.col-results { width: auto; }

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
