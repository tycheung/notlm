import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';

import { Role, type UserRead } from '@/types/user';
import {
  RouteCategory,
  getAccountPath,
  getBowlingCentersPath,
  getDashboardPath,
  getDetailsPath,
  getEventPath,
  getGamePath,
  getRoleAwarePath,
  getRolePrefix,
  getRoundPath,
  getSquadPath,
  getTournamentPath,
  getTournamentsListPath,
  useRoleAwareNavigation,
} from '@/utils/roleBasedRouting';

const tdUser: UserRead = {
  id: 1,
  first_name: 'Test',
  last_name: 'Director',
  email: 'td@example.com',
  role: Role.TD,
  created_at: '2026-01-01T00:00:00',
  is_active: true,
  is_verified: true,
  can_claim: false,
};

const adminUser: UserRead = {
  ...tdUser,
  id: 2,
  role: Role.ADMIN,
};

const bowlerUser: UserRead = {
  ...tdUser,
  id: 3,
  role: Role.BOWLER,
};

describe('getRolePrefix', () => {
  it('returns /director for tournament directors', () => {
    expect(getRolePrefix(tdUser)).toBe('/director');
  });

  it('returns /admin for admins', () => {
    expect(getRolePrefix(adminUser)).toBe('/admin');
  });

  it('returns empty string for bowlers and guests', () => {
    expect(getRolePrefix(bowlerUser)).toBe('');
    expect(getRolePrefix(null)).toBe('');
  });
});

describe('getRoleAwarePath', () => {
  it('prefixes TD event paths with /director', () => {
    expect(getEventPath(42, tdUser)).toBe('/director/events/42');
    expect(getEventPath(42, tdUser, '/edit')).toBe('/director/events/42/edit');
  });

  it('prefixes admin tournament paths with /admin', () => {
    expect(getTournamentPath(7, adminUser)).toBe('/admin/tournaments/7');
  });

  it('keeps public paths for bowlers when category allows public access', () => {
    expect(getTournamentPath(7, bowlerUser)).toBe('/tournaments/7');
    expect(getEventPath(9, bowlerUser)).toBe('/events/9');
  });

  it('preserves query strings when preserveQuery is true', () => {
    expect(
      getRoleAwarePath('/events/1?view=bowler', tdUser, {
        category: RouteCategory.EVENTS,
        preserveQuery: true,
      })
    ).toBe('/director/events/1?view=bowler');
  });

  it('returns dashboard paths per role', () => {
    expect(getDashboardPath(tdUser)).toBe('/director');
    expect(getDashboardPath(adminUser)).toBe('/admin');
    expect(getDashboardPath(bowlerUser)).toBe('/dashboard');
  });

  it('routes squads and rounds through director prefix for TDs', () => {
    expect(getSquadPath(5, tdUser)).toBe('/director/squads/5');
    expect(getRoundPath(11, tdUser)).toBe('/director/rounds/11');
  });

  it('routes account through director prefix for TDs', () => {
    expect(getAccountPath(tdUser)).toBe('/director/account');
  });

  it('routes bowling centers and games through director prefix for TDs', () => {
    expect(getBowlingCentersPath(tdUser)).toBe('/director/bowling-centers');
    expect(getGamePath(15, tdUser)).toBe('/director/games/15');
    expect(getGamePath(15, tdUser, '/edit')).toBe('/director/games/15/edit');
  });

  it('builds tournament details path for directors', () => {
    expect(getDetailsPath(22, tdUser)).toBe('/director/tournaments/22');
    expect(getDetailsPath(22, adminUser)).toBe('/admin/tournaments/22');
  });
});

describe('getTournamentsListPath', () => {
  it('sends TDs and admins to management list routes', () => {
    expect(getTournamentsListPath(tdUser)).toBe('/director/tournaments');
    expect(getTournamentsListPath(adminUser)).toBe('/admin/tournaments');
  });

  it('sends bowlers to the public tournaments list', () => {
    expect(getTournamentsListPath(bowlerUser)).toBe('/tournaments');
    expect(getTournamentsListPath(null)).toBe('/tournaments');
  });
});

describe('useRoleAwareNavigation', () => {
  it('returns role-aware path helpers bound to the current user', () => {
    const { result } = renderHook(() => useRoleAwareNavigation(tdUser));

    expect(result.current.getEventPath(42)).toBe('/director/events/42');
    expect(result.current.getTournamentPath(7, '/edit')).toBe('/director/tournaments/7/edit');
    expect(result.current.getSquadPath(5)).toBe('/director/squads/5');
    expect(result.current.getRoundPath(11)).toBe('/director/rounds/11');
    expect(result.current.getGamePath(3)).toBe('/director/games/3');
    expect(result.current.getBowlingCentersPath()).toBe('/director/bowling-centers');
    expect(result.current.getAccountPath()).toBe('/director/account');
    expect(result.current.getDashboardPath()).toBe('/director');
    expect(result.current.getTournamentsListPath()).toBe('/director/tournaments');
    expect(result.current.getRoleAwarePath('/events/1', { category: RouteCategory.EVENTS })).toBe(
      '/director/events/1'
    );
  });
});
