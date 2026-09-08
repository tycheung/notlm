import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/common/Loading';

interface PrivateRouteProps {
  children?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Route component for private/protected routes
 * If user is not authenticated, redirects to login page
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  redirectTo = '/login' 
}) => {
  // Use the auth context instead of directly checking localStorage
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  
  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
        <p className="ml-2 text-text-muted">Loading...</p>
      </div>
    );
  }
  
  // If not authenticated, redirect to login but save the current location
  if (!isAuthenticated) {
    // Save the current location to redirect back after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }
  
  // If authenticated, render children or outlet
  return children ? <>{children}</> : <Outlet />;
};

export default PrivateRoute;
