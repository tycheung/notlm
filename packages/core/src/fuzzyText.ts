export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur = row[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = (row[j] ?? 0) + 1;
      const ins = (row[j - 1] ?? 0) + 1;
      const sub = prev + cost;
      row[j] = Math.min(del, ins, sub);
      prev = cur;
    }
  }
  return row[b.length] ?? b.length;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when `needle` appears as a whole-token / word-boundary span in `haystack`. */
export function hasTokenBoundaryMatch(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase().trim();
  const n = needle.toLowerCase().trim();
  if (!n || !h) return false;
  if (h === n) return true;
  const re = new RegExp(`(?:^|\\s)${escapeRegExp(n)}(?:\\s|$)`);
  return re.test(h);
}
