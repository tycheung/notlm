import type { BracketConflictRow } from '../../../utils/bracketEngine/conflicts';
import { displayNameForUserId } from '../../../utils/bracketEngine/types';
import type { UserDisplayNames } from '../../../utils/bracketEngine/types';
import {
  buildReportDocument,
  escapeHtml,
  formatDateOnly,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../../utils/sideActionReportPrint';

export function buildBracketConflictsReportDocument(input: {
  sideActionName: string;
  rows: BracketConflictRow[];
  userDisplayNames?: UserDisplayNames;
  includeOk: boolean;
  bracketCount: number;
}): ReportDocument {
  const names = input.userDisplayNames || {};
  const rows = input.includeOk
    ? input.rows
    : input.rows.filter((row) => row.heat !== 'OK');
  const filename = reportSuggestedFilename(
    'bracket_conflicts',
    input.sideActionName,
    input.includeOk ? 'all_pairs' : 'elevated'
  );

  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="8" class="alive-empty">No pairs to list for this view.</td></tr>`
      : rows
          .map((row) => {
            const a = displayNameForUserId(row.a, names);
            const b = displayNameForUserId(row.b, names);
            const heatClass =
              row.heat === 'HIGH'
                ? 'bc-heat bc-heat-high'
                : row.heat === 'ELEVATED'
                  ? 'bc-heat bc-heat-elevated'
                  : 'bc-heat';
            return `<tr>
              <td class="alive-name">${escapeHtml(a || `User ${row.a}`)} / ${escapeHtml(b || `User ${row.b}`)}</td>
              <td class="alive-total">${row.co}</td>
              <td class="alive-total">${row.g1}</td>
              <td class="alive-total">${row.g2pot}</td>
              <td class="alive-total">${row.g2act}</td>
              <td class="alive-total">${row.g3pot}</td>
              <td class="alive-total">${row.g3act}</td>
              <td class="${heatClass}">${escapeHtml(row.heat)}</td>
            </tr>`;
          })
          .join('');

  const html = `
    <header class="report-header">
      <div>
        <h1 class="report-title">Bracket Conflicts</h1>
        <p class="report-subtitle">${escapeHtml(input.sideActionName)} · ${escapeHtml(
          formatDateOnly()
        )}</p>
        <p class="report-kicker">
          ${input.bracketCount} bracket${input.bracketCount === 1 ? '' : 's'}.
          Co = shared brackets; G1 = Game 1 opponents; G2 pos = could meet in that round.
          ${input.includeOk ? 'All pairs.' : 'ELEVATED and HIGH only.'}
        </p>
      </div>
    </header>
    <table class="alive-list-table">
      <thead>
        <tr>
          <th>Pair</th>
          <th class="alive-total">Co</th>
          <th class="alive-total">G1</th>
          <th class="alive-total">G2 pos</th>
          <th class="alive-total">G2</th>
          <th class="alive-total">G3 pos</th>
          <th class="alive-total">G3</th>
          <th>Heat</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
    ${reportFooterHtml()}`;

  return buildReportDocument('Bracket Conflicts', html, filename);
}
