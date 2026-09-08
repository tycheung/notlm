import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BowlingCentersAPI } from '../../api/bowling-centers';
import { EventsAPI } from '../../api/events';
import { DirectorsAPI } from '../../api/directors';
import { TournamentRead } from '../../types/tournament';
import { BowlingCenterRead } from '../../types/bowling_center';
import { EventRead, type PendingSignupEventRead } from '../../types/event';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import TournamentCreate from '../tournaments/TournamentCreate';
import SideActionEventCreate from '../sideActions/SideActionEventCreate';
import { getTournamentStatusInfoDark } from '../../utils/tournamentStatus';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { partitionSaOnlyTournaments, saOnlyTournamentIdSet } from '../../utils/saOnly';
import { isSaOnlyRole } from '../../utils/roles';
import { formatDateRangeNaive } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { bucketTdHomeEvents } from './tdHomeEventWindows';
import { resolveTdHomeLiveStage, type TdHomeLiveStage } from './tdHomeEventStage';
import {
  eventParticipantsHref,
  pendingHrefForTournament,
  pendingTotalsForHome,
} from './tdHomePendingLinks';
import { splitOwnedTournamentsForHome } from './tdHomeOwnedSplit';
import TdHomeScheduleStrips from './TdHomeScheduleStrips';
import {
  canCreateFullTournament,
  canCreateSaEvent,
  canWriteDirectorOps,
  hasEverHadSa,
  hasEverHadStandard,
  isDirectorReadOnly,
} from '../../api/tdAccess';
import DirectorReadOnlyBanner from '../../components/billing/DirectorReadOnlyBanner';
import GatedActionButton from '../../components/billing/GatedActionButton';
import { GUIDE_IDS, useGuideModal } from '../../features/director-guide';

const ACTIONS_NEEDED_PATH = '/director/actions-needed';

function TournamentPendingLink({
  count,
  href,
}: {
  count: number;
  href: string | null;
}) {
  const label = `${count} pending`;
  if (count > 0 && href) {
    return (
      <Link to={href} className="text-xs text-primary hover:underline">
        {label}
      </Link>
    );
  }
  return <div className="text-xs text-text-dim">{label}</div>;
}

