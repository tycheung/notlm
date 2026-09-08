import React, { useMemo } from 'react';
import type { Bracket, BracketMatch, UserDisplayNames } from '../../utils/bracketEngine/types';
import { displayNameForUserId } from '../../utils/bracketEngine/types';
import { displayBracketNumber } from '../../utils/bracketDisplayNumber';
import MatchBlock from '../match-play-diagram/shared/MatchBlock';
import ConnectorSvg from '../match-play-diagram/shared/ConnectorSvg';
import {
  COLUMN_HEADER_HEIGHT,
  COLUMN_WIDTH,
  DIAGRAM_MIN_WIDTH,
  MATCH_GAP,
} from '../match-play-diagram/shared/constants';
import {
  bracketCanvasHeight,
  buildRoundToRoundLines,
  computeBracketPositions,
  computeFinalTop,
} from '../match-play-diagram/shared/layoutUtils';

interface PlacePrizes {
  first: number;
  second: number;
  third?: number;
  fourth?: number;
}

interface SideActionBracketDiagramProps {
  bracket: Bracket;
  userDisplayNames?: UserDisplayNames;
  payouts?: PlacePrizes;
  byePayouts?: PlacePrizes;
  /** Stage-ordered event game numbers: [G1, G2, Final]. */
  gameNumbers?: number[];
  /** When false, omit dollar badges on finalists (spectator / stripped payloads). */
  showPayouts?: boolean;
  /** Fallback when bracket.bracket_number is not annotated. */
  bracketNumberOffset?: number;
}

type PlacePrize = 'first' | 'second' | 'third' | 'fourth' | 'split' | null;

function displayScore(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return '—';
  return trimmed;
}

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return `$${Number(amount).toFixed(0)}`;
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
  const p1 = Number(match.p1);
  const p1b = match.p1b != null ? Number(match.p1b) : null;
  if (loserId === p1 || (p1b != null && loserId === p1b)) {
    const n = Number(scoreFor(match.s1));
    return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
  }
  const n = Number(scoreFor(match.s2));
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
}

/** G2 losers ordered best→worst (3rd then 4th) when both semis are decided. */
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

function prizesForPot(
  bracket: Bracket,
  payouts?: PlacePrizes,
  byePayouts?: PlacePrizes
): PlacePrizes {
  const seated = (bracket.seating || []).filter((s) => s != null).length;
  const fullSlots = 8;
  if (seated > 0 && seated < fullSlots) {
    return {
      first: Number(byePayouts?.first ?? payouts?.first ?? 0),
      second: Number(byePayouts?.second ?? payouts?.second ?? 0),
      third: Number(byePayouts?.third ?? payouts?.third ?? 0),
      fourth: Number(byePayouts?.fourth ?? payouts?.fourth ?? 0),
    };
  }
  return {
    first: Number(payouts?.first ?? 0),
    second: Number(payouts?.second ?? 0),
    third: Number(payouts?.third ?? 0),
    fourth: Number(payouts?.fourth ?? 0),
  };
}

function placeForUid(
  match: BracketMatch | undefined,
  userId: number | null | undefined,
  potComplete: boolean
): PlacePrize {
  if (!potComplete || !match || userId == null || !matchIsResolved(match)) return null;
  if (match.tie) return 'split';
  if (match.winner != null && Number(match.winner) === Number(userId)) return 'first';
  if (
    match.winner != null &&
    (Number(match.p1) === Number(userId) || Number(match.p2) === Number(userId))
  ) {
    return 'second';
  }
  const s1 = Number(scoreFor(match.s1));
  const s2 = Number(scoreFor(match.s2));
  if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 === s2) return null;
  const isP1 = Number(match.p1) === Number(userId);
  const isP2 = Number(match.p2) === Number(userId);
  if (!isP1 && !isP2) return null;
  const won = isP1 ? s1 > s2 : s2 > s1;
  return won ? 'first' : 'second';
}

function prizeLabel(place: PlacePrize, prizes: PlacePrizes): string {
  if (place === 'first') return formatMoney(prizes.first);
  if (place === 'second') return formatMoney(prizes.second);
  if (place === 'third') return formatMoney(prizes.third ?? 0);
  if (place === 'fourth') return formatMoney(prizes.fourth ?? 0);
  if (place === 'split') return formatMoney((prizes.first + prizes.second) / 2);
  return '';
}

function placeTitle(place: PlacePrize): string {
  if (place === 'first') return '1st place';
  if (place === 'second') return '2nd place';
  if (place === 'third') return '3rd place';
  if (place === 'fourth') return '4th place';
  if (place === 'split') return 'Tie';
  return '';
}

