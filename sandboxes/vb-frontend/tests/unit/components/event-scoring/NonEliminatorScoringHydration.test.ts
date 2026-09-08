import { describe, expect, it } from 'vitest';
import {
  pickServerCarryPreferredTotal,
  resolvePersistedTeamMemberScore,
} from '../../../../src/components/event-scoring/nonEliminatorScoringUtils';

describe('nonEliminatorScoringUtils', () => {
  it('hydrates team member score from persisted child games', () => {
    const score = resolvePersistedTeamMemberScore(
      [
        { id: 1, parent_game_id: 90, event_participant_id: 21, score: 201 },
        { id: 2, parent_game_id: 90, event_participant_id: 22, score: 213 },
      ],
      90,
      22
    );
    expect(score).toBe(213);
  });

  it('pickServerCarryPreferredTotal uses total_pinfall for scratch relationship', () => {
    const map = {
      7: {
        by_event_participant_id: {
          '12': { total_pinfall: 600, total_score: 650 },
        },
      },
    };
    const v = pickServerCarryPreferredTotal(
      map,
      { id: 7, score_basis: 'scratch', advancement_type: 'total_pinfall' },
      12,
      false
    );
    expect(v).toBe(600);
  });

  it('pickServerCarryPreferredTotal uses total_score for handicap relationship', () => {
    const map = {
      8: {
        by_event_participant_id: {
          '3': { total_pinfall: 500, total_score: 580 },
        },
      },
    };
    const v = pickServerCarryPreferredTotal(
      map,
      { id: 8, score_basis: 'handicap', advancement_type: 'total_pinfall' },
      3,
      false
    );
    expect(v).toBe(580);
  });
});
