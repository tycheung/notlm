import { describe, expect, it } from 'vitest';

import { cutLineAfterIndex } from '@/components/event-reports/standingsCutLine';

describe('cutLineAfterIndex', () => {
  it('returns null when the toggle is off', () => {
    expect(
      cutLineAfterIndex([{ prize_amount: 100 }], false, 0)
    ).toBeNull();
  });

  it('prefers the backend index when present', () => {
    expect(
      cutLineAfterIndex([{ prize_amount: 100 }, { prize_amount: 0 }], true, 0)
    ).toBe(0);
  });

  it('uses the last paying or advancing row', () => {
    expect(
      cutLineAfterIndex(
        [
          { prize_amount: 100 },
          { prize_amount: 40 },
          { prize_amount: null },
          { standing_status: 'advance' },
        ],
        true
      )
    ).toBe(3);
  });
});
