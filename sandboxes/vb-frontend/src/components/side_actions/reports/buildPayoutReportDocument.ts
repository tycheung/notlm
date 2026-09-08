import type { PayoutReport } from '../../../api/side-actions';
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
import {
  paginateColumnRowSlices,
  signupSheetUsesLandscape,
} from '../../../utils/signupSheetLayout';

const PAYOUT_ROWS_PER_PAGE = 22;

export type PayoutReportDocumentOptions = {
  includeEntered?: boolean;
  includeCollected?: boolean;
};

type PrintRow = PayoutReport['rows'][number] & {
  row_kind?: 'bowler' | 'team' | 'section';
  is_header?: boolean;
  nested?: boolean;
};

function flattenPrintRows(report: PayoutReport): PrintRow[] {
  const rows = (report.rows ?? []) as PrintRow[];
  if (report.group_by === 'team') {
    return rows;
  }
  const teams = rows.filter((row) => row.row_kind === 'team');
  const bowlers = rows.filter((row) => row.row_kind !== 'team');
  const out: PrintRow[] = [];
  if (teams.length > 0) {
    out.push({
      user_id: 0,
      display_name: 'Teams',
      row_kind: 'section',
      payouts: {},
      total_entered: 0,
      total_collected: 0,
      total_owed: 0,
    });
    out.push(...teams);
  }
  if (bowlers.length > 0) {
    if (teams.length > 0) {
      out.push({
        user_id: 0,
        display_name: 'Bowlers',
        row_kind: 'section',
        payouts: {},
        total_entered: 0,
        total_collected: 0,
        total_owed: 0,
      });
    }
    out.push(...bowlers);
  }
  return out.length > 0 ? out : rows;
}

type PayoutColumn = PayoutReport['side_actions'][number];

function colCount(
  columns: PayoutColumn[],
  opts: { includeEntered: boolean; includeCollected: boolean; includeTotals: boolean }
): number {
  return (
    1 +
    columns.length +
    (opts.includeTotals && opts.includeEntered ? 1 : 0) +
    (opts.includeTotals && opts.includeCollected ? 1 : 0) +
    (opts.includeTotals ? 2 : 0)
  );
}

function headerCells(
  columns: PayoutColumn[],
  opts: {
    includeEntered: boolean;
    includeCollected: boolean;
    includeTotals: boolean;
    groupByTeam: boolean;
  }
): string {
  const nameHeader = opts.groupByTeam ? 'Team / Bowler' : 'Name';
  return [
    `<th class="col-name">${nameHeader}</th>`,
    ...columns.map((column) => {
      const notReady = column.payout_ready === false;
      const reason = column.payout_not_ready_reason;
      const teamMark = column.entry_unit === 'team' ? '<span class="payout-col-team">Team</span>' : '';
      return `<th class="col-money payout-sa"><span class="payout-col-title">${escapeHtml(
        column.name
      )}</span>${teamMark}${
        notReady
          ? `<span class="payout-readiness">Not ready${reason ? ` — ${escapeHtml(reason)}` : ''}</span>`
          : ''
      }</th>`;
    }),
    opts.includeTotals && opts.includeEntered ? '<th class="col-money">Entered</th>' : '',
    opts.includeTotals && opts.includeCollected ? '<th class="col-money">Collected</th>' : '',
    opts.includeTotals ? '<th class="col-money">Owed</th>' : '',
    opts.includeTotals ? '<th class="col-signature">Signature</th>' : '',
  ].join('');
}

function moneyCell(column: PayoutColumn, row: PrintRow): string {
  if (column.payout_ready === false) {
    return '<td class="col-money payout-not-ready">Not ready</td>';
  }
  const raw = row.payouts?.[String(column.side_action_id)];
  if (typeof raw === 'string') {
    return `<td class="col-money payout-not-ready">${escapeHtml(raw)}</td>`;
  }
  const amount = Number(raw || 0);
  const unit = column.entry_unit === 'team' ? 'team' : 'bowler';
  const kind = row.row_kind === 'team' ? 'team' : 'bowler';
  if (unit !== kind && amount === 0) {
    return '<td class="col-money payout-na">—</td>';
  }
  return `<td class="col-money">${escapeHtml(formatMoney(amount))}</td>`;
}

