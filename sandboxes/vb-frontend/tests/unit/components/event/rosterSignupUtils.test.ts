import { describe, expect, it } from 'vitest';

import type {
  RosterSideActionColumn,
  RosterSideActionSignupRow,
} from '@/api/side-actions';
import {
  billableEntryCount,
  computeRosterRowOwed,
  isFullyPaid,
  parseSignupQuantityInput,
  parseTotalPaidInput,
  rosterDisplayedQuantity,
} from '@/components/event/rosterSignupUtils';

describe('parseSignupQuantityInput', () => {
  it('clamps values above max_entries_per_user', () => {
    const result = parseSignupQuantityInput('99', 1, 8);
    expect(result.value).toBe(8);
    expect(result.shouldPersist).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects negative numeric input', () => {
    const result = parseSignupQuantityInput('-2', 3, 8);
    expect(result.value).toBe(3);
    expect(result.shouldPersist).toBe(false);
    expect(result.error).toContain('non-negative');
  });

  it('treats empty input as zero when server has entries', () => {
    const result = parseSignupQuantityInput('', 2, 8);
    expect(result.value).toBe(0);
    expect(result.shouldPersist).toBe(true);
  });
});

describe('rosterDisplayedQuantity', () => {
  it('uses all_estimate when is_all', () => {
    expect(
      rosterDisplayedQuantity({ quantity: 1, is_all: true, all_estimate: 14 })
    ).toBe(14);
  });

  it('uses quantity when not all', () => {
    expect(rosterDisplayedQuantity({ quantity: 3, is_all: false })).toBe(3);
  });
});

describe('billableEntryCount / computeRosterRowOwed', () => {
  it('treats All intent-only as $0 billable', () => {
    expect(
      billableEntryCount({ quantity: 14, is_all: true, entry_ids: [1] })
    ).toBe(0);
    expect(
      billableEntryCount({ quantity: 8, is_all: true, entry_ids: [1, 2, 3] })
    ).toBe(3);
  });

  it('computes owed from finite quantity × fee', () => {
    const row = {
      user_id: 1,
      signups: {
        '10': {
          quantity: 2,
          entry_ids: [1, 2],
          pools: [
            {
              pool_id: 1,
              quantity: 2,
              is_all: false,
              entry_ids: [1, 2],
            },
          ],
        },
      },
    } as unknown as RosterSideActionSignupRow;
    const columns = [
      {
        side_action_id: 10,
        entry_unit: 'bowler',
        pools: [{ pool_id: 1, entry_fee: 25 }],
      },
    ] as unknown as RosterSideActionColumn[];
    expect(computeRosterRowOwed(row, columns)).toBe(50);
  });

  it('can bill only bowler or only team pots', () => {
    const row = {
      user_id: 1,
      signups: {
        '10': {
          pools: [{ pool_id: 1, quantity: 1, is_all: false, entry_ids: [1] }],
        },
        '20': {
          pools: [{ pool_id: 2, quantity: 1, is_all: false, entry_ids: [2] }],
        },
      },
    } as unknown as RosterSideActionSignupRow;
    const columns = [
      {
        side_action_id: 10,
        entry_unit: 'team',
        pools: [{ pool_id: 1, entry_fee: 15 }],
      },
      {
        side_action_id: 20,
        entry_unit: 'bowler',
        pools: [{ pool_id: 2, entry_fee: 10 }],
      },
    ] as unknown as RosterSideActionColumn[];
    expect(computeRosterRowOwed(row, columns)).toBe(25);
    expect(
      computeRosterRowOwed(row, columns, { includeEntryUnits: 'bowler' })
    ).toBe(10);
    expect(
      computeRosterRowOwed(row, columns, { includeEntryUnits: 'team' })
    ).toBe(15);
  });
});

describe('parseTotalPaidInput', () => {
  it('accepts non-negative amounts', () => {
    expect(parseTotalPaidInput('12.50').amount).toBe(12.5);
  });

  it('rejects negative amounts', () => {
    expect(parseTotalPaidInput('-1').error).toBeTruthy();
  });
});

describe('isFullyPaid', () => {
  it('returns true when paid meets owed within tolerance', () => {
    expect(isFullyPaid(10, 10)).toBe(true);
    expect(isFullyPaid(10, 9.995)).toBe(true);
  });

  it('returns false when underpaid', () => {
    expect(isFullyPaid(10, 5)).toBe(false);
  });
});
