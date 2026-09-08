import { describe, expect, it } from 'vitest';
import {
  buildLaneAssignmentPreview,
  collectLaneAssignmentPreviewUnits,
} from '@/features/lanes/buildLaneAssignmentPreview';
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

describe('buildLaneAssignmentPreview', () => {
  it('collects one unit per team and projects stay lanes', () => {
    const { units, unassignedCount } = collectLaneAssignmentPreviewUnits([
      {
        squad_participant_id: 1,
        display_name: 'Alpha',
        assigned_lane: 1,
        team_id: 10,
      },
      {
        squad_participant_id: 2,
        display_name: 'Alpha',
        assigned_lane: null,
        team_id: 10,
      },
      {
        squad_participant_id: 3,
        display_name: 'Bravo',
        assigned_lane: 2,
        team_id: 11,
      },
      {
        squad_participant_id: 4,
        display_name: 'Charlie',
        assigned_lane: null,
        team_id: 12,
      },
    ]);
    expect(units).toHaveLength(2);
    expect(units.map((u) => u.label)).toEqual(['Alpha', 'Bravo']);
    expect(unassignedCount).toBe(1);

    const preview = buildLaneAssignmentPreview({
      pairs: [
        [1, 2],
        [3, 4],
      ],
      gameCount: 3,
      movement: stayMovement,
      units,
      unassignedCount,
    });
    expect(preview.byLane[0][0].labels).toEqual(['Alpha']);
    expect(preview.byLane[0][1].labels).toEqual(['Bravo']);
    expect(preview.byLane[2][0].labels).toEqual(['Alpha']);
    expect(preview.byTeam[0].lanesByGame).toEqual([1, 1, 1]);
  });

  it('moves teams with league schedule so opponents share a pair', () => {
    const preview = buildLaneAssignmentPreview({
      pairs: [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ],
      gameCount: 2,
      movement: {
        ...stayMovement,
        enabled: true,
        mode: 'league',
        league_team_count: 8,
        league_wrap_pair_offset: 1,
      },
      units: [
        { key: 'team:1', label: 'T1', startLane: 1 },
        { key: 'team:2', label: 'T2', startLane: 2 },
        { key: 'team:3', label: 'T3', startLane: 3 },
        { key: 'team:4', label: 'T4', startLane: 4 },
      ],
    });
    // Game 1: 1 vs 2 on lanes 1/2
    expect(preview.byLane[0][0].labels).toEqual(['T1']);
    expect(preview.byLane[0][1].labels).toEqual(['T2']);
    // Each team has a lane every game
    for (const row of preview.byTeam) {
      expect(row.lanesByGame.every((lane) => lane != null)).toBe(true);
    }
  });

  it('replaces position-round game with place labels instead of team names', () => {
    const preview = buildLaneAssignmentPreview({
      pairs: [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ],
      gameCount: 3,
      movement: {
        ...stayMovement,
        enabled: true,
        mode: 'league',
        league_team_count: 8,
        league_wrap_pair_offset: 1,
      },
      units: [
        { key: 'team:1', label: 'Alpha', startLane: 1 },
        { key: 'team:2', label: 'Bravo', startLane: 2 },
        { key: 'team:3', label: 'Charlie', startLane: 3 },
        { key: 'team:4', label: 'Delta', startLane: 4 },
        { key: 'team:5', label: 'Echo', startLane: 5 },
        { key: 'team:6', label: 'Foxtrot', startLane: 6 },
        { key: 'team:7', label: 'Golf', startLane: 7 },
        { key: 'team:8', label: 'Hotel', startLane: 8 },
      ],
      positionRound: {
        game: 2,
        placement: 'start_low',
        teamCount: 8,
        roundId: 10,
      },
    });
    expect(preview.positionRoundGame).toBe(2);
    // Game 1 still teams
    expect(preview.byLane[0].some((c) => c.labels.includes('Alpha'))).toBe(true);
    // Game 2 is places 1–8 on lanes 1–8 for start_low
    expect(preview.byLane[1][0].labels).toEqual(['Place 1']);
    expect(preview.byLane[1][1].labels).toEqual(['Place 2']);
    expect(preview.byLane[1][2].labels).toEqual(['Place 3']);
    expect(preview.byLane[1][3].labels).toEqual(['Place 4']);
    expect(preview.byLane[1].flatMap((c) => c.labels).join(' ')).not.toMatch(/Alpha|Bravo/);
    // Team view clears that game
    expect(preview.byTeam.every((row) => row.lanesByGame[1] == null)).toBe(true);
  });
});
