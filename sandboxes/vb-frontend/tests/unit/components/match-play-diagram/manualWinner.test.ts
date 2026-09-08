import { describe, expect, it } from 'vitest';
import {
  matchNeedsManualWinner,
  sideScoreTotal,
} from '@/components/match-play-diagram/shared/manualWinner';
import type { DiagramMatch } from '@/components/match-play-diagram/adapters/types';

function cell(score: number | null) {
  return { gameIndex: 1, score, gameId: score == null ? null : 1, disabled: false };
}

function match(partial: Partial<DiagramMatch> & { scoresA: (number | null)[]; scoresB: (number | null)[] }): DiagramMatch {
  return {
    id: 'm1',
    seriesId: 7,
    label: 'M1',
    status: partial.status ?? 'in_progress',
    winsSide0: partial.winsSide0 ?? 0,
    winsSide1: partial.winsSide1 ?? 0,
    winnerSide: partial.winnerSide ?? null,
    maxGames: 2,
    raceToWins: 1,
    slotIndex: 0,
    feederAIndex: null,
    feederBIndex: null,
    participants: [
      {
        side: 0,
        name: 'A',
        sideId: 1,
        isWinner: false,
        isTbd: false,
        scores: partial.scoresA.map((s, i) => ({ ...cell(s), gameIndex: i + 1 })),
      },
      {
        side: 1,
        name: 'B',
        sideId: 2,
        isWinner: false,
        isTbd: false,
        scores: partial.scoresB.map((s, i) => ({ ...cell(s), gameIndex: i + 1 })),
      },
    ],
  };
}

describe('manualWinner helpers', () => {
  it('sums side scores', () => {
    const m = match({ scoresA: [200, 180], scoresB: [190, null] });
    expect(sideScoreTotal(m.participants[0])).toBe(380);
    expect(sideScoreTotal(m.participants[1])).toBe(190);
  });

  it('needs manual winner when totals are tied', () => {
    expect(
      matchNeedsManualWinner(match({ scoresA: [200], scoresB: [200] }))
    ).toBe(true);
    expect(
      matchNeedsManualWinner(match({ scoresA: [210], scoresB: [200] }))
    ).toBe(false);
    expect(
      matchNeedsManualWinner(
        match({ scoresA: [200], scoresB: [200], winnerSide: 0 })
      )
    ).toBe(false);
  });
});
