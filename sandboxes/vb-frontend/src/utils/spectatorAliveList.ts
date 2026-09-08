import type { Bracket, BracketMatch } from './bracketEngine/types';
import { displayBracketNumber } from './bracketDisplayNumber';
import { getStoredBrackets, getUserDisplayNames } from './sideActionBracketStorage';
import type { SideAction, SideActionPool } from '../types/side_action';

export interface SpectatorAliveListRow {
  userId: number;
  displayName: string;
  aliveCount: number;
  bracketNumbers: number[];
  firstCount: number;
  secondCount: number;
  splitCount: number;
}

export interface SpectatorAliveList {
  complete: boolean;
  bracketCount: number;
  rows: SpectatorAliveListRow[];
}

function scoreFor(value: string | undefined): string {
  return (value || '').trim();
}

function matchIsResolved(match: BracketMatch | undefined): boolean {
  if (!match?.p1 || !match?.p2) return false;
  if (match.winner != null) return true;
  if (match.tie) return true;
  return Boolean(scoreFor(match.s1) && scoreFor(match.s2));
}

function potIsComplete(bracket: Bracket): boolean {
  return matchIsResolved(bracket.rounds?.[2]?.matches?.[0]);
}

function finalPlaceForUser(
  bracket: Bracket,
  userId: number
): 'first' | 'second' | 'split' | null {
  const finalMatch = bracket.rounds?.[2]?.matches?.[0];
  if (!finalMatch || !potIsComplete(bracket)) return null;
  const inFinal =
    Number(finalMatch.p1) === userId || Number(finalMatch.p2) === userId;
  if (!inFinal) return null;
  if (finalMatch.tie) return 'split';
  if (finalMatch.winner != null && Number(finalMatch.winner) === userId) {
    return 'first';
  }
  if (finalMatch.winner != null) return 'second';
  const s1 = Number(scoreFor(finalMatch.s1));
  const s2 = Number(scoreFor(finalMatch.s2));
  if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 === s2) return null;
  const isP1 = Number(finalMatch.p1) === userId;
  const won = isP1 ? s1 > s2 : s2 > s1;
  return won ? 'first' : 'second';
}

/** A bowler is still "alive" in a pot if seated and the final is not resolved, or they reached the final. */
function isAliveInBracket(bracket: Bracket, userId: number): boolean {
  const seating = bracket.seating || [];
  if (!seating.some((id) => id != null && Number(id) === userId)) return false;
  if (!potIsComplete(bracket)) {
    // Still in the running if they haven't lost a completed match
    for (const round of bracket.rounds || []) {
      for (const match of round.matches || []) {
        if (!matchIsResolved(match)) continue;
        const p1 = Number(match.p1);
        const p2 = Number(match.p2);
        if (p1 !== userId && p2 !== userId) continue;
        if (match.tie) continue;
        if (match.winner != null && Number(match.winner) !== userId) return false;
        const s1 = Number(scoreFor(match.s1));
        const s2 = Number(scoreFor(match.s2));
        if (Number.isFinite(s1) && Number.isFinite(s2) && s1 !== s2) {
          const isP1 = p1 === userId;
          const won = isP1 ? s1 > s2 : s2 > s1;
          if (!won) return false;
        }
      }
    }
    return true;
  }
  return finalPlaceForUser(bracket, userId) != null;
}

function bracketNumber(bracket: Bracket, index: number, offset = 0): number {
  return displayBracketNumber(bracket, offset, index);
}

/**
 * Build a spectator live / place list from persisted pool brackets
 * (same source as PublicLiveBracketViewerModal — no TD report API).
 */
export function buildSpectatorAliveListFromPool(
  pool: SideActionPool,
  nameLookup?: Record<number, string>
): SpectatorAliveList {
  const brackets = getStoredBrackets({ bracket_engine: pool.bracket_engine });
  const offset = Number(pool.bracket_number_offset ?? 0);
  const names = {
    ...getUserDisplayNames({ bracket_engine: pool.bracket_engine }),
    ...(nameLookup || {}),
  };
  const complete = brackets.length > 0 && brackets.every((b) => potIsComplete(b));
  const byUser = new Map<number, SpectatorAliveListRow>();

  brackets.forEach((bracket, index) => {
    const num = bracketNumber(bracket, index, offset);
    const seated = new Set(
      (bracket.seating || [])
        .filter((id) => id != null)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    );
    for (const userId of seated) {
      let row = byUser.get(userId);
      if (!row) {
        row = {
          userId,
          displayName: names[userId] || `Bowler #${userId}`,
          aliveCount: 0,
          bracketNumbers: [],
          firstCount: 0,
          secondCount: 0,
          splitCount: 0,
        };
        byUser.set(userId, row);
      }
      if (complete) {
        const place = finalPlaceForUser(bracket, userId);
        if (place === 'first') {
          row.firstCount += 1;
          row.bracketNumbers.push(num);
        } else if (place === 'second') {
          row.secondCount += 1;
          row.bracketNumbers.push(num);
        } else if (place === 'split') {
          row.splitCount += 1;
          row.bracketNumbers.push(num);
        }
      } else if (isAliveInBracket(bracket, userId)) {
        row.aliveCount += 1;
        row.bracketNumbers.push(num);
      }
    }
  });

  const rows = Array.from(byUser.values())
    .filter((r) =>
      complete
        ? r.firstCount + r.secondCount + r.splitCount > 0
        : r.aliveCount > 0
    )
    .sort((a, b) => {
      const aTotal = complete
        ? a.firstCount + a.secondCount + a.splitCount
        : a.aliveCount;
      const bTotal = complete
        ? b.firstCount + b.secondCount + b.splitCount
        : b.aliveCount;
      if (bTotal !== aTotal) return bTotal - aTotal;
      return a.displayName.localeCompare(b.displayName);
    });

  return {
    complete,
    bracketCount: brackets.length,
    rows,
  };
}

export function buildSpectatorAliveListFromSideAction(
  sideAction: SideAction,
  poolId: number
): SpectatorAliveList {
  const pool = (sideAction.pools ?? []).find((p) => p.id === poolId);
  if (!pool) {
    return { complete: false, bracketCount: 0, rows: [] };
  }
  return buildSpectatorAliveListFromPool(pool);
}
