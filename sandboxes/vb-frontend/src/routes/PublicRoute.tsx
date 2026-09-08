import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardRoute } from '../utils/roles';

interface PublicRouteProps {
  children: React.ReactNode;
}

/** Auth recovery flows must stay reachable even with an existing session. */
const AUTH_RECOVERY_PREFIXES = [
  '/reset-password',
  '/verify-email',
  '/forgot-password',
] as const;

/**
 * Route component for public routes.
 * If the user is already authenticated, redirect to their dashboard — except for
 * password-reset / email-verify flows, which must still render.
 */
const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const isLoggingOut = localStorage.getItem('__logging_out');
    if (isLoggingOut) {
      localStorage.removeItem('__logging_out');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-2 text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  const isLoggingOut = localStorage.getItem('__logging_out') === 'true';
  if (isLoggingOut) {
    return <>{children}</>;
  }

  const isAuthRecovery = AUTH_RECOVERY_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix)
  );

  if (isAuthenticated && !isAuthRecovery) {
    return <Navigate to={getDashboardRoute(user?.role)} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
