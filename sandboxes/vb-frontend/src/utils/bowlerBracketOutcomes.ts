import type { Bracket, BracketMatch } from '../utils/bracketEngine/types';
import {
  getStoredBrackets,
} from '../utils/sideActionBracketStorage';
import type { SideAction } from '../types/side_action';
import type { BracketEngineFinancialsReport } from '../api/side-actions';

export interface BowlerBracketOutcomeSummary {
  potsEntered: number;
  wins: number;
  seconds: number;
  thirds: number;
  fourths: number;
  splits: number;
  eliminated: number;
  inProgress: number;
  detail: string;
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

function evalWinner(match: BracketMatch): { winner: number | null; tie: boolean } {
  if (match.tie) return { winner: null, tie: true };
  if (match.winner != null) return { winner: Number(match.winner), tie: false };
  const s1 = Number(scoreFor(match.s1));
  const s2 = Number(scoreFor(match.s2));
  if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 === s2) {
    return { winner: null, tie: s1 === s2 && Number.isFinite(s1) };
  }
  return { winner: s1 > s2 ? Number(match.p1) : Number(match.p2), tie: false };
}

function losingSideScore(match: BracketMatch, loserId: number): number {
  if (Number(match.p1) === loserId || (match.p1b != null && Number(match.p1b) === loserId)) {
    const n = Number(scoreFor(match.s1));
    return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
  }
  const n = Number(scoreFor(match.s2));
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
}

function rankedSemifinalLosers(bracket: Bracket): number[] {
  const matches = bracket.rounds?.[1]?.matches ?? [];
  if (matches.length < 2) return [];
  const ranked: Array<{ score: number; uid: number }> = [];
  for (const match of matches.slice(0, 2)) {
    if (!match.p1 || !match.p2 || !matchIsResolved(match)) return [];
    const { winner, tie } = evalWinner(match);
    if (tie || winner == null) return [];
    const participants = [match.p1, match.p2, match.p1b, match.p2b]
      .filter((id): id is number => id != null)
      .map(Number);
    const loser = participants.find((id) => id !== winner);
    if (loser == null) return [];
    ranked.push({ score: losingSideScore(match, loser), uid: loser });
  }
  ranked.sort((a, b) => b.score - a.score || a.uid - b.uid);
  return ranked.map((r) => r.uid);
}

function configuredPlaces(sideAction: SideAction): {
  third: number;
  fourth: number;
} {
  const dist = sideAction.prize_distribution || {};
  return {
    third: Number(dist['3'] ?? dist.third ?? 0),
    fourth: Number(dist['4'] ?? dist.fourth ?? 0),
  };
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

function sfPlaceForUser(
  bracket: Bracket,
  userId: number,
  places: { third: number; fourth: number }
): 'third' | 'fourth' | null {
  if (places.third <= 0 && places.fourth <= 0) return null;
  const losers = rankedSemifinalLosers(bracket);
  if (losers[0] === userId && places.third > 0) return 'third';
  if (losers[1] === userId && places.fourth > 0) return 'fourth';
  return null;
}

function userLostAResolvedMatch(bracket: Bracket, userId: number): boolean {
  for (const round of bracket.rounds || []) {
    for (const match of round.matches || []) {
      if (!matchIsResolved(match)) continue;
      const p1 = Number(match.p1);
      const p2 = Number(match.p2);
      if (p1 !== userId && p2 !== userId) continue;
      if (match.tie) continue;
      if (match.winner != null) {
        if (Number(match.winner) !== userId) return true;
        continue;
      }
      const s1 = Number(scoreFor(match.s1));
      const s2 = Number(scoreFor(match.s2));
      if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 === s2) continue;
      const isP1 = p1 === userId;
      const won = isP1 ? s1 > s2 : s2 > s1;
      if (!won) return true;
    }
  }
  return false;
}

function userSeatedInBracket(bracket: Bracket, userId: number): boolean {
  return (bracket.seating || []).some((id) => id != null && Number(id) === userId);
}

/**
 * Summarize a bowler's bracket outcomes across all generated pots on a side action.
 */
