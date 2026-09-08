import React from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';

const EventSquadsRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const rolePrefix = location.pathname.startsWith('/admin/')
    ? '/admin'
    : location.pathname.startsWith('/director/')
      ? '/director'
      : '';

  return <Navigate to={`${rolePrefix}/events/${id}?tab=squads`} replace />;
};

export default EventSquadsRedirect;
