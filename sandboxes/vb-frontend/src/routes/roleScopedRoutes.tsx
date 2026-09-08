import React, { lazy } from 'react';
import { Navigate, Route, useParams } from 'react-router-dom';

const AccessDenied = lazy(() => import('../pages/AccessDenied'));
const AccountPage = lazy(() => import('../pages/user/AccountPage'));
const ManageSubscriptionPage = lazy(
  () => import('../pages/billing/ManageSubscriptionPage')
);
const ActionsNeeded = lazy(() => import('../pages/tournament_director/ActionsNeeded'));
const BowlerLookupPage = lazy(() => import('../pages/user/BowlerLookupPage'));
const TdBowlerAveragesPage = lazy(
  () => import('../pages/tournament_director/TdBowlerAveragesPage')
);
const BowlingCenterManagement = lazy(
  () => import('../pages/tournament_director/BowlingCenterManagement')
);
const EventCreate = lazy(() => import('../pages/events/EventCreate'));
const EventDetails = lazy(() => import('../pages/events/EventDetails'));
const EventEditPage = lazy(() => import('../pages/events/EventEditPage'));
const EventFlowPage = lazy(() => import('../pages/events/EventFlowPage'));
const EventFormatManagement = lazy(() => import('../pages/eventFormats/EventFormatManagement'));
const EventFormatWizard = lazy(() => import('../pages/eventFormats/EventFormatWizard'));
const SideActionTemplateManagement = lazy(
  () => import('../pages/sideActionTemplates/SideActionTemplateManagement')
);
const SideActionTemplateEdit = lazy(
  () => import('../pages/sideActionTemplates/SideActionTemplateEdit')
);
const EventSquadsRedirect = lazy(() => import('../pages/events/EventSquadsRedirect'));
const GameDetails = lazy(() => import('../pages/games/GameDetails'));
const RoundDetails = lazy(() => import('../pages/rounds/RoundDetails'));
const RoundsManagement = lazy(() => import('../pages/rounds/RoundsManagement'));
const SquadDetails = lazy(() => import('../pages/squads/SquadDetails'));
const SquadEdit = lazy(() => import('../pages/squads/SquadEdit'));
const SideActionManagement = lazy(
  () => import('../pages/sideActions/SideActionManagement')
);
const SaEventDetails = lazy(() => import('../pages/sideActions/SaEventDetails'));
const TournamentDetails = lazy(() => import('../pages/tournaments/TournamentDetails'));
const TournamentManagement = lazy(
  () => import('../pages/tournament_director/TournamentManagement')
);

export type RolePrefix = 'director' | 'admin';

export const getAdvancementFormatRedirectTarget = (
  eventId?: string,
  rolePrefix = ''
): string => {
  if (!eventId) return '/';
  const prefix = rolePrefix ? `/${rolePrefix}` : '';
  return `${prefix}/events/${eventId}`;
};

const AdvancementFormatRedirect: React.FC<{ rolePrefix?: string }> = ({
  rolePrefix = '',
}) => {
  const { eventId } = useParams<{ eventId: string }>();
  return <Navigate to={getAdvancementFormatRedirectTarget(eventId, rolePrefix)} replace />;
};

/** Path suffixes under /{prefix}/ shared by director and admin. */
export const SHARED_ROLE_ROUTE_PATHS = [
  'account',
  'subscription',
  'tournaments',
  'tournaments/:id',
  'side-actions',
  'side-actions/events/:id',
  'events/:id',
  'events/:id/edit',
  'events/:id/rounds',
  'events/:id/squads',
  'tournaments/:tournamentId/events/create',
  'events/:eventId/squads/create',
  'events/:eventId/rounds/create',
  'events/:eventId/flow',
  'event-formats',
  'event-formats/wizard',
  'event-formats/wizard/:templateId',
  'side-action-templates',
  'side-action-templates/:templateId',
  'squads/:id/edit',
  'squads/:id',
  'rounds/:id',
  'games/:id',
  'bowling-centers',
  'actions-needed',
  'bowlers',
  'bowlers/:userId',
  'averages',
  'access-denied',
] as const;

export const getSharedRolePaths = (prefix: RolePrefix): string[] =>
  SHARED_ROLE_ROUTE_PATHS.map((path) => `/${prefix}/${path}`);

type SharedRouteDef = {
  path: (typeof SHARED_ROLE_ROUTE_PATHS)[number];
  element: (prefix: RolePrefix) => React.ReactElement;
};

const SHARED_ROLE_ROUTES: SharedRouteDef[] = [
  { path: 'account', element: () => <AccountPage /> },
  { path: 'subscription', element: () => <ManageSubscriptionPage /> },
  { path: 'tournaments', element: () => <TournamentManagement /> },
  { path: 'tournaments/:id', element: () => <TournamentDetails /> },
  { path: 'side-actions', element: () => <SideActionManagement /> },
  { path: 'side-actions/events/:id', element: () => <SaEventDetails /> },
  { path: 'events/:id', element: () => <EventDetails /> },
  { path: 'events/:id/edit', element: () => <EventEditPage /> },
  { path: 'events/:id/rounds', element: () => <RoundsManagement /> },
  { path: 'events/:id/squads', element: () => <EventSquadsRedirect /> },
  {
    path: 'tournaments/:tournamentId/events/create',
    element: () => <EventCreate />,
  },
  {
    path: 'events/:eventId/squads/create',
    element: (prefix) => <AdvancementFormatRedirect rolePrefix={prefix} />,
  },
  {
    path: 'events/:eventId/rounds/create',
    element: (prefix) => <AdvancementFormatRedirect rolePrefix={prefix} />,
  },
  { path: 'events/:eventId/flow', element: () => <EventFlowPage /> },
  { path: 'event-formats', element: () => <EventFormatManagement /> },
  { path: 'event-formats/wizard', element: () => <EventFormatWizard /> },
  {
    path: 'event-formats/wizard/:templateId',
    element: () => <EventFormatWizard />,
  },
  {
    path: 'side-action-templates',
    element: () => <SideActionTemplateManagement />,
  },
  {
    path: 'side-action-templates/:templateId',
    element: () => <SideActionTemplateEdit />,
  },
  { path: 'squads/:id/edit', element: () => <SquadEdit /> },
  { path: 'squads/:id', element: () => <SquadDetails /> },
  { path: 'rounds/:id', element: () => <RoundDetails /> },
  { path: 'games/:id', element: () => <GameDetails /> },
  { path: 'bowling-centers', element: () => <BowlingCenterManagement /> },
  { path: 'actions-needed', element: () => <ActionsNeeded /> },
  { path: 'bowlers', element: () => <BowlerLookupPage /> },
  { path: 'bowlers/:userId', element: () => <BowlerLookupPage /> },
  { path: 'averages', element: () => <TdBowlerAveragesPage /> },
  { path: 'access-denied', element: () => <AccessDenied /> },
];

/** Shared /director/* and /admin/* resource routes (identical path shapes). */
export function renderRoleScopedRoutes(prefix: RolePrefix): React.ReactElement[] {
  return SHARED_ROLE_ROUTES.map(({ path, element }) => (
    <Route key={`${prefix}-${path}`} path={`/${prefix}/${path}`} element={element(prefix)} />
  ));
}

export { AdvancementFormatRedirect };
