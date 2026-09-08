import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isDirectorSuiteRole } from '../utils/roles';
import Loading from '../components/common/Loading';

interface TournamentDirectorRouteProps {
  children?: React.ReactNode;
}

/**
 * Route component for tournament director routes.
 * If user is not a tournament director or admin, redirects to dashboard.
 */
const TournamentDirectorRoute: React.FC<TournamentDirectorRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  // Show enhanced loading state that doesn't redirect while auth is still loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
        <p className="ml-2 text-text-muted">Verifying permissions...</p>
      </div>
    );
  }
  
  // Only redirect if we're definitely not authenticated
  if (!isAuthenticated || !user) {
    // Save the current path for redirect after login
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }
  
  const canAccessDirectorPortal = isDirectorSuiteRole(user.role);
  
  if (!canAccessDirectorPortal) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};

export default TournamentDirectorRoute;
