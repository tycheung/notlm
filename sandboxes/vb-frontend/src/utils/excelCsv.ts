/**
 * Excel-friendly CSV (UTF-8 BOM). Excel opens .csv from this helper without a real .xlsx.
 */

export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): string {
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ];
  return lines.join('\r\n');
}

export function csvBlobForExcel(csvBody: string): Blob {
  const text = csvBody.startsWith('\uFEFF') ? csvBody : `\uFEFF${csvBody}`;
  return new Blob([text], { type: 'text/csv;charset=utf-8' });
}
