import { describe, expect, it } from 'vitest';
import { buildLaneMovementGrid } from '@/features/lanes/laneMovementGrid';
import type { LaneMovementConfig } from '@/features/lanes/types';

const stayMovement: LaneMovementConfig = {
  enabled: false,
  interval_games: 1,
  mode: 'stay',
  step_pairs: 1,
  staggered_steps: [],
  league_team_count: null,
  league_wrap_pair_offset: null,
};

describe('buildLaneMovementGrid', () => {
  it('maps stay movement to identity cells', () => {
    const { lanes, games, grid } = buildLaneMovementGrid({
      pairs: [
        [1, 2],
        [3, 4],
      ],
      gameCount: 3,
      movement: stayMovement,
    });
    expect(lanes).toEqual([1, 2, 3, 4]);
    expect(games).toEqual([1, 2, 3]);
    expect(grid[0]).toEqual([1, 2, 3, 4]);
    expect(grid[2]).toEqual([1, 2, 3, 4]);
  });

  it('places starting lane under destination after move-right', () => {
    const { grid, lanes } = buildLaneMovementGrid({
      pairs: [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      gameCount: 2,
      movement: {
        ...stayMovement,
        enabled: true,
        mode: 'move_right',
        step_pairs: 1,
      },
    });
    expect(lanes).toEqual([1, 2, 3, 4, 5, 6]);
    // Game 1 identity
    expect(grid[0]).toEqual([1, 2, 3, 4, 5, 6]);
    // Game 2: everyone one pair right — lane 3 has starter 1, lane 1 has starter 5
    expect(grid[1]?.[lanes.indexOf(3)]).toBe(1);
    expect(grid[1]?.[lanes.indexOf(4)]).toBe(2);
    expect(grid[1]?.[lanes.indexOf(1)]).toBe(5);
  });
});