const TournamentDirectorDashboard: React.FC = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const roleAwareNav = useRoleAwareNavigation(user);
  
  // State for tournament data
  const [managedTournaments, setManagedTournaments] = useState<TournamentRead[]>([]);
  const [activeTournamentCount, setActiveTournamentCount] = useState(0);
  const [activeSaEventCount, setActiveSaEventCount] = useState(0);
  const [registrationStats, setRegistrationStats] = useState<{[key: number]: number}>({});
  const [totalPendingRegistrations, setTotalPendingRegistrations] = useState(0);
  const [bowlingCenters, setBowlingCenters] = useState<BowlingCenterRead[]>([]);
  const [bowlingCenterMap, setBowlingCenterMap] = useState<{[key: number]: BowlingCenterRead}>({});
  const [homeEvents, setHomeEvents] = useState<EventRead[]>([]);
  const [delegatedTournaments, setDelegatedTournaments] = useState<TournamentRead[]>([]);
  const [pendingSignupEvents, setPendingSignupEvents] = useState<PendingSignupEventRead[]>([]);
  const [pendingSignupsLoaded, setPendingSignupsLoaded] = useState(false);
  const [liveStageByEventId, setLiveStageByEventId] = useState<Map<number, TdHomeLiveStage>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaCreateModalOpen, setIsSaCreateModalOpen] = useState(false);
  const [modalJustClosed, setModalJustClosed] = useState<boolean>(false);
  const isMounted = useRef(false);
  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const openSaCreateModal = useCallback(() => setIsSaCreateModalOpen(true), []);
  useGuideModal('tournamentCreate', () => {
    if (isSaOnlyRole(user?.role)) openSaCreateModal();
    else openCreateModal();
  });
  
  // Load tournament data
  useEffect(() => {
    if (authLoading) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!user?.id) {
          setError('Please log in to view your dashboard.');
          return;
        }
        
        const summary = await DirectorsAPI.getHomeSummary();
        const owned = summary.owned_tournaments;
        const delegated = summary.delegated_tournaments;
        const pendingEvents = summary.pending_signups;
        const { full, saOnly } = partitionSaOnlyTournaments(owned);
        setManagedTournaments(owned);
        setActiveTournamentCount(full.filter((tournament) => tournament.is_active).length);
        setActiveSaEventCount(saOnly.filter((tournament) => tournament.is_active).length);
        setDelegatedTournaments(delegated);
        setHomeEvents(summary.events);
        setPendingSignupEvents(pendingEvents);
        setPendingSignupsLoaded(true);
        
        // Fetch bowling centers
        const centers = await BowlingCentersAPI.getBowlingCenters();
        setBowlingCenters(centers);
        
        // Create a map of bowling center IDs to objects
        const centerMap: {[key: number]: BowlingCenterRead} = {};
        centers.forEach(center => {
          centerMap[center.id] = center;
        });
        setBowlingCenterMap(centerMap);
        
        const pendingStats = pendingTotalsForHome(
          pendingEvents,
          true,
          [...owned, ...delegated]
        );
        setRegistrationStats(pendingStats.byTournamentId);
        setTotalPendingRegistrations(pendingStats.total);
      } catch (err: any) {
        console.error('Error fetching tournament data:', err);
        setError('Failed to load tournament data. Please log out and back in again.');
      } finally {
        setLoading(false);
      }
    };
    
    isMounted.current = true;
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
  }, [user?.id, authLoading]);
  
  // Refresh data when a modal is closed
  useEffect(() => {
    if (modalJustClosed && isMounted.current) {
      const refreshTournaments = async () => {
        try {
          setLoading(true);
          const summary = await DirectorsAPI.getHomeSummary();
          const owned = summary.owned_tournaments;
          const delegated = summary.delegated_tournaments;
          const pendingEvents = summary.pending_signups;
          const { full, saOnly } = partitionSaOnlyTournaments(owned);
          setManagedTournaments(owned);
          setActiveTournamentCount(full.filter((tournament) => tournament.is_active).length);
          setActiveSaEventCount(saOnly.filter((tournament) => tournament.is_active).length);
          setDelegatedTournaments(delegated);
          setHomeEvents(summary.events);
          setPendingSignupEvents(pendingEvents);
          setPendingSignupsLoaded(true);
          const pendingStats = pendingTotalsForHome(
            pendingEvents,
            true,
            [...owned, ...delegated]
          );
          setRegistrationStats(pendingStats.byTournamentId);
          setTotalPendingRegistrations(pendingStats.total);
        } catch (err) {
          console.error('Error refreshing tournaments:', err);
        } finally {
          setLoading(false);
          setModalJustClosed(false);
        }
      };
      
      refreshTournaments();
    }
  }, [modalJustClosed, user?.id]);
  
  // Custom close handler that sets the modalJustClosed flag
  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
    setModalJustClosed(true);
  };

  const handleSaCreateModalClose = () => {
    setIsSaCreateModalOpen(false);
    setModalJustClosed(true);
  };

  const saAccount = isSaOnlyRole(user?.role);
  const billing = user?.billing;
  const canWrite = canWriteDirectorOps(billing);
  const canCreateFull = canCreateFullTournament(billing);
  const canCreateSa = canCreateSaEvent(billing);
  const showCreateFull =
    !saAccount && (canCreateFull || hasEverHadStandard(billing));
  const showCreateSa = canCreateSa || hasEverHadSa(billing) || saAccount;
  const readOnlyDirector = isDirectorReadOnly(billing);
  const passBlockReason =
    'An active subscription or unused pass is required. Manage Subscription to continue.';


  const { full: fullOwnedTournaments, saOnly: saOwnedTournaments } = useMemo(
    () => partitionSaOnlyTournaments(managedTournaments),
    [managedTournaments]
  );

  const homeOwnedTournaments = saAccount ? saOwnedTournaments : fullOwnedTournaments;

  const saOnlyTournamentIds = useMemo(
    () => saOnlyTournamentIdSet(managedTournaments),
    [managedTournaments]
  );

  const fullHomeEvents = useMemo(
    () => homeEvents.filter((event) => !saOnlyTournamentIds.has(event.tournament_id)),
    [homeEvents, saOnlyTournamentIds]
  );

  const tournamentNameById = useMemo(() => {
    const map = new Map<number, string>();
    managedTournaments.forEach((tournament) => {
      map.set(tournament.id, tournament.name);
    });
    delegatedTournaments.forEach((tournament) => {
      map.set(tournament.id, tournament.name);
    });
    return map;
  }, [managedTournaments, delegatedTournaments]);

  const homeEventsForSchedule = saAccount
    ? homeEvents.filter((event) => saOnlyTournamentIds.has(event.tournament_id))
    : fullHomeEvents;

  const { happeningToday, comingUp } = useMemo(
    () =>
      bucketTdHomeEvents(homeEventsForSchedule, [
        ...homeOwnedTournaments.map((tournament) => tournament.id),
        ...(saAccount
          ? []
          : delegatedTournaments
              .filter((tournament) => !tournament.is_sa_only)
              .map((tournament) => tournament.id)),
      ]),
    [homeEventsForSchedule, homeOwnedTournaments, delegatedTournaments, saAccount]
  );

  const pendingCountByEventId = useMemo(() => {
    const map = new Map<number, number>();
    pendingSignupEvents.forEach((row) => {
      if (row.pending_count > 0) {
        map.set(row.event_id, row.pending_count);
      }
    });
    return map;
  }, [pendingSignupEvents]);

  const participantsHref = (eventId: number) =>
    eventParticipantsHref(roleAwareNav.getEventPath(eventId));

  const pendingHrefForHomeTournament = (tournament: TournamentRead) => {
    if (pendingSignupsLoaded) {
      return pendingHrefForTournament(
        pendingSignupEvents,
        tournament.id,
        (eventId) => roleAwareNav.getEventPath(eventId),
        ACTIONS_NEEDED_PATH
      );
    }
    return (tournament.pending_registrations ?? 0) > 0 ? ACTIONS_NEEDED_PATH : null;
  };

  const { liveOrUpcoming, recentFinished } = useMemo(
    () => splitOwnedTournamentsForHome(homeOwnedTournaments),
    [homeOwnedTournaments]
  );

  const quickActions = [
    ...(showCreateFull
      ? [
          {
            onClick: () => {
              if (!canCreateFull) return;
              setIsCreateModalOpen(true);
            },
            label: 'Create New Tournament',
            description: 'Create and publish a new bowling tournament',
            icon: 'plus',
            disabled: !canCreateFull,
          },
        ]
      : []),
    ...(showCreateSa
      ? [
          {
            onClick: () => {
              if (!canCreateSa) return;
              setIsSaCreateModalOpen(true);
            },
            label: 'Create SA Event',
            description: 'Start a side action only session',
            icon: 'plus',
            disabled: !canCreateSa,
          },
        ]
      : []),
    {
      to: '/director/side-actions',
      label: 'Manage SA Events',
      description: 'View and run your side action only events',
      icon: 'clipboard',
    },
    {
      to: ACTIONS_NEEDED_PATH,
      label: 'Actions Needed',
      description: 'Pending sign-ups and other items that need a decision',
      icon: 'clipboard',
    },
    {
      to: '/director/tournaments',
      label: 'Manage Tournaments',
      description: 'View and edit your existing tournaments',
      icon: 'clipboard',
    },
    {
      to: '/director/averages',
      label: 'House averages',
      description: 'Last entering, highest used, TD avg, and lifetime for your bowlers',
      icon: 'clipboard',
    },
    {
      to: '/director/bowlers',
      label: 'Bowler lookup',
      description: 'Find a bowler by name or USBC and see their history',
      icon: 'clipboard',
    },
  ];

  const visibleQuickActions = quickActions.filter((action) => {
    if (!saAccount) return true;
    return (
      action.label !== 'Create New Tournament' && action.label !== 'Manage Tournaments'
    );
  });

  useEffect(() => {
    const events = happeningToday;
    if (events.length === 0) {
      setLiveStageByEventId(new Map());
      return;
    }
    let cancelled = false;
    Promise.all(
      events.map(async (event) => {
        try {
          const withRounds = await EventsAPI.getEventWithRounds(event.id);
          return [event.id, resolveTdHomeLiveStage(event, withRounds.rounds || [])] as const;
        } catch {
          return [event.id, resolveTdHomeLiveStage(event)] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) {
        setLiveStageByEventId(new Map(entries));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [happeningToday]);

  // Helper function to get bowling center name by ID
  const getBowlingCenterName = (centerId: number) => {
    if (bowlingCenterMap[centerId]) {
      return bowlingCenterMap[centerId].name;
    }
    return 'Unknown Center';
  };

  // Render appropriate icon based on icon name
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'plus':
        return (
          <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'clipboard':
        return (
          <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <Breadcrumb
          items={[homeCrumb(), layoutDashboardCrumb(location.pathname), { label: 'Overview' }]}
          className="mb-4"
        />
        <PageTitle className="mb-6">Tournament Director Dashboard</PageTitle>

        {readOnlyDirector && <DirectorReadOnlyBanner />}
        
        {error && (
          <Alert 
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-6"
          />
        )}
        
        {/* Stats Overview — equal-width columns */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${saAccount ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-6 mb-8 items-stretch`}>
          {!saAccount && (
          <Card className="shadow-sm w-full min-w-0 h-full">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                  <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Active Tournaments
                    </dt>
                    <dd className="text-xl font-bold text-primary">
                      {loading ? <Loading size="small" /> : activeTournamentCount}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
          )}

          <Link
            to="/director/side-actions"
            className="block w-full min-w-0 h-full"
            aria-label="View side action events"
          >
            <Card hoverable className="shadow-sm w-full min-w-0 h-full">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                    <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-muted truncate">
                        Active SA Events
                      </dt>
                      <dd className="text-xl font-bold text-primary">
                        {loading ? <Loading size="small" /> : activeSaEventCount}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
          
          <Link
            to={ACTIONS_NEEDED_PATH}
            className="block w-full min-w-0 h-full"
            aria-label="View pending registrations"
          >
            <Card hoverable className="shadow-sm w-full min-w-0 h-full">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                    <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-muted truncate">
                        Pending Registrations
                      </dt>
                      <dd className="text-xl font-bold text-primary">
                        {loading ? (
                          <Loading size="small" />
                        ) : (
                          totalPendingRegistrations
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
          
          {!saAccount && (
          <Link
            to="/director/bowling-centers"
            className="block w-full min-w-0 h-full"
            aria-label="Manage bowling centers"
          >
            <Card hoverable className="shadow-sm w-full min-w-0 h-full">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                    <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-muted truncate">
                        Active Bowling Centers
                      </dt>
                      <dd className="text-xl font-bold text-primary">
                        {loading ? <Loading size="small" /> : bowlingCenters.filter(c => c.is_active).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
          )}
        </div>
        
        {/* Quick Actions — equal-width columns */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8 items-stretch">
          {visibleQuickActions.map((action, index) => (
            action.to ? (
              <Link
                key={index}
                to={action.to}
                className="block w-full min-w-0 h-full bg-surface border border-border overflow-hidden shadow rounded-lg transition-all hover:shadow-md hover:bg-surface-light"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                      {renderIcon(action.icon)}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-lg font-medium text-text truncate">
                          {action.label}
                        </dt>
                        <dd className="text-sm text-text-muted">
                          {action.description}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div
                key={index}
                title={
                  'disabled' in action && action.disabled
                    ? passBlockReason
                    : undefined
                }
                onClick={
                  'disabled' in action && action.disabled
                    ? undefined
                    : action.onClick
                }
                className={`w-full min-w-0 h-full bg-surface border border-border overflow-hidden shadow rounded-lg transition-all ${
                  'disabled' in action && action.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-md hover:bg-surface-light cursor-pointer'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                      {renderIcon(action.icon)}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-lg font-medium text-text truncate">
                          {action.label}
                        </dt>
                        <dd className="text-sm text-text-muted">
                          {action.description}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>

        {!loading && (
          <TdHomeScheduleStrips
            happeningToday={happeningToday}
            comingUp={comingUp}
            tournamentNameById={tournamentNameById}
            liveStageByEventId={liveStageByEventId}
            pendingCountByEventId={pendingCountByEventId}
            participantsHref={participantsHref}
            onOpenEvent={(eventId) => navigate(roleAwareNav.getEventPath(eventId))}
            onOpenLiveStage={(eventId, stage) => {
              const path = roleAwareNav.getEventPath(eventId);
              navigate(stage.tab ? `${path}?tab=${stage.tab}` : path);
            }}
          />
        )}
        
        {/* My Tournaments */}
        <div id="td-home-my-tournaments">
        <Card 
          title={saAccount ? 'My Active SA Events' : 'My Active Tournaments'} 
          className="mb-8 shadow-sm"
          footer={
            <Link
              to={saAccount ? '/director/side-actions' : '/director/tournaments'}
              className="text-primary text-sm font-medium"
            >
              {saAccount ? 'View All SA Events' : 'View All Tournaments'}
            </Link>
          }
        >
          {loading ? (
            <Loading />
          ) : homeOwnedTournaments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted mb-4">
                {saAccount
                  ? "You haven't created any side action events yet."
                  : "You haven't created any tournaments yet."}
              </p>
              {showCreateFull || showCreateSa ? (
                <GatedActionButton
                  allowed={saAccount ? canCreateSa : canCreateFull}
                  blockedReason={passBlockReason}
                  data-guide-id={GUIDE_IDS.CREATE_TOURNAMENT}
                  onClick={() =>
                    saAccount
                      ? setIsSaCreateModalOpen(true)
                      : setIsCreateModalOpen(true)
                  }
                >
                  {saAccount ? 'Create SA Event' : 'Create Tournament'}
                </GatedActionButton>
              ) : null}
            </div>
          ) : liveOrUpcoming.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted">No live or upcoming tournaments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-primary">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Tournament
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Registrations
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {liveOrUpcoming.map((tournament, rowIdx) => (
                    <tr
                      key={tournament.id}
                      className={rowIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-light'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text">{tournament.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-muted">
                          {tournament.bowling_center_id 
                            ? getBowlingCenterName(tournament.bowling_center_id)
                            : 'No location specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-muted">
                          {formatDateRangeNaive(tournament.start_date, tournament.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-muted">
                          {tournament.current_entries} registered
                        </div>
                        <TournamentPendingLink
                          count={registrationStats[tournament.id] ?? 0}
                          href={pendingHrefForHomeTournament(tournament)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const statusInfo = getTournamentStatusInfoDark(tournament);
                          return (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.colorClasses}`}>
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => navigate(roleAwareNav.getTournamentPath(tournament.id))}
                        >
                          Details/Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        </div>

        {!loading && recentFinished.length > 0 && (
          <details className="mb-8 group">
            <summary className="cursor-pointer text-sm font-semibold text-text bg-surface border border-border rounded-lg px-4 py-3 hover:bg-surface-light">
              Completed Tournaments
            </summary>
            <Card className="mt-2 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-primary">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        Tournament
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentFinished.map((tournament, rowIdx) => (
                      <tr
                        key={tournament.id}
                        className={rowIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-light'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-text">{tournament.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text-muted">
                            {formatDateRangeNaive(tournament.start_date, tournament.end_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="lightbackground"
                            size="small"
                            onClick={() => navigate(roleAwareNav.getTournamentPath(tournament.id))}
                          >
                            Details/Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3">
                <Link to="/director/tournaments" className="text-primary text-sm font-medium">
                  View all tournaments
                </Link>
              </div>
            </Card>
          </details>
        )}

        {!loading && delegatedTournaments.length > 0 && (
          <Card title="Delegated Tournaments" className="mb-8 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-primary">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Tournament
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Registrations
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {delegatedTournaments.map((tournament, rowIdx) => (
                    <tr
                      key={tournament.id}
                      className={rowIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-light'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text">{tournament.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-muted">
                          {tournament.bowling_center_id
                            ? getBowlingCenterName(tournament.bowling_center_id)
                            : 'No location specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-muted">
                          {formatDateRangeNaive(tournament.start_date, tournament.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-muted">
                          {tournament.current_entries} registered
                        </div>
                        <TournamentPendingLink
                          count={registrationStats[tournament.id] ?? tournament.pending_registrations ?? 0}
                          href={pendingHrefForHomeTournament(tournament)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const statusInfo = getTournamentStatusInfoDark(tournament);
                          return (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.colorClasses}`}>
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => navigate(roleAwareNav.getTournamentPath(tournament.id))}
                        >
                          Details/Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Tournament Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        title="Create New Tournament"
        size="large"
        closeOnOutsideClick={false}
      >
        <TournamentCreate onClose={handleCreateModalClose} />
      </Modal>

      <Modal
        isOpen={isSaCreateModalOpen}
        onClose={handleSaCreateModalClose}
        title="Create SA Event"
        size="large"
        closeOnOutsideClick={false}
      >
        <SideActionEventCreate onClose={handleSaCreateModalClose} />
      </Modal>
    </div>
  );
};

export default TournamentDirectorDashboard;
