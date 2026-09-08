import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/user';
import Loading from '../components/common/Loading';
import { isImpersonating } from '../utils/impersonationSession';

interface AdminRouteProps {
  children?: React.ReactNode;
}

// Component for protecting routes that require admin access
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show enhanced loading state that doesn't redirect while auth is still loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
        <p className="ml-2 text-text-muted">Verifying admin permissions...</p>
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

  // If authenticated but not admin, redirect to dashboard
  if (user.role !== Role.ADMIN) {
    if (isImpersonating()) {
      return <Navigate to="/director" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and admin, render the children or outlet
  return children ? <>{children}</> : <Outlet />;
};

export default AdminRoute;
