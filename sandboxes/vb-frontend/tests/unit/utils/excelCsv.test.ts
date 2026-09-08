import { describe, expect, it } from 'vitest';

import { csvBlobForExcel, csvCell, rowsToCsv } from '@/utils/excelCsv';

describe('excelCsv', () => {
  it('quotes commas and doubles quotes', () => {
    expect(csvCell('Doe, Jane')).toBe('"Doe, Jane"');
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
  });

  it('joins rows as CSV', () => {
    expect(rowsToCsv(['A', 'B'], [[1, 'x']])).toBe('A,B\r\n1,x');
  });

  it('prefixes a UTF-8 BOM so Excel detects encoding', async () => {
    const blob = csvBlobForExcel('A,B');
    expect(blob.type).toContain('text/csv');
    expect(await blob.text()).toBe('\uFEFFA,B');
  });
});
