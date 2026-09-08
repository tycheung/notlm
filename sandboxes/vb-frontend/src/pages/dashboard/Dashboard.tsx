import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UsersAPI } from '../../api/users';
import { UserRead } from '../../types/user';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import {
  formatDateNaive,
  formatDateRangeNaive,
  formatDateTimeNaive,
  getCurrentTimezoneNaiveISO,
} from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import PageSectionHeading from '../../components/common/PageSectionHeading';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb } from '../../utils/breadcrumbBuilders';
import {
  isAcceptedRegistration,
  uniqueTournamentCount,
  type BowlerHomeEvent,
} from './bowlerHomeEvents';
import {
  formatStatDate,
  formatStatNumber,
} from './bowlerStatDisplay';

const HOME_LIST_LIMIT = 3;
const NOT_ASSIGNED = 'not assigned';

function publicTournamentPath(event: BowlerHomeEvent, tab?: 'live'): string {
  const query = tab === 'live' ? `?tab=live&eventId=${event.id}` : '';
  return `/tournaments/${event.tournament_id}${query}`;
}

function AssignmentFields({ event }: { event: BowlerHomeEvent }) {
  const squad =
    event.squad_label && event.squad_label !== NOT_ASSIGNED && event.squad_start
      ? `${event.squad_label} · ${formatDateTimeNaive(event.squad_start)}`
      : event.squad_label || NOT_ASSIGNED;
  return (
    <div
      className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs text-text-muted"
      data-testid="assignment-row"
    >
      <span>Squad: {squad}</span>
      <span>Lane: {event.lane_label || NOT_ASSIGNED}</span>
      <span>Pair: {event.pair_label || NOT_ASSIGNED}</span>
    </div>
  );
}

