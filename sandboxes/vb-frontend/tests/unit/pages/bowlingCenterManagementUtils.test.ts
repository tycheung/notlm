import { describe, expect, it } from 'vitest';

import { sortBowlingCenters } from '@/pages/tournament_director/bowlingCenterManagementUtils';
import type { BowlingCenterRead } from '@/types/bowling_center';

function center(overrides: Partial<BowlingCenterRead> = {}): BowlingCenterRead {
  return {
    id: 1,
    name: 'Alpha Lanes',
    city: 'Columbus',
    state: 'OH',
    lane_count: 24,
    address1: '1 Main',
    postal_code: '43000',
    is_active: true,
    ...overrides,
  } as BowlingCenterRead;
}

describe('sortBowlingCenters', () => {
  it('sorts by name ascending', () => {
    const sorted = sortBowlingCenters(
      [center({ id: 2, name: 'Zeta' }), center({ id: 1, name: 'Alpha' })],
      'name',
      'asc'
    );
    expect(sorted.map((c) => c.name)).toEqual(['Alpha', 'Zeta']);
  });

  it('sorts by lane count descending', () => {
    const sorted = sortBowlingCenters(
      [center({ id: 1, lane_count: 20 }), center({ id: 2, lane_count: 32 })],
      'lanes',
      'desc'
    );
    expect(sorted.map((c) => c.lane_count)).toEqual([32, 20]);
  });

  it('sorts by city and state', () => {
    const byCity = sortBowlingCenters(
      [
        center({ id: 1, city: 'Zanesville' }),
        center({ id: 2, city: 'Akron' }),
      ],
      'city',
      'asc'
    );
    expect(byCity.map((c) => c.city)).toEqual(['Akron', 'Zanesville']);

    const byState = sortBowlingCenters(
      [
        center({ id: 1, state: 'TX' }),
        center({ id: 2, state: 'OH' }),
      ],
      'state',
      'desc'
    );
    expect(byState.map((c) => c.state)).toEqual(['TX', 'OH']);
  });
});
