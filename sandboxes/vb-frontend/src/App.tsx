import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './utils/queryClient';

import UserLayout from './components/layout/UserLayout';
import AdminLayout from './components/layout/AdminLayout';
import TournamentDirectorLayout from './components/layout/TournamentDirectorLayout';
import ImpersonationBanner from './components/layout/ImpersonationBanner';

import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';
import TournamentDirectorRoute from './routes/TournamentDirectorRoute';
import PublicRoute from './routes/PublicRoute';
import {
  AdvancementFormatRedirect,
  getAdvancementFormatRedirectTarget,
  renderRoleScopedRoutes,
} from './routes/roleScopedRoutes';

import { useAuth } from './contexts/AuthContext';
import { Role } from './types/user';
import { isDirectorSuiteRole, getDashboardRoute } from './utils/roles';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));

const Home = lazy(() => import('./pages/Home'));
const TournamentList = lazy(() => import('./pages/tournaments/TournamentList'));
const TournamentDetails = lazy(() => import('./pages/tournaments/TournamentDetails'));

const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/legal/CookiePolicy'));
const RefundPolicy = lazy(() => import('./pages/legal/RefundPolicy'));

const MobileDeleteAccount = lazy(() => import('./pages/tutorial/mobile/MobileDeleteAccount'));

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const AccountPage = lazy(() => import('./pages/user/AccountPage'));
const ManageSubscriptionPage = lazy(() => import('./pages/billing/ManageSubscriptionPage'));
const UserPerformanceTracking = lazy(() => import('./pages/user/UserPerformanceTracking'));
const NotificationList = lazy(() => import('./pages/notifications/NotificationList'));
const MyTournaments = lazy(() => import('./pages/tournaments/MyTournaments'));

const EventCreate = lazy(() => import('./pages/events/EventCreate'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));
const EventDetails = lazy(() => import('./pages/events/EventDetails'));
const EventEditPage = lazy(() => import('./pages/events/EventEditPage'));
const SquadEdit = lazy(() => import('./pages/squads/SquadEdit'));
const SquadDetails = lazy(() => import('./pages/squads/SquadDetails'));
const RoundDetails = lazy(() => import('./pages/rounds/RoundDetails'));
const GameDetails = lazy(() => import('./pages/games/GameDetails'));

const TournamentDirectorDashboard = lazy(
  () => import('./pages/tournament_director/TournamentDirectorDashboard')
);

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'));
const SystemStatus = lazy(() => import('./pages/admin/SystemStatus'));
const AbuseReports = lazy(() => import('./pages/admin/AbuseReports'));
const AdminGrantCredits = lazy(() => import('./pages/admin/AdminGrantCredits'));
const AdminTdCredits = lazy(() => import('./pages/admin/AdminTdCredits'));
const AdminEventSchedule = lazy(() => import('./pages/admin/AdminEventSchedule'));
const AdminViewAsTd = lazy(() => import('./pages/admin/AdminViewAsTd'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

const queryClient = createQueryClient();

const RouteFallback = () => (
  <div className="flex h-screen items-center justify-center bg-bg">
    <div className="text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      <p className="mt-2 text-text-muted">Loading...</p>
    </div>
  </div>
);

const UserLayoutWrapper = () => (
  <UserLayout>
    <Outlet />
  </UserLayout>
);

const AdminLayoutWrapper = () => (
  <AdminLayout>
    <Outlet />
  </AdminLayout>
);

const TournamentDirectorLayoutWrapper = () => (
  <TournamentDirectorLayout>
    <Outlet />
  </TournamentDirectorLayout>
);

const DashboardRouter = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isInBowlerView = searchParams.get('view') === 'bowler';

  if (isInBowlerView) {
    return <Dashboard />;
  }

  if (user?.role === Role.ADMIN) {
    return <Navigate to="/admin" replace />;
  }
  if (user?.role === Role.TD || user?.role === Role.SA) {
    return <Navigate to="/director" replace />;
  }

  return <Dashboard />;
};

const HomeRouter = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const isInBowlerView = searchParams.get('view') === 'bowler';

  if (loading) {
    return <RouteFallback />;
  }

  if (isAuthenticated) {
    if (isInBowlerView) {
      return <Navigate to="/dashboard?view=bowler" replace />;
    }

    return <Navigate to={getDashboardRoute(user?.role)} replace />;
  }

  return <Home />;
};

const AdaptiveTournamentManagement = () => {
  const { user } = useAuth();

  if (user?.role === Role.ADMIN) {
    return <Navigate to="/admin/tournaments" replace />;
  }
  return <Navigate to="/director/tournaments" replace />;
};

export { getAdvancementFormatRedirectTarget };

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ImpersonationBanner />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
            <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
            <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />

            <Route path="/" element={<HomeRouter />} />

            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/refunds" element={<RefundPolicy />} />
            <Route path="/pricing" element={<PricingPage />} />

            <Route path="/tutorial/mobile/delete-account" element={<MobileDeleteAccount />} />

            <Route element={<UserLayoutWrapper />}>
              <Route path="/tournaments" element={<TournamentList />} />
              <Route
                path="/tournaments/nearby"
                element={<Navigate to="/tournaments" replace />}
              />
              <Route path="/tournaments/:id" element={<TournamentDetails />} />

              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/squads/:id" element={<SquadDetails />} />
              <Route path="/rounds/:id" element={<RoundDetails />} />
              <Route path="/games/:id" element={<GameDetails />} />

              <Route element={<PrivateRoute />}>
                <Route path="/events/:id/edit" element={<EventEditPage />} />
                <Route path="/tournaments/:tournamentId/events/create" element={<EventCreate />} />
                <Route path="/events/:eventId/squads/create" element={<AdvancementFormatRedirect />} />
                <Route path="/events/:eventId/rounds/create" element={<AdvancementFormatRedirect />} />
                <Route path="/squads/:id/edit" element={<SquadEdit />} />
                <Route path="/dashboard" element={<DashboardRouter />} />
                <Route path="/access-denied" element={<AccessDenied />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/subscription" element={<ManageSubscriptionPage />} />
                <Route path="/performance-tracking" element={<UserPerformanceTracking />} />
                <Route path="/notifications" element={<NotificationList />} />
                <Route path="/my-tournaments" element={<MyTournaments />} />
              </Route>
            </Route>

            <Route path="/tournaments/manage" element={<AdaptiveTournamentManagement />} />

            <Route element={<TournamentDirectorLayoutWrapper />}>
              <Route element={<TournamentDirectorRoute />}>
                <Route path="/director" element={<TournamentDirectorDashboard />} />
                {renderRoleScopedRoutes('director')}
              </Route>
            </Route>

            <Route element={<AdminLayoutWrapper />}>
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/happening-today" element={<AdminEventSchedule />} />
                <Route path="/admin/coming-up" element={<AdminEventSchedule />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/abuse-reports" element={<AbuseReports />} />
                <Route path="/admin/grant-credits" element={<AdminGrantCredits />} />
                <Route path="/admin/td-credits" element={<AdminTdCredits />} />
                <Route path="/admin/system-settings" element={<SystemSettings />} />
                <Route path="/admin/system-status" element={<SystemStatus />} />
                <Route path="/admin/view-as-td" element={<AdminViewAsTd />} />
                {renderRoleScopedRoutes('admin')}
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
