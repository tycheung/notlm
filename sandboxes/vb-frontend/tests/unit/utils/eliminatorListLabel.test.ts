import { describe, expect, it } from 'vitest';

import type { SideAction } from '@/types/side_action';
import { formatEliminatorCurrentlyAliveCell } from '@/utils/eliminatorListLabel';

function row(
  overrides: Partial<SideAction> = {}
): Pick<
  SideAction,
  | 'eliminator_currently_alive'
  | 'eliminator_is_complete'
  | 'eliminator_cash_spots'
  | 'current_entries'
> {
  return {
    current_entries: 20,
    ...overrides,
  };
}

describe('formatEliminatorCurrentlyAliveCell', () => {
  it('shows alive count while in progress', () => {
    expect(
      formatEliminatorCurrentlyAliveCell(
        row({ eliminator_currently_alive: 15, eliminator_is_complete: false })
      )
    ).toBe('15');
  });

  it('falls back to entry count when alive is missing', () => {
    expect(formatEliminatorCurrentlyAliveCell(row({ current_entries: 85 }))).toBe('85');
  });

  it('shows completed with cash spots when scored through payout', () => {
    expect(
      formatEliminatorCurrentlyAliveCell(
        row({
          eliminator_is_complete: true,
          eliminator_cash_spots: 3,
          eliminator_currently_alive: 5,
        })
      )
    ).toBe('Completed (3)');
  });
});
