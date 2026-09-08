import { describe, expect, it } from 'vitest';

import { getAdvancementFormatRedirectTarget } from '../../../src/App';
import {
  SHARED_ROLE_ROUTE_PATHS,
  getSharedRolePaths,
} from '../../../src/routes/roleScopedRoutes';

describe('getAdvancementFormatRedirectTarget', () => {
  it('routes legacy user path to clean event info URL', () => {
    expect(getAdvancementFormatRedirectTarget('42')).toBe('/events/42');
  });

  it('routes role-prefixed legacy path to clean event info URL', () => {
    expect(getAdvancementFormatRedirectTarget('42', 'director')).toBe('/director/events/42');
    expect(getAdvancementFormatRedirectTarget('42', 'admin')).toBe('/admin/events/42');
  });

  it('falls back to home when event id is missing', () => {
    expect(getAdvancementFormatRedirectTarget(undefined, 'director')).toBe('/');
  });
});

describe('shared director/admin role routes', () => {
  it('generates identical path patterns for director and admin from one list', () => {
    const directorPaths = getSharedRolePaths('director');
    const adminPaths = getSharedRolePaths('admin');

    expect(directorPaths).toHaveLength(SHARED_ROLE_ROUTE_PATHS.length);
    expect(adminPaths).toHaveLength(SHARED_ROLE_ROUTE_PATHS.length);

    expect(directorPaths).toEqual(
      SHARED_ROLE_ROUTE_PATHS.map((path) => `/director/${path}`)
    );
    expect(adminPaths).toEqual(
      SHARED_ROLE_ROUTE_PATHS.map((path) => `/admin/${path}`)
    );

    // Same relative shapes; only role prefix differs
    expect(directorPaths.map((p) => p.replace(/^\/director/, ''))).toEqual(
      adminPaths.map((p) => p.replace(/^\/admin/, ''))
    );
  });

  it('matches expected shared path snapshot', () => {
    expect(getSharedRolePaths('director')).toEqual([
      '/director/account',
      '/director/subscription',
      '/director/tournaments',
      '/director/tournaments/:id',
      '/director/side-actions',
      '/director/side-actions/events/:id',
      '/director/events/:id',
      '/director/events/:id/edit',
      '/director/events/:id/rounds',
      '/director/events/:id/squads',
      '/director/tournaments/:tournamentId/events/create',
      '/director/events/:eventId/squads/create',
      '/director/events/:eventId/rounds/create',
      '/director/events/:eventId/flow',
      '/director/event-formats',
      '/director/event-formats/wizard',
      '/director/event-formats/wizard/:templateId',
      '/director/side-action-templates',
      '/director/side-action-templates/:templateId',
      '/director/squads/:id/edit',
      '/director/squads/:id',
      '/director/rounds/:id',
      '/director/games/:id',
      '/director/bowling-centers',
      '/director/actions-needed',
      '/director/bowlers',
      '/director/bowlers/:userId',
      '/director/averages',
      '/director/access-denied',
    ]);

    expect(getSharedRolePaths('admin')).toEqual([
      '/admin/account',
      '/admin/subscription',
      '/admin/tournaments',
      '/admin/tournaments/:id',
      '/admin/side-actions',
      '/admin/side-actions/events/:id',
      '/admin/events/:id',
      '/admin/events/:id/edit',
      '/admin/events/:id/rounds',
      '/admin/events/:id/squads',
      '/admin/tournaments/:tournamentId/events/create',
      '/admin/events/:eventId/squads/create',
      '/admin/events/:eventId/rounds/create',
      '/admin/events/:eventId/flow',
      '/admin/event-formats',
      '/admin/event-formats/wizard',
      '/admin/event-formats/wizard/:templateId',
      '/admin/side-action-templates',
      '/admin/side-action-templates/:templateId',
      '/admin/squads/:id/edit',
      '/admin/squads/:id',
      '/admin/rounds/:id',
      '/admin/games/:id',
      '/admin/bowling-centers',
      '/admin/actions-needed',
      '/admin/bowlers',
      '/admin/bowlers/:userId',
      '/admin/averages',
      '/admin/access-denied',
    ]);
  });
});
