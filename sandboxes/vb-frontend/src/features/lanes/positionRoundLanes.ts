/** Position-round place → physical lane (mirrors backend position_round_lanes). */

import type { LanePair } from './types';

export type PositionRoundLanePlacement =
  | 'start_low'
  | 'start_high'
  | 'start_middle'
  | 'random';

function physicalPairs(
  teamCount: number,
  pairsInPlay?: LanePair[] | null
): LanePair[] {
  const numPairs = Math.max(1, Math.floor(teamCount / 2));
  if (pairsInPlay && pairsInPlay.length) {
    if (pairsInPlay.length !== numPairs) {
      throw new Error(
        `Expected ${numPairs} pairs in play for ${teamCount} teams; found ${pairsInPlay.length}`
      );
    }
    return pairsInPlay.map(([low, high]) => [Number(low), Number(high)]);
  }
  return Array.from({ length: numPairs }, (_, i) => {
    const low = i * 2 + 1;
    return [low, low + 1] as LanePair;
  });
}

export function orderedPairColumnsForPlacement(input: {
  teamCount: number;
  placement: string;
  pairsInPlay?: LanePair[] | null;
  rngSeed?: number | null;
}): LanePair[] {
  const physical = physicalPairs(input.teamCount, input.pairsInPlay);
  const n = physical.length;
  const mode = String(input.placement || 'start_low').trim().toLowerCase();

  if (mode === 'start_high') {
    return [...physical].reverse();
  }

  if (mode === 'start_middle') {
    if (n === 0) return [];
    const mid = Math.floor((n - 1) / 2);
    const order: number[] = [mid];
    let left = mid - 1;
    let right = mid + 1;
    while (left >= 0 || right < n) {
      if (left >= 0) {
        order.push(left);
        left -= 1;
      }
      if (right < n) {
        order.push(right);
        right += 1;
      }
    }
    return order.map((i) => physical[i]);
  }

  if (mode === 'random') {
    const cols = [...physical];
    // Deterministic LCG shuffle from rngSeed (stable previews).
    let state = (input.rngSeed ?? 0) >>> 0;
    const next = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x100000000;
    };
    for (let i = cols.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [cols[i], cols[j]] = [cols[j], cols[i]];
    }
    return cols;
  }

  return physical;
}

export function positionRoundLaneForPlace(
  place: number,
  input: {
    teamCount: number;
    placement?: string;
    pairsInPlay?: LanePair[] | null;
    rngSeed?: number | null;
  }
): { pair: LanePair; lane: number } {
  if (place < 1) throw new Error('place must be >= 1');
  const columns = orderedPairColumnsForPlacement({
    teamCount: input.teamCount,
    placement: input.placement ?? 'start_low',
    pairsInPlay: input.pairsInPlay,
    rngSeed: input.rngSeed,
  });
  if (!columns.length) {
    throw new Error('No physical pairs available for position-round lanes');
  }
  const pairIndex = Math.floor((place - 1) / 2);
  if (pairIndex >= columns.length) {
    throw new Error(
      `Place ${place} exceeds field size for ${input.teamCount} teams`
    );
  }
  const pair = columns[pairIndex];
  const isLeft = place % 2 === 1;
  const lane = isLeft ? pair[0] : pair[1];
  return { pair, lane };
}

/** Stable seed so random placement previews match across refreshes. */
export function stableRngSeedForRound(roundId: number, gameNumber: number): number {
  const raw = `${Math.trunc(roundId)}:${Math.trunc(gameNumber)}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function resolvePositionRoundLanePlacement(
  raw: unknown
): PositionRoundLanePlacement {
  const mode = String(raw || 'start_low').trim().toLowerCase();
  if (
    mode === 'start_low' ||
    mode === 'start_high' ||
    mode === 'start_middle' ||
    mode === 'random'
  ) {
    return mode;
  }
  return 'start_low';
}
