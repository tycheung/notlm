import { describe, expect, it } from 'vitest';
import {
  getLeagueSchedule,
  leagueAssignmentForGame,
} from '@/features/lanes/usbcSchedules';

describe('USBC league schedule wrap offset', () => {
  it('ignores wrap offset during the first schedule cycle', () => {
    const { pair, assignedLane } = leagueAssignmentForGame({
      startLane: 1,
      gameNumber: 1,
      teamCount: 8,
      wrapPairOffset: 2,
    });
    expect(pair).toEqual([1, 2]);
    expect(assignedLane).toBe(1);
  });

  it('shifts pairs when the schedule wraps back to week 1', () => {
    const cycle = getLeagueSchedule(8).length;
    const { pair, assignedLane } = leagueAssignmentForGame({
      startLane: 1,
      gameNumber: cycle + 1,
      teamCount: 8,
      wrapPairOffset: 2,
    });
    expect(pair).toEqual([5, 6]);
    expect(assignedLane).toBe(5);
  });

  it('matches +6 pair shift example on 20-team wrap', () => {
    const cycle = getLeagueSchedule(20).length;
    const from1 = leagueAssignmentForGame({
      startLane: 1,
      gameNumber: cycle + 1,
      teamCount: 20,
      wrapPairOffset: 6,
    });
    const from7 = leagueAssignmentForGame({
      startLane: 7,
      gameNumber: cycle + 1,
      teamCount: 20,
      wrapPairOffset: 6,
    });
    expect(from1.pair).toEqual([13, 14]);
    expect(from1.assignedLane).toBe(13);
    expect(from7.pair).toEqual([19, 20]);
    expect(from7.assignedLane).toBe(19);
  });
});
