import type { AliveListReport } from '../../../api/side-actions';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatFilenameDate,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../../utils/sideActionReportPrint';

function placeTotal(row: AliveListReport['rows'][number]): number {
  return (
    Number(row.first_count || 0) +
    Number(row.second_count || 0) +
    Number(row.third_count || 0) +
    Number(row.fourth_count || 0) +
    Number(row.split_count || 0)
  );
}

function totalValue(report: AliveListReport, row: AliveListReport['rows'][number]): number {
  const places = placeTotal(row);
  if (report.complete) {
    return places;
  }
  if (report.scope === 'all') {
    return Number(row.alive_count || 0) + places;
  }
  return Number(row.alive_count || 0);
}

/** Detail column only — total lives in its own column. */
function detailCell(report: AliveListReport, row: AliveListReport['rows'][number]): string | null {
  if (report.complete) {
    const parts: string[] = [];
    if (row.first_count > 0) parts.push(`1st ×${row.first_count}`);
    if (row.second_count > 0) parts.push(`2nd ×${row.second_count}`);
    if ((row.third_count ?? 0) > 0) parts.push(`3rd ×${row.third_count}`);
    if ((row.fourth_count ?? 0) > 0) parts.push(`4th ×${row.fourth_count}`);
    if (row.split_count > 0) parts.push(`Tie ×${row.split_count}`);
    return parts.join(', ') || '—';
  }

  if (report.display_mode === 'total_only') {
    const places = placeTotal(row);
    return places > 0 ? `Places ×${places}` : null;
  }

  const aliveParts: string[] = [];
  if (report.display_mode === 'opponent_names') {
    if (row.opponents?.length) {
      aliveParts.push(row.opponents.map((o) => `${o.display_name} ×${o.count}`).join(', '));
    }
  } else {
    const nums = row.bracket_numbers || [];
    if (nums.length) aliveParts.push(nums.join(', '));
  }

  const placeParts: string[] = [];
  if (row.first_count > 0) placeParts.push(`1st ×${row.first_count}`);
  if (row.second_count > 0) placeParts.push(`2nd ×${row.second_count}`);
  if ((row.third_count ?? 0) > 0) placeParts.push(`3rd ×${row.third_count}`);
  if ((row.fourth_count ?? 0) > 0) placeParts.push(`4th ×${row.fourth_count}`);
  if (row.split_count > 0) placeParts.push(`Tie ×${row.split_count}`);

  const combined = [...aliveParts, ...placeParts].filter(Boolean);
  if (!combined.length) return '—';
  return combined.join(' · ');
}

function detailHeader(report: AliveListReport): string | null {
  if (report.complete) return 'Places';
  if (report.display_mode === 'opponent_names') return 'Opponents';
  if (report.display_mode === 'total_only') return null;
  return 'Brackets';
}

export function buildAliveListReportDocument(report: AliveListReport): ReportDocument {
  const gamesLabel = report.game_window.length
    ? `Games ${report.game_window.join(' → ')}`
    : null;
  const scopeLabel =
    report.scope === 'all'
      ? 'All bracket sets'
      : report.squad_name
        ? `${report.side_action_name} — ${report.squad_name}`
        : report.side_action_name;
  const title = `Alive List — ${scopeLabel}`;
  const filename = reportSuggestedFilename(
    'alive',
    report.side_action_name,
    report.scope === 'all' ? 'All_sets' : report.squad_name ?? undefined,
    gamesLabel,
    report.as_of_label,
    formatFilenameDate()
  );

  const detailHead = detailHeader(report);
  const colCount = detailHead ? 3 : 2;
  const densityClass =
    report.display_mode === 'bracket_numbers' && !report.complete
      ? 'alive-list-dense'
      : 'alive-list-compact';

  const bodyRows =
    report.rows.length === 0
      ? `<tr><td colspan="${colCount}" class="alive-empty">No ${report.entry_unit === 'team' ? 'teams' : 'bowlers'} to list for this view.</td></tr>`
      : report.rows
          .map((row) => {
            const detail = detailCell(report, row);
            const detailTd =
              detailHead == null
                ? ''
                : `<td class="alive-detail">${escapeHtml(detail || '—')}</td>`;
            return `
        <tr>
          <td class="alive-name">${escapeHtml(row.display_name)}</td>
          <td class="alive-total">${totalValue(report, row)}</td>
          ${detailTd}
        </tr>`;
          })
          .join('');

  const includedNote =
    report.scope === 'all' && (report.included_side_actions?.length ?? 0) > 0
      ? `<p class="report-note">Included: ${escapeHtml(
          (report.included_side_actions || []).join(', ')
        )}</p>`
      : '';

  const metaParts = [
    escapeHtml(report.event_name),
    escapeHtml(withDirector(report.tournament_name, report.director_name)),
    report.scope === 'all'
      ? 'All bracket sets'
      : report.squad_name
        ? escapeHtml(report.squad_name)
        : null,
    report.pool_id != null ? `Pool ${report.pool_id}` : null,
    gamesLabel ? escapeHtml(gamesLabel) : null,
    escapeHtml(report.as_of_label),
  ].filter(Boolean);

  const body = `
    <section class="alive-list-page ${densityClass}">
      <header class="report-header alive-list-header">
        <h1 class="report-title">Bracket Alive List</h1>
        <p class="report-meta">${metaParts.join(' · ')}</p>
      </header>
      ${includedNote}
      <p class="report-note alive-list-note">
        <span class="alive-list-sa-name">${escapeHtml(report.side_action_name)}</span>
        <span class="alive-list-bracket-count">Total brackets: ${report.bracket_count}</span>
      </p>
      <table class="report-table alive-list-table">
        <thead>
          <tr>
            <th scope="col">${report.entry_unit === 'team' ? 'Team' : 'Name'}</th>
            <th scope="col" class="alive-total">Total</th>
            ${detailHead ? `<th scope="col">${escapeHtml(detailHead)}</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
      ${reportFooterHtml()}
    </section>
  `;

  return buildReportDocument(title, body, filename);
}
