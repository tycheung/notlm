/** Side-action columns that fit on one letter page without horizontal overlap. */
export const SIGNUP_SHEET_PORTRAIT_MAX_COLUMNS = 7;
export const SIGNUP_SHEET_LANDSCAPE_COLUMNS_PER_PAGE = 10;

/**
 * Minimum width (inches) for entry-count cells so four digits (e.g. bracket qty 1000)
 * fit at 8pt tabular figures with horizontal padding.
 */
export const SIGNUP_SHEET_COUNT_CELL_MIN_INCHES = 0.72;

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const chunkSize = Math.max(1, Math.floor(size));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

export function signupSheetUsesLandscape(columnCount: number): boolean {
  return columnCount > SIGNUP_SHEET_PORTRAIT_MAX_COLUMNS;
}

export function signupSheetColumnsPerPage(columnCount: number): number {
  if (columnCount <= SIGNUP_SHEET_PORTRAIT_MAX_COLUMNS) {
    return columnCount;
  }
  return SIGNUP_SHEET_LANDSCAPE_COLUMNS_PER_PAGE;
}

export function signupSheetColumnChunks<T>(columns: T[]): T[][] {
  if (columns.length === 0) return [[]];
  const perPage = signupSheetColumnsPerPage(columns.length);
  return chunkArray(columns, perPage);
}

export function signupSheetColumnRangeLabel(
  chunkIndex: number,
  columnsPerChunk: number,
  totalColumns: number
): string | null {
  if (totalColumns <= columnsPerChunk) return null;
  const start = chunkIndex * columnsPerChunk + 1;
  const end = Math.min(totalColumns, (chunkIndex + 1) * columnsPerChunk);
  return `Side actions ${start}–${end} of ${totalColumns}`;
}

export interface ColumnRowPageSlice<TRow, TColumn> {
  rows: TRow[];
  columns: TColumn[];
  rowChunkIndex: number;
  columnChunkIndex: number;
  includeTrailingTotals: boolean;
  columnRangeLabel: string | null;
  pageIndex: number;
  totalPages: number;
}

/** Cartesian pagination: row pages × column slices (signup/payout sheets). */
export function paginateColumnRowSlices<TRow, TColumn>(
  rows: TRow[],
  columns: TColumn[],
  rowsPerPage: number
): ColumnRowPageSlice<TRow, TColumn>[] {
  const rowChunks = chunkArray(rows, rowsPerPage);
  const columnChunks = signupSheetColumnChunks(columns);
  const columnsPerPage = signupSheetColumnsPerPage(columns.length);
  const totalPages = rowChunks.length * columnChunks.length;
  const slices: ColumnRowPageSlice<TRow, TColumn>[] = [];
  let pageIndex = 0;
  for (let rowChunkIndex = 0; rowChunkIndex < rowChunks.length; rowChunkIndex += 1) {
    for (
      let columnChunkIndex = 0;
      columnChunkIndex < columnChunks.length;
      columnChunkIndex += 1
    ) {
      slices.push({
        rows: rowChunks[rowChunkIndex],
        columns: columnChunks[columnChunkIndex],
        rowChunkIndex,
        columnChunkIndex,
        includeTrailingTotals: columnChunkIndex === columnChunks.length - 1,
        columnRangeLabel: signupSheetColumnRangeLabel(
          columnChunkIndex,
          columnsPerPage,
          columns.length
        ),
        pageIndex,
        totalPages,
      });
      pageIndex += 1;
    }
  }
  return slices;
}
