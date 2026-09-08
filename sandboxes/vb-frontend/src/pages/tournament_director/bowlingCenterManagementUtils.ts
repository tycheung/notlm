import type { BowlingCenterRead } from '@/types/bowling_center';

export type BowlingCenterSortField = 'name' | 'city' | 'state' | 'lanes';
export type BowlingCenterSortDirection = 'asc' | 'desc';

export function sortBowlingCenters(
  centers: BowlingCenterRead[],
  sortField: BowlingCenterSortField,
  sortDirection: BowlingCenterSortDirection
): BowlingCenterRead[] {
  const result = [...centers];
  const direction = sortDirection === 'asc' ? 1 : -1;

  result.sort((a, b) => {
    if (sortField === 'name') {
      return direction * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    if (sortField === 'city') {
      return direction * a.city.localeCompare(b.city, undefined, { sensitivity: 'base' });
    }
    if (sortField === 'state') {
      return direction * a.state.localeCompare(b.state, undefined, { sensitivity: 'base' });
    }
    return direction * (a.lane_count - b.lane_count);
  });

  return result;
}
