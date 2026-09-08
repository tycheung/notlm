import type { LaneMovementConfig, LanePair } from './types';
import { buildMovementPreviewSchedule } from './movement';

/** game → lane → starting lane (or null if empty). */
export type LaneMovementGrid = Array<Array<number | null>>;

export function lanesFromPairs(pairs: LanePair[]): number[] {
  const lanes = new Set<number>();
  for (const [low, high] of pairs) {
    lanes.add(low);
    lanes.add(high);
  }
  return [...lanes].sort((a, b) => a - b);
}

/**
 * Build a USBC-style movement grid:
 * rows = games, columns = physical lanes in play,
 * cell = starting lane that bowls on that lane for that game.
 */
export function buildLaneMovementGrid(input: {
  pairs: LanePair[];
  gameCount: number;
  movement: LaneMovementConfig;
}): { lanes: number[]; games: number[]; grid: LaneMovementGrid } {
  const lanes = lanesFromPairs(input.pairs);
  const gameCount = Math.max(1, Math.min(48, Math.trunc(input.gameCount) || 1));
  const games = Array.from({ length: gameCount }, (_, i) => i + 1);
  const grid: LaneMovementGrid = games.map(() => lanes.map(() => null));

  if (!lanes.length) {
    return { lanes, games, grid };
  }

  const movementEnabled = Boolean(input.movement.enabled) && input.movement.mode !== 'stay';
  const movementMode = movementEnabled ? input.movement.mode : 'stay';
  const numPairs =
    movementMode === 'league' && input.movement.league_team_count
      ? Math.max(1, Math.floor(input.movement.league_team_count / 2))
      : Math.max(1, input.pairs.length);
  const laneIndex = new Map(lanes.map((lane, index) => [lane, index]));
  const pairsInPlay = input.pairs as Array<[number, number]>;

  for (const startLane of lanes) {
    const schedule = buildMovementPreviewSchedule({
      startLane,
      gameCount,
      movementMode,
      stepPairs: input.movement.step_pairs,
      intervalGames: input.movement.interval_games,
      staggeredSteps: input.movement.staggered_steps,
      leagueTeamCount: input.movement.league_team_count,
      leagueWrapPairOffset: input.movement.league_wrap_pair_offset,
      numPairs,
      pairsInPlay,
      splitHouse: input.movement.split_house,
      splitAfterPairLow: input.movement.split_after_pair_low,
    });
    for (const row of schedule) {
      const col = laneIndex.get(row.assigned_lane);
      if (col == null) continue;
      const gameIdx = row.game_number - 1;
      const existing = grid[gameIdx][col];
      // Prefer keeping the first starter if two collide (shouldn't for valid movement).
      if (existing == null) {
        grid[gameIdx][col] = startLane;
      }
    }
  }

  return { lanes, games, grid };
}
