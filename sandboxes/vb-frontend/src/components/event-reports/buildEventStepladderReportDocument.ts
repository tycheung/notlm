import type { MatchSeriesRead } from '../../api/round-match-series';
import type { EventTeamRead } from '../../types/event_team';
import { matchSeriesSideLabel } from '../../utils/matchSeriesSideLabel';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatDateOnly,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../utils/sideActionReportPrint';

export function isStepladderCompetitionMethod(
  method: string | null | undefined
): boolean {
  return String(method || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_') === 'stepladder';
}

export function buildEventStepladderReportDocument(input: {
  matchSeries: MatchSeriesRead[];
  isTeamEvent: boolean;
  teams?: EventTeamRead[] | null;
  participants?: Array<{ event_participant_id: number; user_name?: string | null }> | null;
  tournamentName?: string | null;
  eventName?: string | null;
  roundName?: string | null;
  directorName?: string | null;
}): ReportDocument {
  const teamNames = new Map<number, string>();
  for (const team of input.teams || []) {
    const id = Number(team.id);
    if (!id) continue;
    const name = (team.display_name || team.team_name || '').trim() || `Team ${team.team_number ?? id}`;
    teamNames.set(id, name);
  }
  const participantNames = new Map<number, string>();
  for (const row of input.participants || []) {
    const id = Number(row.event_participant_id);
    if (!id) continue;
    participantNames.set(id, (row.user_name || '').trim() || `Bowler ${id}`);
  }

  const sorted = [...(input.matchSeries || [])].sort((a, b) => {
    const ar = Number(a.bracket_round);
    const br = Number(b.bracket_round);
    if (Number.isFinite(ar) && Number.isFinite(br) && ar !== br) return ar - br;
    return a.display_order - b.display_order;
  });

  const rungs = sorted
    .map((series, index) => {
      const label = series.match_label || `Match ${index + 1}`;
      const a = matchSeriesSideLabel(series, 0, {
        isTeamEvent: input.isTeamEvent,
        teamNames,
        participantNames,
      });
      const b = matchSeriesSideLabel(series, 1, {
        isTeamEvent: input.isTeamEvent,
        teamNames,
        participantNames,
      });
      const wins = `${series.wins_side_0 ?? 0}–${series.wins_side_1 ?? 0}`;
      const winner =
        series.winner_side === 0 ? a : series.winner_side === 1 ? b : null;
      const status = winner
        ? `Winner: ${winner}`
        : (series.status || 'open').replace(/_/g, ' ');
      return `
        <article class="sl-rung">
          <h2 class="sl-rung-title">${escapeHtml(label)}</h2>
          <p class="sl-vs">${escapeHtml(a)} <span>vs</span> ${escapeHtml(b)}</p>
          <p class="sl-score">Score ${escapeHtml(wins)} · ${escapeHtml(status)}</p>
        </article>`;
    })
    .join('');

  const title = 'Stepladder';
  const filename = reportSuggestedFilename(
    'stepladder',
    input.tournamentName || 'tournament',
    input.eventName || 'event',
    input.roundName || null
  );
  const subtitle = withDirector(
    [input.tournamentName, input.eventName, input.roundName, formatDateOnly()]
      .filter(Boolean)
      .join(' · '),
    input.directorName
  );

  const body =
    sorted.length === 0
      ? '<p class="lc-empty">No stepladder matches generated yet.</p>'
      : `<div class="sl-climb">${rungs}</div>
         <p class="report-kicker">Lowest seeds open at the bottom; winners climb toward #1.</p>`;

  const html = `
    <header class="report-header">
      <div>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <p class="report-subtitle">${escapeHtml(subtitle)}</p>
      </div>
    </header>
    ${body}
    ${reportFooterHtml()}`;

  return buildReportDocument(title, html, filename);
}
