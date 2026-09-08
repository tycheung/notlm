import { describe, expect, it } from 'vitest';
import { tournamentFlowRelationshipsQueryKey } from '../../../../../src/components/event/flow/eventFlowQueries';

describe('tournamentFlowRelationshipsQueryKey', () => {
  it('shares the Event Details roundRelationships cache key', () => {
    expect(tournamentFlowRelationshipsQueryKey(42)).toEqual(['roundRelationships', 42]);
  });
});
