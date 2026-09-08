import type { TournamentLaneConflictReport } from '../../types/tournament';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatDateOnly,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../utils/sideActionReportPrint';

export function filterLaneConflictsForEvent(
  report: TournamentLaneConflictReport,
  eventId: number | null | undefined
): TournamentLaneConflictReport {
  if (eventId == null) return report;
  const rows = (report.rows || []).filter((row) =>
    (row.occurrences || []).some((occ) => Number(occ.event_id) === Number(eventId))
  );
  return { ...report, rows };
}

export function buildLanePairConflictsReportDocument(input: {
  report: TournamentLaneConflictReport;
  tournamentName: string;
  eventName?: string | null;
  directorName?: string | null;
}): ReportDocument {
  const { report, tournamentName, eventName, directorName } = input;
  const title = 'Lane Pair Conflicts';
  const filename = reportSuggestedFilename(
    'lane_conflicts',
    tournamentName,
    eventName || 'tournament'
  );
  const subtitle = withDirector(
    [tournamentName, eventName, formatDateOnly()].filter(Boolean).join(' · '),
    directorName
  );
  const filters = (report.meta as { filters?: { min_occurrences?: number } } | undefined)
    ?.filters;
  const minOcc = filters?.min_occurrences ?? 2;

  const body =
    report.rows.length === 0
      ? `<p class="lc-empty">No pair reuse at ${escapeHtml(String(minOcc))}+ occurrences.</p>`
      : report.rows
          .map((row) => {
            const pair = `${row.pair_low}–${row.pair_high}`;
            const heat = row.severity === 'high' ? 'HIGH' : 'Warning';
            const occ = (row.occurrences || [])
              .map((o) => {
                const game =
                  o.game_number != null ? ` G${escapeHtml(String(o.game_number))}` : '';
                const src = o.source ? ` (${escapeHtml(String(o.source))})` : '';
                return `<li>${escapeHtml(o.event_name || 'Event')} · Round ${escapeHtml(
                  String(o.round_number)
                )}${game}${
                  o.squad_name ? ` · ${escapeHtml(o.squad_name)}` : ''
                } · lane ${escapeHtml(String(o.assigned_lane))}${src}</li>`;
              })
              .join('');
            return `
              <article class="lc-block">
                <h2 class="lc-who">${escapeHtml(row.display_name || '—')}
                  <span class="lc-meta">${escapeHtml(pair)} · ${escapeHtml(
                    String(row.occurrence_count)
                  )} hits · ${heat}</span>
                </h2>
                <ul class="lc-occ">${occ}</ul>
              </article>`;
          })
          .join('');

  const html = `
    <header class="report-header">
      <div>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <p class="report-subtitle">${escapeHtml(subtitle)}</p>
        <p class="report-kicker">Repeated lane pairs (stamped or home). Warn-only — does not block seating.</p>
      </div>
    </header>
    ${body}
    ${reportFooterHtml()}`;

  return buildReportDocument(title, html, filename);
}