export function summarizeBowlerBracketOutcomes(
  sideAction: SideAction,
  userId: number
): BowlerBracketOutcomeSummary {
  let potsEntered = 0;
  let wins = 0;
  let seconds = 0;
  let thirds = 0;
  let fourths = 0;
  let splits = 0;
  let eliminated = 0;
  let inProgress = 0;
  const places = configuredPlaces(sideAction);

  for (const pool of sideAction.pools ?? []) {
    if (!pool.is_enabled) continue;
    const brackets = getStoredBrackets({ bracket_engine: pool.bracket_engine });
    for (const bracket of brackets) {
      if (!userSeatedInBracket(bracket, userId)) continue;
      potsEntered += 1;
      const place = finalPlaceForUser(bracket, userId);
      const sfPlace = sfPlaceForUser(bracket, userId, places);
      if (place === 'first') wins += 1;
      else if (place === 'second') seconds += 1;
      else if (place === 'split') splits += 1;
      else if (sfPlace === 'third') thirds += 1;
      else if (sfPlace === 'fourth') fourths += 1;
      else if (potIsComplete(bracket) || userLostAResolvedMatch(bracket, userId)) {
        eliminated += 1;
      } else {
        inProgress += 1;
      }
    }
  }

  const parts: string[] = [];
  if (potsEntered === 0) {
    return {
      potsEntered: 0,
      wins: 0,
      seconds: 0,
      thirds: 0,
      fourths: 0,
      splits: 0,
      eliminated: 0,
      inProgress: 0,
      detail: 'Not seated in a generated bracket yet',
    };
  }
  parts.push(`${potsEntered} pot${potsEntered === 1 ? '' : 's'}`);
  if (wins) parts.push(`${wins} win${wins === 1 ? '' : 's'}`);
  if (seconds) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  if (thirds) parts.push(`${thirds} third${thirds === 1 ? '' : 's'}`);
  if (fourths) parts.push(`${fourths} fourth${fourths === 1 ? '' : 's'}`);
  if (splits) parts.push(`${splits} ${splits === 1 ? 'tie' : 'ties'}`);
  if (eliminated) parts.push(`${eliminated} eliminated`);
  if (inProgress) parts.push(`${inProgress} in progress`);
  if (!wins && !seconds && !thirds && !fourths && !splits && !eliminated && !inProgress) {
    parts.push('in progress');
  }

  return {
    potsEntered,
    wins,
    seconds,
    thirds,
    fourths,
    splits,
    eliminated,
    inProgress,
    detail: parts.join(' · '),
  };
}

function statsForUser(
  stats: BracketEngineFinancialsReport['stats'],
  userId: number
) {
  return stats[String(userId)] ?? stats[userId as unknown as string];
}

/**
 * Cash owed for one bowler across bracket financials reports:
 * unused-entry refunds + place rewards (same basis as TD financials).
 */
export function bowlerBracketPayoutFromReports(
  reports: BracketEngineFinancialsReport[],
  userId: number
): number {
  let total = 0;
  for (const report of reports) {
    const quota = (report.quotas ?? []).find((q) => Number(q.user_id) === userId);
    const unused = Number(quota?.unused ?? 0);
    const entryFee = Number(report.entry_fee || 0);
    const refund = unused * entryFee;
    const reward = Number(statsForUser(report.stats ?? {}, userId)?.reward ?? 0);
    total += refund + reward;
  }
  return Math.round(total * 100) / 100;
}

/** Fallback place winnings when financials reports are unavailable. */
export function bowlerBracketPlacePayoutEstimate(
  summary: Pick<
    BowlerBracketOutcomeSummary,
    'wins' | 'seconds' | 'thirds' | 'fourths' | 'splits'
  >,
  sideAction: SideAction
): number {
  const dist = sideAction.prize_distribution || {};
  const first = Number(dist['1'] ?? 25);
  const second = Number(dist['2'] ?? 10);
  const third = Number(dist['3'] ?? 0);
  const fourth = Number(dist['4'] ?? 0);
  const total =
    summary.wins * first +
    summary.seconds * second +
    (summary.thirds ?? 0) * third +
    (summary.fourths ?? 0) * fourth +
    summary.splits * ((first + second) / 2);
  return Math.round(total * 100) / 100;
}
