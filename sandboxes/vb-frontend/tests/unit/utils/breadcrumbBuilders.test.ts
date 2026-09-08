import { describe, expect, it } from 'vitest';

import { Role, type UserRead } from '@/types/user';
import {
  homeCrumb,
  layoutDashboardCrumb,
  tournamentsListCrumb,
} from '@/utils/breadcrumbBuilders';

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

describe('breadcrumbBuilders', () => {
  it('homeCrumb points to public home', () => {
    expect(homeCrumb()).toEqual({ label: 'Home', path: '/' });
  });

  it('layoutDashboardCrumb selects director dashboard on /director paths', () => {
    expect(layoutDashboardCrumb('/director/tournaments')).toEqual({
      label: 'Dashboard',
      path: '/director',
    });
    expect(layoutDashboardCrumb('/admin/users')).toEqual({
      label: 'Dashboard',
      path: '/admin',
    });
    expect(layoutDashboardCrumb('/dashboard')).toEqual({
      label: 'Dashboard',
      path: '/dashboard',
    });
  });

  it('tournamentsListCrumb respects TD management route', () => {
    expect(tournamentsListCrumb(tdUser)).toEqual({
      label: 'Tournaments',
      path: '/director/tournaments',
    });
    expect(tournamentsListCrumb(null)).toEqual({
      label: 'Tournaments',
      path: '/tournaments',
    });
  });
});
