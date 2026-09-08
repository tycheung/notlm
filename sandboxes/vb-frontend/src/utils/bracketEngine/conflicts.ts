import { BOT_HALF, G1_PAIRS, G2_POTENTIAL_PAIRS, TOP_HALF } from './constants';
import type { Bracket, BracketMatch, PlayerId } from './types';

export type ConflictHeatLevel = 'OK' | 'ELEVATED' | 'HIGH';

export interface BracketConflictRow {
  a: PlayerId;
  b: PlayerId;
  co: number;
  g1: number;
  g2pot: number;
  g2act: number;
  g3pot: number;
  g3act: number;
  heat: ConflictHeatLevel;
}

export function maxExpectedG1(co: number): number {
  return Math.ceil(co * (4 / 7));
}

export function classifyG1Heat(co: number, g1: number): ConflictHeatLevel {
  const expected = maxExpectedG1(co);
  if (g1 > expected * 1.5) return 'HIGH';
  if (g1 > expected) return 'ELEVATED';
  return 'OK';
}

function pairKey(a: PlayerId, b: PlayerId): string {
  const lo = a < b ? a : b;
  const hi = a < b ? b : a;
  return `${lo}|${hi}`;
}

function recordPair(
  map: Record<string, number>,
  a: PlayerId,
  b: PlayerId,
  delta = 1
): void {
  if (!a || !b || a === b) return;
  const key = pairKey(a, b);
  map[key] = (map[key] ?? 0) + delta;
}

function resolvedMatchup(match: BracketMatch | undefined): [PlayerId, PlayerId] | null {
  if (!match?.winner || match.p1 == null || match.p2 == null) return null;
  return [match.p1, match.p2];
}

/**
 * Full pairwise conflict report across all generated brackets (handoff Layer 3).
 * Returns every bowler pair that shares at least one bracket, sorted by g1 desc then co desc.
 */
export function computeConflicts(brackets: Bracket[]): BracketConflictRow[] {
  const coOccur: Record<string, number> = {};
  const g1Act: Record<string, number> = {};
  const g2Pot: Record<string, number> = {};
  const g3Pot: Record<string, number> = {};
  const g2Act: Record<string, number> = {};
  const g3Act: Record<string, number> = {};

  for (const bracket of brackets) {
    const participants = bracket.seating;
    if (!participants || participants.length < 8) continue;

    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        recordPair(coOccur, participants[i], participants[j]);
      }
    }

    for (const [seatA, seatB] of G1_PAIRS) {
      recordPair(g1Act, participants[seatA], participants[seatB]);
    }

    for (const [seatA, seatB] of G2_POTENTIAL_PAIRS) {
      recordPair(g2Pot, participants[seatA], participants[seatB]);
    }

    for (const seatA of TOP_HALF) {
      for (const seatB of BOT_HALF) {
        recordPair(g3Pot, participants[seatA], participants[seatB]);
      }
    }

    for (const match of bracket.rounds[1]?.matches ?? []) {
      const pair = resolvedMatchup(match);
      if (pair) recordPair(g2Act, pair[0], pair[1]);
    }

    const finalPair = resolvedMatchup(bracket.rounds[2]?.matches[0]);
    if (finalPair) recordPair(g3Act, finalPair[0], finalPair[1]);
  }

  return Object.entries(coOccur)
    .map(([key, co]) => {
      const [aRaw, bRaw] = key.split('|');
      const a = Number(aRaw);
      const b = Number(bRaw);
      const g1 = g1Act[key] ?? 0;
      return {
        a,
        b,
        co,
        g1,
        g2pot: g2Pot[key] ?? 0,
        g2act: g2Act[key] ?? 0,
        g3pot: g3Pot[key] ?? 0,
        g3act: g3Act[key] ?? 0,
        heat: classifyG1Heat(co, g1),
      };
    })
    .sort((left, right) => right.g1 - left.g1 || right.co - left.co);
}

export function summarizeConflicts(rows: BracketConflictRow[]): {
  total: number;
  high: number;
  elevated: number;
  ok: number;
} {
  let high = 0;
  let elevated = 0;
  let ok = 0;
  for (const row of rows) {
    if (row.heat === 'HIGH') high += 1;
    else if (row.heat === 'ELEVATED') elevated += 1;
    else ok += 1;
  }
  return { total: rows.length, high, elevated, ok };
}
