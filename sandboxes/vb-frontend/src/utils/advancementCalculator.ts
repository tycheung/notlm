/** e.g. 1 → "1st", 11 → "11th" */
export function formatPlacementOrdinal(n: number): string {
  const x = Math.floor(Math.abs(n));
  const j = x % 10;
  const k = x % 100;
  if (j === 1 && k !== 11) return `${x}st`;
  if (j === 2 && k !== 12) return `${x}nd`;
  if (j === 3 && k !== 13) return `${x}rd`;
  return `${x}th`;
}
