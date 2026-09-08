import { describe, expect, it } from 'vitest';
import {
  defaultStartingLaneSortKey,
  sortScoringParticipants,
} from '@/utils/scoringParticipantSort';

describe('scoringParticipantSort', () => {
  const participants = [
    { id: 1, user_name: 'Zed', squadParticipantId: 101 },
    { id: 2, user_name: 'Amy', squadParticipantId: 102 },
    { id: 3, user_name: 'Bob', squadParticipantId: 103 },
  ];

  it('sorts by name A–Z', () => {
    const sorted = sortScoringParticipants(participants, 'name');
    expect(sorted.map((p) => p.user_name)).toEqual(['Amy', 'Bob', 'Zed']);
  });

  it('sorts by starting lane using game 1 lane labels', () => {
    const lookup = new Map<string, string>([
      ['101:1', '36D'],
      ['102:1', '7C'],
      ['103:1', '21A'],
    ]);
    const sorted = sortScoringParticipants(participants, 'starting_lane', {
      laneLabelLookup: lookup,
    });
    expect(sorted.map((p) => p.user_name)).toEqual(['Amy', 'Bob', 'Zed']);
  });

  it('parses lane labels for sort keys', () => {
    expect(
      defaultStartingLaneSortKey(
        { user_name: 'Test', squadParticipantId: 5 },
        new Map([['5:1', '36D']])
      )
    ).toEqual({
      lane: 36,
      slot: 3,
      name: 'Test',
    });
  });
});
