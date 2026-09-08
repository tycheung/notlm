/** Project current lane seats through movement into a full games × lanes grid. */

import { buildMovementPreviewSchedule } from './movement';
import { lanesFromPairs } from './laneMovementGrid';
import {
  positionRoundLaneForPlace,
  resolvePositionRoundLanePlacement,
  stableRngSeedForRound,
} from './positionRoundLanes';
import type { LaneMovementConfig, LanePair } from './types';

export type LaneAssignmentPreviewUnit = {
  key: string;
  label: string;
  startLane: number;
};

export type LaneAssignmentPreviewCell = {
  labels: string[];
  keys: string[];
};

export type LaneAssignmentPositionRoundInfo = {
  /** 1-based game number replaced by standings places. */
  game: number;
  placement: string;
  teamCount: number;
  roundId?: number | null;
};

export type LaneAssignmentPreview = {
  lanes: number[];
  games: number[];
  /** games[i] × lanes[j] → occupants that game */
  byLane: LaneAssignmentPreviewCell[][];
  /** One row per seated unit; cells are lane numbers per game */
  byTeam: Array<{
    key: string;
    label: string;
    startLane: number;
    lanesByGame: Array<number | null>;
  }>;
  unassignedCount: number;
  /** When set, that game uses place labels instead of team names. */
  positionRoundGame: number | null;
};

export function placeLabel(place: number): string {
  // Match Format Editor Matchups scheme (`Place ${seed}`).
  return `Place ${Math.trunc(place)}`;
}

export function collectLaneAssignmentPreviewUnits(
  rows: Array<{
    squad_participant_id: number;
    display_name: string;
    assigned_lane: number | null;
    team_id?: number | null;
  }>
): { units: LaneAssignmentPreviewUnit[]; unassignedCount: number } {
  const unitsByKey = new Map<string, LaneAssignmentPreviewUnit>();

  for (const row of rows) {
    if (row.assigned_lane == null) continue;
    const key =
      row.team_id != null ? `team:${row.team_id}` : `sp:${row.squad_participant_id}`;
    if (unitsByKey.has(key)) continue;
    unitsByKey.set(key, {
      key,
      label: row.display_name,
      startLane: Number(row.assigned_lane),
    });
  }

  const seatedKeys = new Set(unitsByKey.keys());
  const unassignedKeys = new Set<string>();
  for (const row of rows) {
    if (row.assigned_lane != null) continue;
    const key =
      row.team_id != null ? `team:${row.team_id}` : `sp:${row.squad_participant_id}`;
    if (seatedKeys.has(key)) continue;
    unassignedKeys.add(key);
  }

  const units = [...unitsByKey.values()].sort((a, b) => {
    if (a.startLane !== b.startLane) return a.startLane - b.startLane;
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  });

  return { units, unassignedCount: unassignedKeys.size };
}

function applyPositionRoundPlaces(input: {
  byLane: LaneAssignmentPreviewCell[][];
  byTeam: LaneAssignmentPreview['byTeam'];
  lanes: number[];
  pairs: LanePair[];
  positionRound: LaneAssignmentPositionRoundInfo;
}): void {
  const gameIdx = input.positionRound.game - 1;
  if (gameIdx < 0 || gameIdx >= input.byLane.length) return;

  const placement = resolvePositionRoundLanePlacement(input.positionRound.placement);
  const teamCount = Math.max(2, Math.trunc(input.positionRound.teamCount) || 2);
  const evenCount = teamCount % 2 === 0 ? teamCount : teamCount - 1;
  const rngSeed =
    input.positionRound.roundId != null
      ? stableRngSeedForRound(
          Number(input.positionRound.roundId),
          input.positionRound.game
        )
      : null;

  const laneIndex = new Map(input.lanes.map((lane, index) => [lane, index]));
  input.byLane[gameIdx] = input.lanes.map(() => ({ labels: [], keys: [] }));
  for (const row of input.byTeam) {
    row.lanesByGame[gameIdx] = null;
  }

  for (let place = 1; place <= evenCount; place += 1) {
    try {
      const { lane } = positionRoundLaneForPlace(place, {
        teamCount: evenCount,
        placement,
        pairsInPlay: input.pairs,
        rngSeed,
      });
      const col = laneIndex.get(lane);
      if (col == null) continue;
      const cell = input.byLane[gameIdx][col];
      const key = `place:${place}`;
      if (!cell.keys.includes(key)) {
        cell.keys.push(key);
        cell.labels.push(placeLabel(place));
      }
    } catch {
      // Place exceeds pairs / invalid config — skip.
    }
  }
}

export function buildLaneAssignmentPreview(input: {
  pairs: LanePair[];
  gameCount: number;
  movement: LaneMovementConfig;
  units: LaneAssignmentPreviewUnit[];
  unassignedCount?: number;
  positionRound?: LaneAssignmentPositionRoundInfo | null;
}): LaneAssignmentPreview {
  const lanes = lanesFromPairs(input.pairs);
  const gameCount = Math.max(1, Math.min(48, Math.trunc(input.gameCount) || 1));
  const games = Array.from({ length: gameCount }, (_, i) => i + 1);
  const laneIndex = new Map(lanes.map((lane, index) => [lane, index]));

  const byLane: LaneAssignmentPreviewCell[][] = games.map(() =>
    lanes.map(() => ({ labels: [], keys: [] }))
  );

  const movementEnabled =
    Boolean(input.movement.enabled) && input.movement.mode !== 'stay';
  const movementMode = movementEnabled ? input.movement.mode : 'stay';
  const numPairs =
    movementMode === 'league' && input.movement.league_team_count
      ? Math.max(1, Math.floor(input.movement.league_team_count / 2))
      : Math.max(1, input.pairs.length);
  const pairsInPlay = input.pairs as Array<[number, number]>;

  const byTeam: LaneAssignmentPreview['byTeam'] = [];
  const positionGame =
    input.positionRound &&
    input.positionRound.game >= 1 &&
    input.positionRound.game <= gameCount
      ? Math.trunc(input.positionRound.game)
      : null;

  for (const unit of input.units) {
    const schedule = buildMovementPreviewSchedule({
      startLane: unit.startLane,
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
    const lanesByGame: Array<number | null> = games.map(() => null);
    for (const row of schedule) {
      const gameIdx = row.game_number - 1;
      if (positionGame != null && row.game_number === positionGame) {
        continue;
      }
      lanesByGame[gameIdx] = row.assigned_lane;
      const col = laneIndex.get(row.assigned_lane);
      if (col == null || gameIdx < 0 || gameIdx >= byLane.length) continue;
      const cell = byLane[gameIdx][col];
      if (!cell.keys.includes(unit.key)) {
        cell.keys.push(unit.key);
        cell.labels.push(unit.label);
      }
    }
    byTeam.push({
      key: unit.key,
      label: unit.label,
      startLane: unit.startLane,
      lanesByGame,
    });
  }

  if (positionGame != null && input.positionRound) {
    applyPositionRoundPlaces({
      byLane,
      byTeam,
      lanes,
      pairs: input.pairs,
      positionRound: { ...input.positionRound, game: positionGame },
    });
  }

  return {
    lanes,
    games,
    byLane,
    byTeam,
    unassignedCount: input.unassignedCount ?? 0,
    positionRoundGame: positionGame,
  };
}
