import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAwareNavigation } from '../utils/roleBasedRouting';
import PageTitle from '../components/common/PageTitle';
import Button from '../components/common/Button';

const AccessDenied: React.FC = () => {
  const [params] = useSearchParams();
  const reason = params.get('reason') || 'You do not have permission to view or change this resource.';
  const { user } = useAuth();
  const nav = useRoleAwareNavigation(user);

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <PageTitle>Access denied</PageTitle>
      <p className="text-text-muted mt-4 mb-8">{reason}</p>
      <Link to={nav.getDashboardPath()}>
        <Button variant="darkbackground">Go to dashboard</Button>
      </Link>
    </div>
  );
};

export default AccessDenied;