function bodyRows(
  rows: PrintRow[],
  columns: PayoutColumn[],
  opts: {
    includeEntered: boolean;
    includeCollected: boolean;
    includeTotals: boolean;
    groupByTeam: boolean;
  }
): string {
  const span = colCount(columns, opts);
  return rows
    .map((row) => {
      if (row.row_kind === 'section') {
        return `<tr class="payout-section"><td colspan="${span}">${escapeHtml(
          row.display_name || ''
        )}</td></tr>`;
      }
      const isTeam = row.row_kind === 'team';
      const isHeader = Boolean(row.is_header);
      const nested = Boolean(row.nested);
      const rowClass = [
        isTeam ? 'payout-row-team' : 'payout-row-bowler',
        isHeader ? 'payout-row-header' : '',
        nested ? 'payout-row-nested' : '',
      ]
        .filter(Boolean)
        .join(' ');

      if (isHeader) {
        return `<tr class="${rowClass}">
          <td class="col-name" colspan="${span}">${escapeHtml(row.display_name || '')}</td>
        </tr>`;
      }

      const saCells = columns.map((column) => moneyCell(column, row)).join('');
      const enteredCell =
        opts.includeTotals && opts.includeEntered
          ? `<td class="col-money">${escapeHtml(formatMoney(row.total_entered))}</td>`
          : '';
      const collectedCell =
        opts.includeTotals && opts.includeCollected
          ? `<td class="col-money">${escapeHtml(formatMoney(row.total_collected))}</td>`
          : '';
      const teamBadge = isTeam ? '<span class="payout-team-badge">Team</span>' : '';
      const owedCell = opts.includeTotals
        ? `<td class="col-money col-owed">${escapeHtml(formatMoney(row.total_owed))}</td>`
        : '';
      const signatureCell = opts.includeTotals ? '<td class="col-signature"></td>' : '';
      return `<tr class="${rowClass}">
        <td class="col-name">${teamBadge}${escapeHtml(row.display_name || '')}</td>
        ${saCells}
        ${enteredCell}
        ${collectedCell}
        ${owedCell}
        ${signatureCell}
      </tr>`;
    })
    .join('');
}

function noteText(opts: {
  includeEntered: boolean;
  includeCollected: boolean;
  groupByTeam: boolean;
  teamHeaderPayouts: boolean;
}): string {
  const parts = [
    'Per side action: refunds + winnings (brackets) or place prizes (high games).',
    'Team pots (including team brackets) pay on a Team line only.',
  ];
  if (opts.groupByTeam) {
    parts.push(
      opts.teamHeaderPayouts
        ? 'Grouped by team: team header shows team-only payouts; bowlers listed underneath.'
        : 'Grouped by team: team name is a header only; bowlers listed underneath.'
    );
  } else {
    parts.push('Teams are listed first (A–Z), then bowlers (A–Z).');
  }
  if (opts.includeEntered) parts.push('Entered = fees billed for that line.');
  if (opts.includeCollected) parts.push('Collected = fees paid (bowler lines).');
  parts.push('Owed = cash to pay on that line. Sign when paid.');
  return parts.join(' ');
}

function buildPageChrome(
  report: PayoutReport,
  dateLabel: string,
  pageIndex: number,
  pageCount: number,
  columnRangeLabel: string | null,
  groupByTeam: boolean
): string {
  const pageMeta = pageCount > 1 ? `<div>Page ${pageIndex + 1}/${pageCount}</div>` : '';
  const columnMeta = columnRangeLabel
    ? `<div>${escapeHtml(columnRangeLabel)}</div>`
    : '';
  return `
    <header class="report-header">
      <div>
        <h1 class="report-title">${escapeHtml(report.event_name)}</h1>
        <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
        <div class="report-doc-label">Side Action Payout Report${
          groupByTeam ? ' (by team)' : ''
        }</div>
      </div>
      <div class="report-meta">
        <div>${escapeHtml(dateLabel)}</div>
        ${columnMeta}
        ${pageMeta}
      </div>
    </header>
  `;
}

export function buildPayoutReportDocument(
  report: PayoutReport,
  options: PayoutReportDocumentOptions = {}
): ReportDocument {
  const includeEntered = options.includeEntered !== false;
  const includeCollected = options.includeCollected !== false;
  const groupByTeam = report.group_by === 'team';
  const teamHeaderPayouts = report.team_header_payouts !== false;
  const printRows = flattenPrintRows(report);

  const title = `Payout Report — ${report.event_name}`;
  const filename = reportSuggestedFilename(
    'payout',
    report.event_name,
    report.tournament_name,
    formatFilenameDate()
  );
  const dateLabel = formatDateOnly();
  const columns = report.side_actions;
  const slices = paginateColumnRowSlices(printRows, columns, PAYOUT_ROWS_PER_PAGE);
  const landscape = signupSheetUsesLandscape(columns.length);
  const bodyClass = landscape
    ? 'payout-sheet-doc payout-sheet-landscape'
    : 'payout-sheet-doc payout-sheet-portrait';

  const pagesHtml = slices
    .map((slice) => {
      const includeTotals = slice.includeTrailingTotals;
      const colOpts = {
        includeEntered,
        includeCollected,
        includeTotals,
        groupByTeam,
      };
      const emptyNote =
        slice.rows.length === 0
          ? `<p class="report-note">No entrants with money in or payouts due.</p>`
          : '';
      return `
      <section class="payout-report-page payout-sheet-slice">
        ${buildPageChrome(
          report,
          dateLabel,
          slice.pageIndex,
          slice.totalPages,
          slice.columnRangeLabel,
          groupByTeam
        )}
        <p class="report-note">
          ${escapeHtml(noteText({ includeEntered, includeCollected, groupByTeam, teamHeaderPayouts }))}
        </p>
        ${emptyNote}
        <table class="report-table payout-report-table">
          <thead><tr>${headerCells(slice.columns, colOpts)}</tr></thead>
          <tbody>${bodyRows(slice.rows, slice.columns, colOpts)}</tbody>
        </table>
        ${reportFooterHtml()}
      </section>`;
    })
    .join('');

  return buildReportDocument(title, pagesHtml, filename, {
    pageSize: landscape ? 'letter landscape' : 'letter portrait',
    bodyClass,
  });
}