const SideActionBracketDiagram: React.FC<SideActionBracketDiagramProps> = ({
  bracket,
  userDisplayNames = {},
  payouts,
  byePayouts,
  gameNumbers = [],
  showPayouts = true,
  bracketNumberOffset = 0,
}) => {
  const g1 = bracket.rounds[0]?.matches ?? [];
  const g2 = bracket.rounds[1]?.matches ?? [];
  const finalMatch = bracket.rounds[2]?.matches[0];

  const g1Count = Math.max(g1.length, 4);
  const totalHeight = bracketCanvasHeight(g1Count);
  const complete = potIsComplete(bracket);
  const prizes = showPayouts
    ? prizesForPot(bracket, payouts, byePayouts)
    : { first: 0, second: 0, third: 0, fourth: 0 };

  const sfPlaceByUid = useMemo(() => {
    const map = new Map<number, 'third' | 'fourth'>();
    if ((prizes.third ?? 0) <= 0 && (prizes.fourth ?? 0) <= 0) return map;
    const losers = rankedSemifinalLosers(bracket);
    if (losers[0] != null && (prizes.third ?? 0) > 0) map.set(losers[0], 'third');
    if (losers[1] != null && (prizes.fourth ?? 0) > 0) map.set(losers[1], 'fourth');
    return map;
  }, [bracket, prizes.third, prizes.fourth]);

  const g2Positions = useMemo(
    () => computeBracketPositions(g2.length),
    [g2.length]
  );

  const finalTop = useMemo(() => computeFinalTop(g2Positions), [g2Positions]);

  const g1ToG2Lines = useMemo(() => buildRoundToRoundLines(g1.length, g2.length), [g1.length, g2.length]);
  const g2ToFinalLines = useMemo(() => buildRoundToRoundLines(g2.length, 1), [g2.length]);

  const toBlock = (match: BracketMatch, opts?: { isFinal?: boolean; isG2?: boolean }) => {
    const isFinal = Boolean(opts?.isFinal);
    const isG2 = Boolean(opts?.isG2);
    const sideMeta = (side: 0 | 1) => {
      const uid = side === 0 ? match.p1 : match.p2;
      const score = side === 0 ? match.s1 : match.s2;
      let place: PlacePrize = null;
      if (isFinal) {
        place = placeForUid(match, uid, complete);
      } else if (isG2 && uid != null) {
        place = sfPlaceByUid.get(Number(uid)) ?? null;
      }
      const prize = place ? prizeLabel(place, prizes) : '';
      const isWinner =
        uid != null &&
        ((match.winner != null && Number(match.winner) === Number(uid)) ||
          Boolean(match.tie));
      return {
        side,
        name: displayNameForUserId(uid, userDisplayNames),
        isTbd: uid == null,
        isWinner: isFinal && complete ? isWinner : false,
        trailing: (
          <div className="flex shrink-0 items-stretch gap-1">
            {prize ? (
              <div
                className="flex min-w-[2.25rem] items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-1.5 text-xs font-bold tabular-nums text-primary"
                title={placeTitle(place)}
              >
                {prize}
              </div>
            ) : null}
            <div className="flex w-11 shrink-0 items-center justify-center rounded-md border border-border/80 bg-[#141c2b] text-sm text-text-muted">
              {displayScore(score)}
            </div>
          </div>
        ),
      };
    };
    return {
      participants: [sideMeta(0), sideMeta(1)] as [
        ReturnType<typeof sideMeta>,
        ReturnType<typeof sideMeta>,
      ],
    };
  };

  const displayNumber = displayBracketNumber(bracket, bracketNumberOffset);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
          Bracket {displayNumber}
        </h3>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            complete
              ? 'border-success/50 bg-success/10 text-success'
              : 'border-border bg-surface-light text-text-muted'
          }`}
        >
          {complete ? 'Complete' : 'Pending'}
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-flex items-stretch" style={{ minWidth: DIAGRAM_MIN_WIDTH }}>
          <div className="shrink-0" style={{ width: COLUMN_WIDTH }}>
            <p
              className="text-xs font-bold uppercase tracking-[0.12em] text-primary"
              style={{ height: COLUMN_HEADER_HEIGHT }}
            >
              {gameNumbers[0] != null ? `Game ${gameNumbers[0]}` : 'Game 1'}
            </p>
            <div className="flex flex-col" style={{ gap: MATCH_GAP }}>
              {g1.map((match) => (
                <MatchBlock key={match.id} {...toBlock(match)} />
              ))}
            </div>
          </div>

          <ConnectorSvg lines={g1ToG2Lines} height={totalHeight} />

          <div className="relative shrink-0" style={{ width: COLUMN_WIDTH, height: totalHeight }}>
            <p
              className="absolute left-0 right-0 text-xs font-bold uppercase tracking-[0.12em] text-primary"
              style={{ height: COLUMN_HEADER_HEIGHT }}
            >
              {gameNumbers[1] != null ? `Game ${gameNumbers[1]}` : 'Game 2'}
            </p>
            {g2.map((match, index) => (
              <div
                key={match.id}
                className="absolute left-0 right-0"
                style={{ top: g2Positions[index] }}
              >
                <MatchBlock {...toBlock(match, { isG2: true })} />
              </div>
            ))}
          </div>

          <ConnectorSvg lines={g2ToFinalLines} height={totalHeight} />

          <div className="relative shrink-0" style={{ width: COLUMN_WIDTH + 36, height: totalHeight }}>
            <p
              className="absolute left-0 right-0 text-xs font-bold uppercase tracking-[0.12em] text-primary"
              style={{ height: COLUMN_HEADER_HEIGHT }}
            >
              {gameNumbers[2] != null ? `Final · Game ${gameNumbers[2]}` : 'Final'}
            </p>
            {finalMatch && (
              <div className="absolute left-0 right-0" style={{ top: finalTop }}>
                <MatchBlock {...toBlock(finalMatch, { isFinal: true })} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideActionBracketDiagram;
