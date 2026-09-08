/** Pair-only helpers mirroring backend services/lanes/pairs.py */

export type LanePair = [number, number];

export function normalizePair(low: number, high: number): LanePair {
  let a = Math.trunc(low);
  let b = Math.trunc(high);
  if (a <= 0 || b <= 0) {
    throw new Error('Lane numbers must be >= 1');
  }
  if (a > b) {
    const tmp = a;
    a = b;
    b = tmp;
  }
  if (b !== a + 1 || a % 2 === 0) {
    throw new Error(`Invalid pair (${low}, ${high})`);
  }
  return [a, b];
}

export function pairsFromLanes(lanes: number[]): LanePair[] {
  const ordered = [...new Set(lanes.map((n) => Math.trunc(n)).filter((n) => n > 0))].sort(
    (a, b) => a - b
  );
  const pairs: LanePair[] = [];
  for (let i = 0; i < ordered.length; i += 2) {
    if (i + 1 >= ordered.length) {
      throw new Error(`Lone lane ${ordered[i]} is not allowed; toggle pairs only`);
    }
    pairs.push(normalizePair(ordered[i], ordered[i + 1]));
  }
  return pairs;
}

export function lanesFromPairs(pairs: LanePair[]): number[] {
  const lanes = new Set<number>();
  for (const [low, high] of pairs) {
    const pair = normalizePair(low, high);
    lanes.add(pair[0]);
    lanes.add(pair[1]);
  }
  return [...lanes].sort((a, b) => a - b);
}

export function pairsToExpression(pairs: LanePair[]): string {
  const lanes = lanesFromPairs(pairs);
  if (!lanes.length) return '';
  const ranges: string[] = [];
  let start = lanes[0];
  let prev = lanes[0];
  for (let i = 1; i < lanes.length; i += 1) {
    const lane = lanes[i];
    if (lane === prev + 1) {
      prev = lane;
      continue;
    }
    ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    start = prev = lane;
  }
  ranges.push(start === prev ? String(start) : `${start}-${prev}`);
  return ranges.join(', ');
}

/** All odd-even pairs available for a bowling center. */
export function allCenterPairs(centerLaneCount: number): LanePair[] {
  const count = Math.max(0, Math.trunc(centerLaneCount));
  const pairs: LanePair[] = [];
  for (let lane = 1; lane + 1 <= count; lane += 2) {
    pairs.push([lane, lane + 1]);
  }
  return pairs;
}

export function togglePair(pairs: LanePair[], pair: LanePair): LanePair[] {
  const target = normalizePair(pair[0], pair[1]);
  const key = `${target[0]}-${target[1]}`;
  const existing = new Map(pairs.map((p) => [`${p[0]}-${p[1]}`, p] as const));
  if (existing.has(key)) {
    existing.delete(key);
  } else {
    existing.set(key, target);
  }
  return [...existing.values()].sort((a, b) => a[0] - b[0]);
}

export function parsePairsFromExpression(expression: string): LanePair[] {
  const cleaned = expression.replace(/[^0-9,;\-/\s]/g, '');
  const normalized = cleaned.replace(/[;/]+/g, ',').replace(/\s+/g, '');
  if (!normalized) return [];
  const lanes = new Set<number>();
  for (const token of normalized.split(',').filter(Boolean)) {
    if (token.includes('-')) {
      const [a, b] = token.split('-').map((n) => Number(n));
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const low = Math.min(a, b);
      const high = Math.max(a, b);
      for (let lane = low; lane <= high; lane += 1) {
        if (lane > 0) lanes.add(lane);
      }
    } else {
      const lane = Number(token);
      if (Number.isFinite(lane) && lane > 0) lanes.add(lane);
    }
  }
  return pairsFromLanes([...lanes]);
}
