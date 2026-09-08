import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EventsAPI } from '../../api/events';
import { DirectorsAPI } from '../../api/directors';
import RoundFlowManagement from '../../components/event/flow/RoundFlowManagement';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import { isDirectorSuiteRole } from '../../utils/roles';
import { mapDirectorAccessToUiFlags } from '../../utils/directorAccessUi';

const EventFlowPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const eventIdNumber = eventId ? parseInt(eventId, 10) : 0;
  const { user } = useAuth();
  const isAdmin = !!user && user.role === Role.ADMIN;
  const roleAwareNav = useRoleAwareNavigation(user);

  const { data: directorAccess, isLoading: directorAccessLoading } = useQuery({
    queryKey: ['directorAccess', eventIdNumber],
    queryFn: () => DirectorsAPI.getEventDirectorAccess(eventIdNumber),
    enabled: !!user && !!eventIdNumber && isDirectorSuiteRole(user.role),
  });
  const { canEditEventFormat } = mapDirectorAccessToUiFlags(directorAccess, isAdmin);
  const isAuthorizedForManagement = !!user && canEditEventFormat;

  // Fetch event details
  const { data: event, isLoading: eventLoading, error } = useQuery({
    queryKey: ['event', eventIdNumber],
    queryFn: () => EventsAPI.getEvent(eventIdNumber),
    enabled: !!eventIdNumber,
  });

  if (eventLoading || directorAccessLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading size="medium" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <Alert
          variant="error"
          message="Event not found or failed to load."
          className="mb-4"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb navigation */}
      <Breadcrumb 
        items={[
          { label: 'Home', path: '/' },
          { label: 'Tournaments', path: roleAwareNav.getRoleAwarePath('/tournaments', { preserveQuery: true }) },
          { label: 'Tournament', path: roleAwareNav.getTournamentPath(event.tournament_id) },
          { label: event.name }
        ]} 
      />

      {/* Page header */}
      <div className="mb-6">
        <PageTitle size="responsive" className="mb-1">Event Flow</PageTitle>
        <p className="text-text-muted text-sm sm:text-base">
          View tournament progression; click a round to tweak format settings for this event
        </p>
      </div>

      {/* Flow management component */}
      <RoundFlowManagement
        eventId={eventIdNumber}
        isAuthorizedForManagement={isAuthorizedForManagement}
        isTeamEvent={event.event_format === 'teams'}
      />
    </div>
  );
};

export default EventFlowPage; 