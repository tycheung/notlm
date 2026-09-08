import { describe, expect, it } from 'vitest';
import { buildMovementPreviewSchedule, calculatePairForGame } from '@/features/lanes/movement';

describe('lane movement expand (left goes left / right goes right)', () => {
  it('moves odd starting lanes left', () => {
    expect(
      calculatePairForGame([7, 8], 2, 'expand', 2, { numPairs: 10, startLane: 7 })
    ).toEqual([3, 4]);
    expect(
      calculatePairForGame([7, 8], 3, 'expand', 2, { numPairs: 10, startLane: 7 })
    ).toEqual([19, 20]);
  });

  it('moves even starting lanes right', () => {
    expect(
      calculatePairForGame([7, 8], 2, 'expand', 2, { numPairs: 10, startLane: 8 })
    ).toEqual([11, 12]);
  });

  it('builds preview rows with assigned lane preserved', () => {
    const rows = buildMovementPreviewSchedule({
      startLane: 7,
      gameCount: 5,
      movementMode: 'expand',
      stepPairs: 2,
      intervalGames: 1,
      numPairs: 10,
    });
    expect(rows.map((r) => r.pair_label)).toEqual([
      '7/8',
      '3/4',
      '19/20',
      '15/16',
      '11/12',
    ]);
    expect(rows.map((r) => r.assigned_lane)).toEqual([7, 3, 19, 15, 11]);
  });

  it('follows USBC 20-team schedule for team starting on lane 1', () => {
    const rows = buildMovementPreviewSchedule({
      startLane: 1,
      gameCount: 19,
      movementMode: 'league',
      stepPairs: 1,
      intervalGames: 1,
      leagueTeamCount: 20,
      numPairs: 10,
    });
    expect(rows[0]).toMatchObject({ pair_label: '1/2', assigned_lane: 1 });
    // Week 2 column with 8-1 → pair 11/12, right lane
    expect(rows[1]).toMatchObject({ pair_label: '11/12', assigned_lane: 12 });
    // Week 3 ends with 1-4 → pair 19/20, left lane
    expect(rows[2]).toMatchObject({ pair_label: '19/20', assigned_lane: 19 });
    const sides = rows.map((r) => (r.assigned_lane % 2 === 1 ? 'L' : 'R'));
    expect(sides.join('')).toBe('LRLLLLLRRLRRRRLRLRR');
    expect(sides.filter((s) => s === 'L')).toHaveLength(9);
    expect(sides.filter((s) => s === 'R')).toHaveLength(10);
  });

  it('wraps 24-team schedule after the final USBC week', () => {
    const rows = buildMovementPreviewSchedule({
      startLane: 1,
      gameCount: 24,
      movementMode: 'league',
      stepPairs: 1,
      intervalGames: 1,
      leagueTeamCount: 24,
      numPairs: 12,
    });
    // Week 23: 24-1 on pair 21/22 → right lane 22
    expect(rows[22]).toMatchObject({ pair_label: '21/22', assigned_lane: 22 });
    // Week 24 restarts the grid at week 1
    expect(rows[23]).toMatchObject({ pair_label: '1/2', assigned_lane: 1 });
  });

  it('applies signed staggered steps (right then left)', () => {
    const rows = buildMovementPreviewSchedule({
      startLane: 5,
      gameCount: 3,
      movementMode: 'staggered',
      stepPairs: 1,
      intervalGames: 1,
      staggeredSteps: [1, -2],
      numPairs: 10,
    });
    expect(rows.map((r) => r.pair_label)).toEqual(['5/6', '7/8', '3/4']);
  });
});
