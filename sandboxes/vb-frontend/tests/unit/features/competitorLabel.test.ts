import { describe, expect, it } from 'vitest';

import {
  competitorColumnLabel,
  entryUnitFromTypeConfig,
} from '@/features/side-actions/competitorLabel';

describe('competitorColumnLabel', () => {
  it('labels team pots Team', () => {
    expect(competitorColumnLabel('team')).toBe('Team');
  });

  it('labels missing or bowler as Bowler', () => {
    expect(competitorColumnLabel(undefined)).toBe('Bowler');
    expect(competitorColumnLabel('bowler')).toBe('Bowler');
  });
});

describe('entryUnitFromTypeConfig', () => {
  it('reads entry_unit from type_config', () => {
    expect(entryUnitFromTypeConfig({ entry_unit: 'team' })).toBe('team');
    expect(entryUnitFromTypeConfig({})).toBe('bowler');
  });
});
