import { describe, expect, it } from 'vitest';

import {
  getCompetitionMethodDisplayLabel,
  hasOutgoingRoundRelationship,
} from '@/utils/competitionMethodDisplay';

describe('competitionMethodDisplay', () => {
  it('calls a template eliminator round a qualifier when it leads to another round', () => {
    const relationships = [
      { source_ref: 'qualifying', target_ref: 'final' },
      { source_ref: 'final', target_final_ref: 'championship' },
    ];

    expect(
      getCompetitionMethodDisplayLabel('eliminator', {
        roundRef: 'qualifying',
        relationships,
      })
    ).toBe('Qualifier');
  });

  it('calls a live eliminator round a qualifier when it leads to another round', () => {
    const relationships = [
      { source_round_id: 10, target_round_id: 20 },
      { source_round_id: 20, target_round_id: null },
    ];

    expect(
      getCompetitionMethodDisplayLabel('eliminator', {
        roundId: 10,
        relationships,
      })
    ).toBe('Qualifier');
  });

  it('keeps terminal and final-node-only eliminator rounds named eliminator', () => {
    const relationships = [
      { source_ref: 'final', target_final_ref: 'championship' },
      { source_round_id: 20, target_round_id: null },
    ];

    expect(
      getCompetitionMethodDisplayLabel('eliminator', {
        roundRef: 'final',
        relationships,
      })
    ).toBe('Eliminator');
    expect(
      getCompetitionMethodDisplayLabel('eliminator', {
        roundId: 20,
        relationships,
      })
    ).toBe('Eliminator');
  });

  it('formats other competition methods without relationship-dependent naming', () => {
    expect(getCompetitionMethodDisplayLabel('round_robin')).toBe('Round Robin');
    expect(getCompetitionMethodDisplayLabel('stepladder')).toBe('Stepladder');
    expect(getCompetitionMethodDisplayLabel(null)).toBe('Round');
  });

  it('requires the relationship source to match the requested round', () => {
    expect(
      hasOutgoingRoundRelationship({
        roundRef: 'final',
        relationships: [{ source_ref: 'qualifying', target_ref: 'final' }],
      })
    ).toBe(false);
  });
});