function RegistrationBadge({ event }: { event: BowlerHomeEvent }) {
  const pending = !isAcceptedRegistration(event.registration_status);
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        pending ? 'bg-surface-light text-text-muted' : 'bg-primary/15 text-primary'
      }`}
    >
      {pending ? 'Pending' : 'Accepted'}
    </span>
  );
}

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const roleAwareNav = useRoleAwareNavigation(user);

  const [inProgressEvents, setInProgressEvents] = useState<BowlerHomeEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<BowlerHomeEvent[]>([]);
  const [completedEvents, setCompletedEvents] = useState<BowlerHomeEvent[]>([]);
  const [userProfile, setUserProfile] = useState<UserRead | null>(null);

  const [loadingStates, setLoadingStates] = useState({
    homeEvents: false,
    userProfile: false,
  });
  const [errorStates, setErrorStates] = useState({
    homeEvents: null as string | null,
    userProfile: null as string | null,
  });

  const upcomingPreview = upcomingEvents.slice(0, HOME_LIST_LIMIT);
  const completedPreview = completedEvents.slice(0, HOME_LIST_LIMIT);
  const hasNoHomeEvents =
    !loadingStates.homeEvents &&
    !errorStates.homeEvents &&
    inProgressEvents.length === 0 &&
    upcomingEvents.length === 0 &&
    completedEvents.length === 0;

  const tournamentCount = useMemo(
    () => uniqueTournamentCount([...inProgressEvents, ...upcomingEvents, ...completedEvents]),
    [inProgressEvents, upcomingEvents, completedEvents]
  );

  const fetchHomeEvents = async () => {
    if (!isAuthenticated || !user?.id) return;

    setLoadingStates((prev) => ({ ...prev, homeEvents: true }));
    setErrorStates((prev) => ({ ...prev, homeEvents: null }));

    try {
      const response = await UsersAPI.getUserHomeEvents(user.id);
      setInProgressEvents(response.in_progress);
      setUpcomingEvents(response.upcoming);
      setCompletedEvents(response.completed);
    } catch (err: unknown) {
      console.error('Error fetching home events:', err);
      setInProgressEvents([]);
      setUpcomingEvents([]);
      setCompletedEvents([]);
      const message = err instanceof Error ? err.message : '';
      const errorMessage =
        message === 'Network Error'
          ? 'Unable to connect to the tournament server. Please check your connection.'
          : 'Failed to load your events. Please log out and back in again.';
      setErrorStates((prev) => ({ ...prev, homeEvents: errorMessage }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, homeEvents: false }));
    }
  };

  const fetchUserProfile = async () => {
    if (!isAuthenticated || !user?.id) return;

    setLoadingStates((prev) => ({ ...prev, userProfile: true }));
    setErrorStates((prev) => ({ ...prev, userProfile: null }));

    try {
      const profileData = await UsersAPI.getUser(user.id);
      setUserProfile(profileData);
    } catch (err: unknown) {
      console.error('Error fetching user profile:', err);
      const message = err instanceof Error ? err.message : '';
      const errorMessage =
        message === 'Network Error'
          ? 'Unable to connect to the server. Please check your connection.'
          : 'Failed to load your profile data. Please log out and back in again.';
      setErrorStates((prev) => ({ ...prev, userProfile: errorMessage }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, userProfile: false }));
    }
  };

  const retryFailedFetches = () => {
    if (errorStates.homeEvents) fetchHomeEvents();
    if (errorStates.userProfile) fetchUserProfile();
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchHomeEvents();
      fetchUserProfile();
    }
  }, [isAuthenticated, user?.id]);

  const hasErrors = Object.values(errorStates).some((error) => error !== null);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    return formatDateNaive(dateString);
  };

  const formatTodayDate = () => {
    const todayString = getCurrentTimezoneNaiveISO();
    return formatDateNaive(todayString);
  };

  const openEventAsBowler = (event: BowlerHomeEvent) => {
    if (!isAcceptedRegistration(event.registration_status)) {
      navigate(publicTournamentPath(event));
      return;
    }
    navigate(roleAwareNav.getEventPath(event.id));
  };

  const renderEventRow = (
    event: BowlerHomeEvent,
    options: { showRegistration: boolean; showAssignments: boolean }
  ) => (
    <button
      key={event.id}
      onClick={() => openEventAsBowler(event)}
      className="block w-full text-left p-4 hover:bg-surface-light transition-colors"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-primary mb-1">{event.name}</h3>
          <p className="text-sm text-text-muted mb-1">{event.tournament_name}</p>
          <div className="flex items-center text-sm text-text-muted mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(event.start_date)}
          </div>
          {options.showAssignments ? <AssignmentFields event={event} /> : null}
          {options.showRegistration ? (
            <div className="flex items-center mt-2">
              <RegistrationBadge event={event} />
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-end rounded-md px-3 py-1 bg-surface-light ml-auto">
          <span className="text-primary text-sm">Details</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Breadcrumb items={[homeCrumb(), { label: 'Dashboard' }]} className="mb-4" />
      <div className="mb-6">
        <PageTitle size="responsive" className="mb-2">
          Welcome, {userProfile?.first_name || user?.first_name || 'Bowler'}!
        </PageTitle>
        <p className="text-text-muted text-sm">{formatTodayDate()}</p>
        <Link
          to="/director"
          className="inline-flex items-center mt-3 text-sm font-medium text-primary hover:text-text-muted"
        >
          Director dashboard
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {hasErrors && (
        <Alert
          variant="error"
          message="Some dashboard components failed to load. This may be due to connection issues."
          onDismiss={() => {}}
          className="mb-4"
          action={
            <button
              className="whitespace-nowrap px-4 py-2 rounded-md text-sm bg-surface-light text-primary border border-border hover:bg-surface transition-colors"
              onClick={retryFailedFetches}
            >
              Retry
            </button>
          }
        />
      )}

      {isAuthenticated && (
        <div className="mb-6">
          <div className="bg-surface rounded-lg overflow-hidden shadow p-4">
            <div className="flex flex-wrap justify-between">
              <div className="p-3 text-center w-1/2 sm:w-auto">
                <p className="text-sm text-text-muted">Lifetime Average</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {formatStatNumber(userProfile?.average_lifetime_score)}
                </p>
              </div>
              <div className="p-3 text-center w-1/2 sm:w-auto">
                <p className="text-sm text-text-muted">1-Year Average</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {formatStatNumber(userProfile?.average_365day_score)}
                </p>
              </div>
              <div className="p-3 text-center w-1/2 sm:w-auto">
                <p className="text-sm text-text-muted">90-Day Average</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {formatStatNumber(userProfile?.average_90day_score)}
                </p>
              </div>
              <div className="p-3 text-center w-1/2 sm:w-auto">
                <p className="text-sm text-text-muted">Tournaments</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">{tournamentCount}</p>
              </div>
              <div className="p-3 text-center w-1/2 sm:w-auto">
                <p className="text-sm text-text-muted">Next Event</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {formatStatDate(
                    upcomingEvents[0]?.start_date || inProgressEvents[0]?.start_date,
                    formatDate
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && hasNoHomeEvents && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(roleAwareNav.getTournamentsListPath())}
            className="w-full min-h-[8rem] rounded-lg bg-primary text-white shadow hover:bg-primary-light transition-colors px-6 py-8 text-center"
          >
            <span className="block text-xl sm:text-2xl font-semibold">Browse events</span>
            <span className="block mt-2 text-sm sm:text-base text-white/80">
              Find a published tournament and sign up.
            </span>
          </button>
        </div>
      )}

      {isAuthenticated && inProgressEvents.length > 0 && (
        <div id="bowler-home-in-progress" className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <PageSectionHeading>In Progress</PageSectionHeading>
          </div>
          <div className="bg-surface rounded-lg overflow-hidden shadow">
            <div className="divide-y divide-border">
              {inProgressEvents.map((event) => {
                const accepted = isAcceptedRegistration(event.registration_status);
                return (
                  <div key={event.id} className="p-4 flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-medium text-primary mb-1">{event.name}</h3>
                      <p className="text-sm text-text-muted mb-1">{event.tournament_name}</p>
                      <p className="text-xs text-text-dim">
                        {formatDateRangeNaive(event.start_date, event.end_date)}
                      </p>
                      <AssignmentFields event={event} />
                      <div className="flex items-center mt-2">
                        <RegistrationBadge event={event} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {accepted ? (
                        <>
                          <Button
                            variant="darkbackground"
                            size="small"
                            onClick={() =>
                              navigate(
                                `${roleAwareNav.getTournamentPath(event.tournament_id)}?tab=live&eventId=${event.id}`
                              )
                            }
                          >
                            Live scores
                          </Button>
                          <Button
                            variant="lightbackground"
                            size="small"
                            onClick={() => navigate(roleAwareNav.getEventPath(event.id))}
                          >
                            Open Event
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => navigate(publicTournamentPath(event, 'live'))}
                        >
                          Open Event
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && !hasNoHomeEvents && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <PageSectionHeading>My Upcoming Tournaments</PageSectionHeading>
            <Link to="/my-tournaments" className="text-primary hover:text-text-muted text-sm font-medium">
              View All
            </Link>
          </div>

          <div className="bg-surface rounded-lg overflow-hidden shadow">
            {loadingStates.homeEvents ? (
              <div className="p-4 flex justify-center">
                <Loading size="small" />
              </div>
            ) : errorStates.homeEvents ? (
              <div className="text-center py-4">
                <p className="text-text-muted mb-2">{errorStates.homeEvents}</p>
                <button
                  className="whitespace-nowrap px-4 py-2 rounded-md text-sm bg-surface-light text-primary border border-border hover:bg-surface transition-colors"
                  onClick={fetchHomeEvents}
                >
                  Retry
                </button>
              </div>
            ) : upcomingPreview.length ? (
              <div className="divide-y divide-border">
                {upcomingPreview.map((event) =>
                  renderEventRow(event, { showRegistration: true, showAssignments: true })
                )}
              </div>
            ) : (
              <p className="text-text-muted p-4 text-center">
                You are not registered for any upcoming events.
              </p>
            )}
          </div>
        </div>
      )}

      {isAuthenticated && !hasNoHomeEvents && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <PageSectionHeading>My Completed Tournaments</PageSectionHeading>
            <Link to="/my-tournaments" className="text-primary hover:text-text-muted text-sm font-medium">
              View All
            </Link>
          </div>

          <div className="bg-surface rounded-lg overflow-hidden shadow">
            {loadingStates.homeEvents ? (
              <div className="p-4 flex justify-center">
                <Loading size="small" />
              </div>
            ) : errorStates.homeEvents ? (
              <div className="text-center py-4">
                <p className="text-text-muted mb-2">{errorStates.homeEvents}</p>
                <button
                  className="whitespace-nowrap px-4 py-2 rounded-md text-sm bg-surface-light text-primary border border-border hover:bg-surface transition-colors"
                  onClick={fetchHomeEvents}
                >
                  Retry
                </button>
              </div>
            ) : completedPreview.length ? (
              <div className="divide-y divide-border">
                {completedPreview.map((event) =>
                  renderEventRow(event, { showRegistration: false, showAssignments: false })
                )}
              </div>
            ) : (
              <p className="text-text-muted p-4 text-center">No completed events yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
