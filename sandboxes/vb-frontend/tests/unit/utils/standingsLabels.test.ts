import { describe, expect, it } from 'vitest';
import { buildStandingsLabels, lookupStandingsLabel } from '../../../src/utils/standingsLabels';

describe('buildStandingsLabels', () => {
  it('numbers continuously and skips excluded nodes', () => {
    const labels = buildStandingsLabels([
      { id: 1, display_order: 0, placement_count: 5, include_in_standings: true },
      { id: 2, display_order: 1, placement_count: 3, include_in_standings: false },
      { id: 3, display_order: 2, placement_count: 2, include_in_standings: true },
    ]);

    expect(lookupStandingsLabel(labels, 1, 5)?.label).toBe('5th Place');
    expect(lookupStandingsLabel(labels, 2, 1)).toBeNull();
    expect(lookupStandingsLabel(labels, 3, 1)?.label).toBe('6th Place');
    expect(lookupStandingsLabel(labels, 3, 2)?.label).toBe('7th Place');
  });
});
