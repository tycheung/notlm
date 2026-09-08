import { describe, expect, it } from 'vitest';

import { displayBracketNumber } from '@/utils/bracketDisplayNumber';

describe('displayBracketNumber', () => {
  it('uses annotated bracket_number when present', () => {
    expect(displayBracketNumber({ id: 0, bracket_number: 88 })).toBe(88);
  });

  it('applies offset to local id when bracket_number is missing', () => {
    expect(displayBracketNumber({ id: 0 }, 87)).toBe(88);
    expect(displayBracketNumber({ id: 1 }, 87)).toBe(89);
  });
});
