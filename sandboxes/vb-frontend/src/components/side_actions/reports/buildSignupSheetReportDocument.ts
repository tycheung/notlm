import type { SignupSheetReport } from '../../../api/side-actions';
import {
  SIGNUP_SHEET_BLANK_ROWS_PER_PAGE,
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
import {
  paginateColumnRowSlices,
  signupSheetUsesLandscape,
} from '../../../utils/signupSheetLayout';

export type SignupEntryCellsMode = 'current' | 'blank';

export interface SignupSheetPrintOptions {
  /** Show counts / $ totals from the system, or leave cells empty for handwriting */
  entryCells: SignupEntryCellsMode;
  /** Blank-name mode only: number of full pages (from the UI control, not row math). */
  blankPages?: number;
}

type SignupColumn = SignupSheetReport['side_actions'][number];

/** Brackets: entries × fee. Other types: fee × 1 when enrolled (any count > 0). */
function rowAmountForColumn(
  sideActionType: string,
  entryCount: number,
  entryFee: number
): number {
  if (entryCount <= 0 || entryFee <= 0) return 0;
  if (sideActionType === 'bracket') {
    return entryCount * entryFee;
  }
  return entryFee;
}

function rowTotalAmount(
  report: SignupSheetReport,
  row: SignupSheetReport['rows'][number],
  showEntries: boolean
): number {
  if (!showEntries) return 0;
  return report.side_actions.reduce((sum, column) => {
    const key = `${column.side_action_id}:${column.pool_id}`;
    const raw = row.counts?.[key];
    const count = typeof raw === 'number' ? raw : 0;
    return sum + rowAmountForColumn(column.side_action_type, count, column.entry_fee);
  }, 0);
}

function buildHeaderCells(
  columns: SignupColumn[],
  includeTotal: boolean
): string {
  return [
    '<th class="col-name">Name</th>',
    ...columns.map(
      (column) =>
        `<th class="col-count"><span class="signup-col-title">${escapeHtml(column.name)}</span><div class="signup-col-sub">${escapeHtml(column.squad_name)} · $${column.entry_fee.toFixed(2)}</div></th>`
    ),
    includeTotal ? '<th class="col-total">Total</th>' : '',
  ].join('');
}

function buildBodyRows(
  report: SignupSheetReport,
  rows: SignupSheetReport['rows'],
  columns: SignupColumn[],
  showEntries: boolean,
  includeTotal: boolean
): string {
  return rows
    .map((row) => {
      const countCells = columns
        .map((column) => {
          const key = `${column.side_action_id}:${column.pool_id}`;
          const raw = row.counts?.[key];
          const count = typeof raw === 'number' ? raw : 0;
          const shown = showEntries && count > 0 ? String(count) : '';
          return `<td class="col-count signup-count-cell">${escapeHtml(shown)}</td>`;
        })
        .join('');

      const totalAmount = rowTotalAmount(report, row, showEntries);
      const totalShown =
        includeTotal && showEntries && totalAmount > 0
          ? formatMoneyAlways(totalAmount)
          : '';

      return `<tr>
        <td class="col-name">${escapeHtml(row.display_name || '')}</td>
        ${countCells}
        ${includeTotal ? `<td class="col-total">${escapeHtml(totalShown)}</td>` : ''}
      </tr>`;
    })
    .join('');
}

function emptyBlankRows(count: number, columns: SignupColumn[]) {
  return Array.from({ length: count }, () => ({
    user_id: null,
    display_name: '',
    counts: Object.fromEntries(
      columns.map((column) => [`${column.side_action_id}:${column.pool_id}`, null])
    ),
    total: null,
  }));
}

function buildPageChrome(
  report: SignupSheetReport,
  dateLabel: string,
  pageIndex: number,
  pageCount: number,
  columnRangeLabel: string | null
): string {
  const pageMeta =
    pageCount > 1
      ? `<div>Page ${pageIndex + 1} of ${pageCount}</div>`
      : '';
  const columnMeta = columnRangeLabel
    ? `<div>${escapeHtml(columnRangeLabel)}</div>`
    : '';
  return `
    <header class="report-header">
      <div>
        <h1 class="report-title">${escapeHtml(report.event_name)}</h1>
        <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
        <div class="report-doc-label">Side Action Sign-up Sheet</div>
      </div>
      <div class="report-meta">
        <div>${escapeHtml(dateLabel)}</div>
        ${columnMeta}
        ${pageMeta}
      </div>
    </header>
    <p class="report-note">
      Enter counts under each side action. Total = $ owed (brackets: entries × fee; others: fee when entered).
    </p>
  `;
}

function signupSheetFilename(report: SignupSheetReport): string {
  return reportSuggestedFilename(
    'Side_Action_Signup_Sheet',
    report.event_name,
    report.tournament_name,
    formatFilenameDate()
  );
}

function buildSignupPages(
  report: SignupSheetReport,
  options: {
    showEntries: boolean;
    rows: SignupSheetReport['rows'];
    rowsPerPage: number;
    blankMode: boolean;
  }
): string {
  const slices = paginateColumnRowSlices(
    options.rows,
    report.side_actions,
    options.rowsPerPage
  );

  return slices
    .map((slice) => {
      const includeTotal = slice.includeTrailingTotals;
      const headerCells = buildHeaderCells(slice.columns, includeTotal);
      const fillClass = options.blankMode ? ' report-table-fill' : '';
      const sectionClass = options.blankMode
        ? 'signup-blank-page signup-sheet-slice'
        : 'signup-roster-page signup-sheet-slice';
      return `
        <section class="${sectionClass}">
          ${buildPageChrome(
            report,
            formatDateOnly(),
            slice.pageIndex,
            slice.totalPages,
            slice.columnRangeLabel
          )}
          <table class="report-table signup-sheet-table${fillClass}">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${buildBodyRows(
              report,
              slice.rows,
              slice.columns,
              options.showEntries,
              includeTotal
            )}</tbody>
          </table>
          ${reportFooterHtml()}
        </section>
      `;
    })
    .join('');
}

export function buildSignupSheetReportDocument(
  report: SignupSheetReport,
  options: SignupSheetPrintOptions = { entryCells: 'current' }
): ReportDocument {
  const showEntries = options.entryCells === 'current' && report.mode === 'roster';
  const title = `Sign-up Sheet — ${report.event_name}`;
  const filename = signupSheetFilename(report);
  const landscape = signupSheetUsesLandscape(report.side_actions.length);
  const bodyClass = landscape
    ? 'signup-sheet-doc signup-sheet-landscape'
    : 'signup-sheet-doc signup-sheet-portrait';

  if (report.mode === 'blank') {
    const rawPages = options.blankPages ?? report.blank_pages ?? 1;
    const blankPageCount = Math.min(20, Math.max(1, Math.floor(Number(rawPages)) || 1));
    const blankRows = Array.from({ length: blankPageCount }, () =>
      emptyBlankRows(SIGNUP_SHEET_BLANK_ROWS_PER_PAGE, report.side_actions)
    ).flat();
    const pageHtml = buildSignupPages(report, {
      showEntries: false,
      rows: blankRows,
      rowsPerPage: SIGNUP_SHEET_BLANK_ROWS_PER_PAGE,
      blankMode: true,
    });
    return buildReportDocument(title, pageHtml, filename, {
      pageSize: landscape ? 'letter landscape' : 'letter portrait',
      bodyClass,
    });
  }

  const pageHtml = buildSignupPages(report, {
    showEntries,
    rows: report.rows,
    rowsPerPage: SIGNUP_SHEET_BLANK_ROWS_PER_PAGE,
    blankMode: false,
  });

  return buildReportDocument(title, pageHtml, filename, {
    pageSize: landscape ? 'letter landscape' : 'letter portrait',
    bodyClass,
  });
}
