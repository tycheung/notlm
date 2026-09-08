import { describe, expect, it } from 'vitest';
import { buildTeamDisplayName } from '@/utils/teamDisplayName';

describe('buildTeamDisplayName', () => {
  it('prefers a custom team name', () => {
    expect(
      buildTeamDisplayName({
        teamName: '  Pin Crushers  ',
        teamNumber: 4,
        memberLastNames: ['Smith', 'Jones'],
      })
    ).toBe('Pin Crushers');
  });

  it('joins every roster last name in order when the custom name is blank', () => {
    expect(
      buildTeamDisplayName({
        teamName: '',
        teamNumber: 2,
        memberLastNames: ['Smith', 'Jones'],
      })
    ).toBe('Smith/Jones');
    expect(
      buildTeamDisplayName({
        teamName: '',
        teamNumber: 5,
        memberLastNames: ['Smith', 'Jones', 'Lee', 'Park', 'Kim'],
      })
    ).toBe('Smith/Jones/Lee/Park/Kim');
  });

  it('falls back to Team {number} when there are no last names', () => {
    expect(buildTeamDisplayName({ teamName: null, teamNumber: 7 })).toBe('Team 7');
  });
});
