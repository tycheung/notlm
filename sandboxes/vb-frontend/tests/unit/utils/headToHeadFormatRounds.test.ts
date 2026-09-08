import { describe, expect, it } from 'vitest';
import {
  eventHasHeadToHeadFormatRounds,
  isHeadToHeadCompetitionMethod,
} from '@/utils/headToHeadFormatRounds';

describe('headToHeadFormatRounds', () => {
  it('recognizes RR, bracket, pods, and stepladder', () => {
    expect(isHeadToHeadCompetitionMethod('round_robin')).toBe(true);
    expect(isHeadToHeadCompetitionMethod('bracket')).toBe(true);
    expect(isHeadToHeadCompetitionMethod('pods')).toBe(true);
    expect(isHeadToHeadCompetitionMethod('stepladder')).toBe(true);
    expect(isHeadToHeadCompetitionMethod('eliminator')).toBe(false);
  });

  it('detects H2H rounds on an event', () => {
    expect(
      eventHasHeadToHeadFormatRounds({
        rounds: [{ competition_method: 'eliminator' } as any],
      })
    ).toBe(false);
    expect(
      eventHasHeadToHeadFormatRounds({
        rounds: [
          { competition_method: 'eliminator' } as any,
          { competition_method: 'stepladder' } as any,
        ],
      })
    ).toBe(true);
  });
});
