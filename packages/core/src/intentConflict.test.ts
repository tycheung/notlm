import { describe, expect, it } from 'vitest';
import {
  conceptualActionConflict,
  risksConflict,
  scoresNearTie,
  shouldDeferConflict,
} from './intentConflict.js';

describe('intentConflict', () => {
  it('scoresNearTie within default delta', () => {
    expect(scoresNearTie(100, 90)).toBe(true);
    expect(scoresNearTie(100, 70)).toBe(false);
  });

  it('risksConflict answer vs navigate', () => {
    expect(risksConflict('answer', 'navigate')).toBe(true);
    expect(risksConflict('answer', 'answer')).toBe(false);
    expect(risksConflict('refuse', 'answer')).toBe(false);
  });

  it('shouldDeferConflict on near-tie conflicting risks', () => {
    expect(
      shouldDeferConflict({
        riskA: 'answer',
        riskB: 'navigate',
        topScore: 100,
        secondScore: 90,
      })
    ).toBe(true);
    expect(
      shouldDeferConflict({
        riskA: 'navigate',
        riskB: 'navigate',
        topScore: 100,
        secondScore: 90,
      })
    ).toBe(false);
    expect(
      shouldDeferConflict({
        riskA: 'answer',
        riskB: 'navigate',
        topScore: 100,
        secondScore: 50,
      })
    ).toBe(false);
  });

  it('conceptualActionConflict: how-to shaped + navigate without FAQ', () => {
    expect(
      conceptualActionConflict({
        isConceptual: true,
        risk: 'navigate',
      })
    ).toBe(true);
    expect(
      conceptualActionConflict({
        isConceptual: true,
        risk: 'navigate',
        faqId: 'x',
      })
    ).toBe(false);
    expect(
      conceptualActionConflict({
        isConceptual: false,
        risk: 'navigate',
      })
    ).toBe(false);
  });
});
