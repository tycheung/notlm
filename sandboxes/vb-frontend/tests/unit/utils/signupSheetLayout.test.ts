import { describe, expect, it } from 'vitest';

import {
  SIGNUP_SHEET_COUNT_CELL_MIN_INCHES,
  SIGNUP_SHEET_LANDSCAPE_COLUMNS_PER_PAGE,
  paginateColumnRowSlices,
  signupSheetColumnChunks,
  signupSheetColumnRangeLabel,
  signupSheetUsesLandscape,
} from '@/utils/signupSheetLayout';

describe('signupSheetLayout', () => {
  it('keeps portrait layout for a small column count', () => {
    expect(signupSheetUsesLandscape(7)).toBe(false);
    expect(signupSheetColumnChunks(Array.from({ length: 7 }, (_, i) => i))).toHaveLength(1);
  });

  it('splits wide sheets into landscape chunks', () => {
    expect(signupSheetUsesLandscape(8)).toBe(true);
    const chunks = signupSheetColumnChunks(Array.from({ length: 25 }, (_, i) => i));
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(10);
    expect(chunks[1]).toHaveLength(10);
    expect(chunks[2]).toHaveLength(5);
  });

  it('labels column ranges for multi-slice pages', () => {
    expect(signupSheetColumnRangeLabel(0, 10, 25)).toBe('Side actions 1–10 of 25');
    expect(signupSheetColumnRangeLabel(2, 10, 25)).toBe('Side actions 21–25 of 25');
    expect(signupSheetColumnRangeLabel(0, 7, 5)).toBeNull();
  });

  it('reserves enough width per count cell for four digits', () => {
    // 0.72in @ 8pt tabular ≈ 52px content after padding; "1000" ≈ 22–28px.
    expect(SIGNUP_SHEET_COUNT_CELL_MIN_INCHES).toBeGreaterThanOrEqual(0.72);
    const landscapeWidth =
      1.35 + SIGNUP_SHEET_LANDSCAPE_COLUMNS_PER_PAGE * SIGNUP_SHEET_COUNT_CELL_MIN_INCHES + 0.58;
    expect(landscapeWidth).toBeLessThanOrEqual(10);
  });

  it('paginates row and column slices together', () => {
    const rows = Array.from({ length: 25 }, (_, index) => index);
    const columns = Array.from({ length: 12 }, (_, index) => index);
    const slices = paginateColumnRowSlices(rows, columns, 10);
    expect(slices).toHaveLength(6);
    expect(slices[0].rows).toHaveLength(10);
    expect(slices[0].columns).toHaveLength(10);
    expect(slices[0].includeTrailingTotals).toBe(false);
    expect(slices[1].includeTrailingTotals).toBe(true);
    expect(slices[5].pageIndex).toBe(5);
    expect(slices[5].totalPages).toBe(6);
  });
});
