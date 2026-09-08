import { describe, expect, it } from 'vitest';
import type { DiagramMatch } from '../../../../src/components/match-play-diagram/adapters/types';
import {
  applyStepladderScoringLocks,
  resolveActiveStepladderMatchIndex,
  stepladderActiveMatchLabel,
} from '../../../../src/components/match-play-diagram/adapters/stepladderScoringLocks';

function cell(disabled = false) {
  return { gameIndex: 1, score: null as number | null, gameId: 1, disabled };
}

function match(partial: Partial<DiagramMatch> & Pick<DiagramMatch, 'id' | 'participants'>): DiagramMatch {
  return {
    seriesId: 1,
    label: 'Ladder Match',
    status: 'pending',
    winsSide0: 0,
    winsSide1: 0,
    winnerSide: null,
    maxGames: 1,
    raceToWins: 1,
    slotIndex: 0,
    feederAIndex: null,
    feederBIndex: null,
    ...partial,
  };
}

describe('stepladderScoringLocks', () => {
  it('picks the first incomplete match with both sides filled', () => {
    const matches = [
      match({
        id: 'm1',
        label: 'Ladder Match 1',
        participants: [
          { side: 0, name: 'Hawley', sideId: 5, isWinner: false, isTbd: false, scores: [cell()] },
          { side: 1, name: 'Gaither', sideId: 4, isWinner: false, isTbd: false, scores: [cell()] },
        ],
      }),
      match({
        id: 'm2',
        label: 'Ladder Match 2',
        participants: [
          { side: 0, name: 'Gary', sideId: 3, isWinner: false, isTbd: false, scores: [cell()] },
          { side: 1, name: 'TBD', sideId: null, isWinner: false, isTbd: true, scores: [cell(true)] },
        ],
      }),
    ];
    expect(resolveActiveStepladderMatchIndex(matches)).toBe(0);
  });

  it('advances active match after prior complete', () => {
    const matches = [
      match({
        id: 'm1',
        status: 'complete',
        winnerSide: 0,
        participants: [
          { side: 0, name: 'Hawley', sideId: 5, isWinner: true, isTbd: false, scores: [cell()] },
          { side: 1, name: 'Gaither', sideId: 4, isWinner: false, isTbd: false, scores: [cell()] },
        ],
      }),
      match({
        id: 'm2',
        participants: [
          { side: 0, name: 'Gary', sideId: 3, isWinner: false, isTbd: false, scores: [cell()] },
          { side: 1, name: 'Hawley', sideId: 5, isWinner: false, isTbd: false, scores: [cell()] },
        ],
      }),
    ];
    expect(resolveActiveStepladderMatchIndex(matches)).toBe(1);
  });

  it('locks score cells on non-active matches including seeded waiting sides', () => {
    const matches = [
      match({
        id: 'm1',
        participants: [
          { side: 0, name: 'Hawley', sideId: 5, isWinner: false, isTbd: false, scores: [cell()] },
          { side: 1, name: 'Gaither', sideId: 4, isWinner: false, isTbd: false, scores: [cell()] },
        ],
      }),
      match({
        id: 'm2',
        participants: [
          { side: 0, name: 'Gary', sideId: 3, isWinner: false, isTbd: false, scores: [cell()] },
          { side: 1, name: 'TBD', sideId: null, isWinner: false, isTbd: true, scores: [cell(true)] },
        ],
      }),
    ];
    const { matches: locked, activeIndex } = applyStepladderScoringLocks(matches);
    expect(activeIndex).toBe(0);
    expect(locked[0].participants[0].scores[0].disabled).toBe(false);
    expect(locked[0].participants[1].scores[0].disabled).toBe(false);
    expect(locked[1].participants[0].scores[0].disabled).toBe(true);
    expect(stepladderActiveMatchLabel(locked, activeIndex)).toContain('Hawley vs Gaither');
  });

  it('keeps completed prior matches editable for corrections while locking waiting rungs', () => {
    const matches = [
      match({
        id: 'm1',
        status: 'complete',
        winnerSide: 1,
        participants: [
          { side: 0, name: 'Hawley', sideId: 5, isWinner: false, isTbd: false, scores: [cell()] },
          { side: 1, name: 'Gaither', sideId: 4, isWinner: true, isTbd: false, scores: [cell()] },
        ],
      }),
      match({
        id: 'm2',
        participants: [
          { side: 0, name: 'Gary', sideId: 3, isWinner: false, isTbd: false, scores: [cell()] },
          { side: 1, name: 'Gaither', sideId: 4, isWinner: false, isTbd: false, scores: [cell()] },
        ],
      }),
      match({
        id: 'm3',
        participants: [
          { side: 0, name: 'Priest', sideId: 2, isWinner: false, isTbd: false, scores: [cell()] },
          { side: 1, name: 'TBD', sideId: null, isWinner: false, isTbd: true, scores: [cell(true)] },
        ],
      }),
    ];
    const { matches: locked, activeIndex } = applyStepladderScoringLocks(matches);
    expect(activeIndex).toBe(1);
    expect(locked[0].participants[0].scores[0].disabled).toBe(false);
    expect(locked[0].participants[1].scores[0].disabled).toBe(false);
    expect(locked[1].participants[0].scores[0].disabled).toBe(false);
    expect(locked[2].participants[0].scores[0].disabled).toBe(true);
  });
});
