import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { TournamentsAPI } from '../../api/tournaments';
import { BowlingCentersAPI } from '../../api/bowling-centers';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import { isDirectorSuiteRole } from '../../utils/roles';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import EditableCard from '../../components/common/EditableCard';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import EventList from '../../components/event/EventList';
import { DirectorsAPI } from '../../api/directors';
import DirectorPermissionsModal from '../../components/director/DirectorPermissionsModal';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { formatDateTimeNaive, formatDateNaive, parseNaiveDateTimeToDate } from '../../utils/dateUtils';
import EventCreateModal from '../../components/event/EventCreateModal';
import Input from '../../components/common/Input';
import Label from '../../components/common/Label';
import {
  TournamentDetailsCard,
  TournamentRulesCard,
  TournamentDescriptionCard,
  TournamentLocationCard
} from '../../components/tournament/basicinfo';
import EventReportsMenuModal from '../../components/event-reports/EventReportsMenuModal';
import TournamentAccessBanner from '../../components/tournament/TournamentAccessBanner';
import SaOnlyModeBanner from '../../components/tournament/SaOnlyModeBanner';
import { canEditFullTournament, canEditSaEvent, TdAccessAPI } from '../../api/tdAccess';
import { isSaOnlyTournament } from '../../utils/saOnly';
import TournamentLiveViewer from '../../components/tournament/TournamentLiveViewer';
import TournamentResultsViewer from '../../components/tournament/TournamentResultsViewer';
import TournamentSharingModal from '../../components/tournament/TournamentSharingModal';

import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { useGuideModal } from '../../features/director-guide';

// CollapsibleSection component for smaller screens
const CollapsibleSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ title, defaultOpen = false, children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={`border-t border-border py-4 ${className}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left"
      >
        <h3 className="text-lg font-medium text-primary">{title}</h3>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 text-text transform transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div className={`mt-2 overflow-hidden transition-all ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
};

const TournamentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const tournamentId = id ? parseInt(id, 10) : 0;
  
  const { user } = useAuth();
  const roleAwareNav = useRoleAwareNavigation(user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isInBowlerView = searchParams.get('view') === 'bowler';
  const tabParam = searchParams.get('tab');
  const activeSection =
    tabParam === 'live' || tabParam === 'results' ? 'results' : 'info';
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [isEventCreateModalOpen, setIsEventCreateModalOpen] = useState(false);
  const openEventCreateModal = useCallback(() => setIsEventCreateModalOpen(true), []);
  useGuideModal('eventCreate', openEventCreateModal);
  const [directorPermissionsModalOpen, setDirectorPermissionsModalOpen] = useState(false);
  const [tournamentReportsOpen, setTournamentReportsOpen] = useState(false);
  const [sharingModalOpen, setSharingModalOpen] = useState(false);

  
  // Check if user is a tournament director or admin using Role enum
  const isTournamentDirector = !!user && isDirectorSuiteRole(user.role);
  
  // Normalize layout prefix based on role to keep correct navbar/layout
  useEffect(() => {
    const path = location.pathname;
    const search = location.search || '';
    if (isInBowlerView) return; // honor bowler view
    if (user?.role === Role.ADMIN && path.startsWith('/tournaments/')) {
      navigate(`/admin${path}${search}`, { replace: true });
    } else if (
      (user?.role === Role.TD || user?.role === Role.SA) &&
      path.startsWith('/tournaments/')
    ) {
      navigate(`/director${path}${search}`, { replace: true });
    }
  }, [location.pathname, location.search, user?.role, isInBowlerView, navigate]);

  const { data: myTournamentAccess } = useQuery({
    queryKey: ['myTournamentDirectorAccess', tournamentId],
    queryFn: () => DirectorsAPI.getMyTournamentAccess(tournamentId),
    enabled: !!user && !!tournamentId && isDirectorSuiteRole(user.role),
  });

  // Fetch tournament data
  const { data: tournament, isLoading: tournamentLoading, error: tournamentError } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => {
      try {
        const result = await TournamentsAPI.getTournament(tournamentId);
        return result;
      } catch (error) {
        console.error(`Error fetching tournament ID ${tournamentId}:`, error);
        throw error;
      }
    },
    enabled: !!tournamentId,
  });
  
  const isAdmin = user?.role === Role.ADMIN;
  const saOnly = isSaOnlyTournament(tournament);
  const accountCanEditShell = saOnly
    ? canEditSaEvent(user?.billing)
    : canEditFullTournament(user?.billing);

  const { data: tournamentAccess } = useQuery({
    queryKey: ['tournamentAccess', tournamentId],
    queryFn: () => TdAccessAPI.getTournamentAccess(tournamentId),
    enabled: !!tournamentId && !!user,
  });

  const licenseAllowsEdit =
    !tournamentAccess?.gating_enabled ||
    !!tournamentAccess?.runnable ||
    !!tournamentAccess?.can_extend_with_pass ||
    !tournamentAccess?.license_expired;

  const isTournamentMaster =
    !!isAdmin ||
    (!!user && !!tournament && user.id === tournament.organizer_id) ||
    !!myTournamentAccess?.is_tournament_master;

  const canCreateEvents =
    accountCanEditShell &&
    licenseAllowsEdit &&
    (!!isAdmin ||
      (!!user && !!tournament && user.id === tournament.organizer_id) ||
      !!myTournamentAccess?.can_create_events);

  const isAuthorizedToEdit =
    accountCanEditShell && licenseAllowsEdit && isTournamentMaster;
  
  // Fetch bowling center details
  const { data: bowlingCenter } = useQuery({
    queryKey: ['bowlingCenter', tournament?.bowling_center_id],
    queryFn: () => BowlingCentersAPI.getBowlingCenter(tournament?.bowling_center_id || 0),
    enabled: !!tournament?.bowling_center_id,
  });

  const organizerName =
    (tournament?.organizer_name || '').trim() ||
    (tournament?.organizer_id != null ? `User #${tournament.organizer_id}` : null);
  
  // Format date to be more readable using naive formatting
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return formatDateNaive(dateString);
  };
  
  const getEventSignUpCtaProps = () => {
    if (!user) {
      return {
        label: "Sign in to sign up",
        onClick: () =>
          navigate(`/login?redirect=/tournaments/${tournamentId}${isInBowlerView ? '?view=bowler' : ''}`),
        disabled: false,
        variant: "primary" as const,
      };
    }

    const now = new Date();
    const endDate = tournament?.end_date ? parseNaiveDateTimeToDate(tournament.end_date) : null;
    const directorClosedSignUps =
      !!tournament?.registration_deadline &&
      (parseNaiveDateTimeToDate(tournament.registration_deadline)?.getTime() ?? Number.POSITIVE_INFINITY) < now.getTime();

    if (endDate && now > endDate) {
      return {
        label: "Tournament ended",
        onClick: () => {},
        disabled: true,
        variant: "outline" as const,
      };
    }

    if (directorClosedSignUps) {
      return {
        label: "Sign-up closed",
        onClick: () => {},
        disabled: true,
        variant: "outline" as const,
      };
    }

    return {
      label: isInBowlerView ? 'View results' : 'View events',
      onClick: () => {
        if (isInBowlerView) {
          const next = new URLSearchParams(searchParams);
          next.set('tab', 'results');
          next.set('view', 'bowler');
          setSearchParams(next, { replace: true });
          return;
        }
        document.getElementById('tournament-events')?.scrollIntoView({ behavior: 'smooth' });
      },
      disabled: false,
      variant: 'primary' as const,
    };
  };

  // Handle "Add Event" button click
  const handleAddEventClick = () => {
    setIsEventCreateModalOpen(true);
  };

  // Handle successful event creation — TanStack Query invalidation refreshes UI without full reload
  const handleEventCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
    queryClient.invalidateQueries({ queryKey: ['tournamentEvents', tournamentId] });
    if (tournament?.bowling_center_id) {
      queryClient.invalidateQueries({ queryKey: ['bowlingCenter', tournament.bowling_center_id] });
    }
  };

  // Mutation for updating tournament data
  const updateTournamentMutation = useMutation({
    mutationFn: (data: any) => TournamentsAPI.updateTournament(tournamentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['userTournaments'] });
      queryClient.invalidateQueries({ queryKey: ['nearbyTournaments'] });
    },
    onError: (error: any) => {
      console.error('Error updating tournament:', error);
    },
  });

  const handleTournamentUpdate = async (data: any) => {
    return updateTournamentMutation.mutateAsync(data);
  };
  if (tournamentLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-surface-light">
        <Loading size="large" />
      </div>
    );
  }

  if (tournamentError || !tournament) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Alert 
          variant="error" 
          message="Error loading tournament details. Please try again." 
          className="mb-4"
        />
        <Button
          variant="lightbackground"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </div>
    );
  }

  // Get registration button configuration
  const eventSignUpCta = getEventSignUpCtaProps();

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb navigation */}
      <Breadcrumb 
        items={[
          { label: 'Home', path: '/' },
          { label: 'Tournaments', path: roleAwareNav.getTournamentsListPath() },
          { label: tournament.name }
        ]} 
      />

      {!isInBowlerView && isTournamentDirector && tournamentId > 0 && (
        <TournamentAccessBanner tournamentId={tournamentId} />
      )}
      {saOnly && tournamentId > 0 && (
        <SaOnlyModeBanner tournamentId={tournamentId} />
      )}

      {/* Tournament header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6">
          <div>
            <PageTitle size="responsive" className="mb-1">{tournament.name}</PageTitle>
            <p className="text-text-muted text-sm sm:text-base">
              {tournament.start_date && tournament.end_date
                ? `${formatDateTimeNaive(tournament.start_date)} - ${formatDateTimeNaive(tournament.end_date)}`
                : 'Add events to set the tournament schedule'}
            </p>
            <p className="text-sm text-text-muted mt-1">
              Organized by {organizerName || "Unknown"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Tournament sections">
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'info'}
                className={`min-h-11 px-4 py-2.5 text-sm rounded-md border ${
                  activeSection === 'info'
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-text hover:border-primary'
                }`}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('tab');
                  next.delete('eventId');
                  next.delete('scope');
                  next.delete('roundId');
                  setSearchParams(next, { replace: true });
                }}
              >
                {isInBowlerView ? 'Event Info' : 'Overview'}
              </button>
              {!saOnly && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'results'}
                className={`min-h-11 px-4 py-2.5 text-sm rounded-md border ${
                  activeSection === 'results'
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-text hover:border-primary'
                }`}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set('tab', isInBowlerView ? 'results' : 'live');
                  setSearchParams(next, { replace: true });
                }}
              >
                {isInBowlerView ? 'Results' : 'Live'}
              </button>
              )}
            </div>
          </div>
          
                     <div className="flex mt-4 sm:mt-0 flex-wrap gap-2 justify-end">
             {!isInBowlerView && isTournamentDirector && !saOnly && (
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => setSharingModalOpen(true)}
               >
                 Share
               </Button>
             )}
             {!isInBowlerView && isTournamentDirector && (
               <Button
                 type="button"
                 variant="lightbackground"
                 onClick={() => setTournamentReportsOpen(true)}
               >
                 Reports
               </Button>
             )}
             {isTournamentMaster && !saOnly && (
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => setDirectorPermissionsModalOpen(true)}
               >
                 Assistant permissions
               </Button>
             )}
             <Button
               variant={eventSignUpCta.variant}
               onClick={eventSignUpCta.onClick}
               disabled={eventSignUpCta.disabled}
             >
               {eventSignUpCta.label}
             </Button>
           </div>
        </div>

        {/* Quick Info Card — hide on Results/Live tab so phone viewports stay focused */}
        {activeSection !== 'results' && (
        <div className="bg-surface rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-sm font-medium text-text">Location</h3>
              </div>
              <p className="text-text-muted ml-7 text-sm">
                {bowlingCenter ? bowlingCenter.name : `Center #${tournament.bowling_center_id}`}
              </p>
            </div>
            
            
            

            
            {/* Tournament Director */}
            <div>
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-sm font-medium text-text">Director</h3>
              </div>
              <p className="text-text-muted ml-7 text-sm">
                {organizerName || 'No Director Assigned'}
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-sm font-medium text-text">Participants</h3>
              </div>
              <p className="text-text-muted ml-7 text-sm">
                {tournament.current_entries} registered
              </p>
            </div>
          </div>
        </div>
        )}
        
        {activeSection === 'results' && !saOnly ? (
          <div className="bg-surface rounded-lg shadow-sm p-3 sm:p-6 mb-6">
            {isInBowlerView ? (
              <TournamentResultsViewer
                tournamentId={tournamentId}
                tournamentName={tournament.name}
                centerName={bowlingCenter?.name ?? null}
              />
            ) : (
              <TournamentLiveViewer
                tournamentId={tournamentId}
                tournamentName={tournament.name}
                centerName={bowlingCenter?.name ?? null}
              />
            )}
          </div>
        ) : (
          <>
        {/* Main content area - responsive grid layout */}
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main tournament info - spans 2/3 on large screens */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {/* About Section - Collapsible on mobile, Card on larger screens */}
            <div className="block md:hidden">
              <div className="bg-surface rounded-lg shadow-sm">
                <CollapsibleSection title="About This Tournament" defaultOpen={true}>
                  <div className="p-4 pt-0 whitespace-pre-line text-text">
                    {tournament.description || 'No description available.'}
                  </div>
                </CollapsibleSection>
              </div>
            </div>
            
            <div className="hidden md:block">
              <TournamentDescriptionCard
                tournament={tournament}
                isAuthorizedToEdit={isAuthorizedToEdit || false}
                onSave={handleTournamentUpdate}
              />
            </div>

            {/* Tournament Rules & Details - Collapsible on mobile, Card on larger screens */}
            <div className="block md:hidden">
              <div className="bg-surface rounded-lg shadow-sm">
                <CollapsibleSection title="Details & Rules">
                  <div className="p-4 pt-0">
                    <h4 className="text-sm font-medium text-text mb-2">Schedule</h4>
                    <p className="text-text-muted mb-4">
                      {tournament.start_date && tournament.end_date
                        ? `${formatDateTimeNaive(tournament.start_date)} – ${formatDateTimeNaive(tournament.end_date)}`
                        : 'Add events to set start and end times.'}
                    </p>
                    
                    <h4 className="text-sm font-medium text-text mb-2">Tournament Rules</h4>
                    <div className="text-text-muted whitespace-pre-line bg-surface-light p-3 rounded-md text-sm">
                      {tournament.rules || 'No specific rules provided for this tournament.'}
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            </div>
            <div className="hidden md:block space-y-6">
              <TournamentDetailsCard
                tournament={tournament}
                isAuthorizedToEdit={isAuthorizedToEdit || false}
                onSave={handleTournamentUpdate}
              />
              <TournamentRulesCard
                tournament={tournament}
                isAuthorizedToEdit={isAuthorizedToEdit || false}
                onSave={handleTournamentUpdate}
              />
            </div>

            {/* Events Section — TD/overview only; bowler Event Info is desc/rules/location */}
            {!isInBowlerView && (
              <>
            <div className="block md:hidden">
              <div className="bg-surface rounded-lg shadow-sm">
                <CollapsibleSection title="Tournament Events">
                  <div className="p-4 pt-0">
                    <EventList
                      tournamentId={tournamentId}
                      tournamentName={tournament.name}
                      canAddEvent={canCreateEvents && !saOnly}
                      canCopyTournament={isTournamentMaster}
                      canDeleteEvents={isTournamentMaster}
                      onAddEventClick={handleAddEventClick}
                    />
                  </div>
                </CollapsibleSection>
              </div>
            </div>

            <div className="hidden md:block" id="tournament-events">
              <EventList
                tournamentId={tournamentId}
                tournamentName={tournament.name}
                canAddEvent={canCreateEvents && !saOnly}
                canCopyTournament={isTournamentMaster}
                canDeleteEvents={isTournamentMaster}
                onAddEventClick={handleAddEventClick}
              />
            </div>
              </>
            )}
          </div>
          
          {/* Sidebar - 1/3 on large screens, full width on smaller screens */}
          <div className="min-w-0 space-y-6">
            {/* Location Section */}
            <div className="block md:hidden">
              <div className="bg-surface rounded-lg shadow-sm">
                <CollapsibleSection title="Location">
                  <div className="p-4 pt-0">
                    {bowlingCenter ? (
                      <div className="text-text">
                        <p className="mb-1 font-medium text-primary">{bowlingCenter.name}</p>
                        <p className="mb-1 text-text-muted">{bowlingCenter.address1}</p>
                        {bowlingCenter.address2 && <p className="mb-1 text-text-muted">{bowlingCenter.address2}</p>}
                        <p className="mb-1 text-text-muted">{bowlingCenter.city}, {bowlingCenter.state} {bowlingCenter.postal_code}</p>
                        {bowlingCenter.phone && <p className="mb-1 text-text-muted">Phone: {bowlingCenter.phone}</p>}
                        
                        <div className="mt-4">
                          <a 
                            href={`https://maps.google.com/?q=${encodeURIComponent(
                              `${bowlingCenter.name}, ${bowlingCenter.address1}, ${bowlingCenter.city}, ${bowlingCenter.state} ${bowlingCenter.postal_code}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-primary text-text rounded-md text-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Open in Maps
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-text-muted">Location details not available.</p>
                    )}
                  </div>
                </CollapsibleSection>
              </div>
            </div>
            
            <div className="hidden md:block">
              <TournamentLocationCard
                tournament={tournament}
                isAuthorizedToEdit={isAuthorizedToEdit || false}
                onSave={handleTournamentUpdate}
              />
            </div>
          </div>
        </div>
        
        {/* Registration call-to-action — hide for bowler Event Info (no events list) and organizers */}
        {!isInBowlerView &&
          !(
          user?.id === tournament.organizer_id || myTournamentAccess?.is_tournament_master
        ) && (
          <div className="mt-6 bg-surface-light rounded-lg p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="flex-1 mb-4 sm:mb-0">
                <h3 className="text-xl font-bold text-primary mb-1">Ready to bowl?</h3>
                <p className="text-text-muted">Secure your spot in this tournament today!</p>
              </div>
              <div>
                <Button
                  variant={eventSignUpCta.variant}
                  size="large"
                  disabled={eventSignUpCta.disabled}
                  onClick={eventSignUpCta.onClick}
                  className="w-full sm:w-auto"
                >
                  {eventSignUpCta.label}
                </Button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
        
        
        
        {/* Event Create Modal */}
        <EventCreateModal
          isOpen={isEventCreateModalOpen}
          onClose={() => setIsEventCreateModalOpen(false)}
          tournamentId={tournamentId}
          onSuccess={handleEventCreated}
          layoutPrefix={
            location.pathname.startsWith('/admin') ? '/admin' : '/director'
          }
        />

        <DirectorPermissionsModal
          isOpen={directorPermissionsModalOpen}
          onClose={() => setDirectorPermissionsModalOpen(false)}
          scope="tournament"
          tournamentId={tournamentId}
        />

        <EventReportsMenuModal
          isOpen={tournamentReportsOpen}
          onClose={() => setTournamentReportsOpen(false)}
          tournamentId={tournamentId}
          tournamentName={tournament.name}
          defaultScope="tournament"
          isSaOnly={saOnly}
        />

        <TournamentSharingModal
          isOpen={sharingModalOpen}
          onClose={() => setSharingModalOpen(false)}
          tournamentId={tournamentId}
          tournamentName={tournament.name}
          centerName={tournament.bowling_center_name || tournament.location}
          dateLabel={
            tournament.start_date && tournament.end_date
              ? `${formatDateNaive(tournament.start_date)} – ${formatDateNaive(tournament.end_date)}`
              : null
          }
        />



      </div>
    </div>
  );
};

export default TournamentDetails;
