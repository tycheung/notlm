/** Last cashing (prize > 0) or advancing row; used for the standings cut/cash line. */
export function cutLineAfterIndex(
  rows: Array<{ prize_amount?: number | null; standing_status?: string | null }>,
  showCutLine: boolean,
  backendIndex?: number | null
): number | null {
  if (!showCutLine) return null;
  if (backendIndex != null && backendIndex >= 0) return backendIndex;
  let last: number | null = null;
  rows.forEach((row, idx) => {
    const prize = row.prize_amount;
    if ((prize != null && Number(prize) > 0) || row.standing_status === 'advance') {
      last = idx;
    }
  });
  return last;
}
