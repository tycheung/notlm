import { describe, expect, it } from 'vitest';

import {
  normalizeGameNumbers,
  normalizeGameOrder,
  orderedStageGames,
  stageIndexForGame,
  validateBestN,
} from '@/features/side-actions/shared/gamePlan';

describe('side-action game plans', () => {
  it('supports non-contiguous selected games', () => {
    expect(normalizeGameNumbers([5, 1, 4], { eventGameCount: 5 })).toEqual([
      1, 4, 5,
    ]);
  });

  it.each([
    [[], 'Select at least one game'],
    [[1, 1], 'duplicates'],
    [[0, 1], 'positive integers'],
    [[1, 6], 'exceeds the event game count'],
    [[1, 2.5], 'positive integers'],
  ])('rejects invalid game plan %j', (values, message) => {
    expect(() =>
      normalizeGameNumbers(values as unknown[], { eventGameCount: 5 })
    ).toThrow(message as string);
  });

  it('enforces a required number of stages', () => {
    expect(() => normalizeGameNumbers([1, 2], { requiredCount: 3 })).toThrow(
      'exactly 3'
    );
  });

  it('maps selected games to stage indexes', () => {
    expect(stageIndexForGame([1, 4, 5], 4)).toBe(1);
    expect(stageIndexForGame([1, 4, 5], 3)).toBeNull();
  });

  it('allows empty selection while re-picking games (no crash)', () => {
    expect(orderedStageGames([])).toEqual([]);
    expect(stageIndexForGame([], 1)).toBeNull();
  });

  it('maps stage indexes using reverse game_order', () => {
    expect(
      stageIndexForGame([1, 4, 5], 5, { gameOrder: 'reverse' })
    ).toBe(0);
    expect(
      stageIndexForGame([1, 4, 5], 1, { gameOrder: 'reverse' })
    ).toBe(2);
  });

  it('validates best N against selected games', () => {
    expect(validateBestN([1, 2, 3, 4, 5], 3)).toBe(3);
    expect(() => validateBestN([1, 4, 5], 4)).toThrow('cannot exceed');
  });
});
