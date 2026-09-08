import { describe, expect, it } from 'vitest';

import {
  classifyG1Heat,
  computeConflicts,
  maxExpectedG1,
  type Bracket,
} from '@/utils/bracketEngine';

function sampleBracket(): Bracket {
  return {
    id: 0,
    seating: [1, 2, 3, 4, 5, 6, 7, 8],
    rounds: [
      {
        matches: [
          { id: '0-0-0', p1: 1, p2: 8, s1: '220', s2: '200', winner: 1, tie: false },
          { id: '0-0-1', p1: 2, p2: 7, s1: '', s2: '', winner: null, tie: false },
          { id: '0-0-2', p1: 3, p2: 6, s1: '190', s2: '185', winner: 3, tie: false },
          { id: '0-0-3', p1: 4, p2: 5, s1: '210', s2: '205', winner: 4, tie: false },
        ],
      },
      {
        matches: [
          { id: '0-1-0', p1: 1, p2: 2, s1: '', s2: '', winner: null, tie: false },
          { id: '0-1-1', p1: 3, p2: 4, s1: '', s2: '', winner: null, tie: false },
        ],
      },
      {
        matches: [{ id: '0-2-0', p1: null, p2: null, s1: '', s2: '', winner: null, tie: false }],
      },
    ],
  };
}

describe('bracketEngine conflicts', () => {
  it('classifies G1 heat thresholds', () => {
    expect(maxExpectedG1(4)).toBe(3);
    expect(classifyG1Heat(4, 3)).toBe('OK');
    expect(classifyG1Heat(4, 4)).toBe('ELEVATED');
    expect(classifyG1Heat(4, 5)).toBe('HIGH');
  });

  it('returns pairwise rows keyed by user id', () => {
    const rows = computeConflicts([sampleBracket()]);
    expect(rows.length).toBeGreaterThan(0);
    expect(typeof rows[0].a).toBe('number');
    expect(typeof rows[0].b).toBe('number');
  });
});

// buildBracket is backend-only; keep a minimal local helper for diagram tests if needed.
function buildBracket(id: number, seating: number[]): Bracket {
  return { id, seating, rounds: [{ matches: [] }, { matches: [] }, { matches: [] }] };
}

describe('bracket types', () => {
  it('builds empty bracket shell for tests', () => {
    expect(buildBracket(0, [1, 2, 3, 4, 5, 6, 7, 8]).seating).toHaveLength(8);
  });
});
