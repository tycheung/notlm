import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import { UsersAPI } from '../../api/users';
import { UserRead } from '../../types/user';
import { SystemAPI } from '../../api/system';
import { ActivityAPI, ActivityLogEntry } from '../../api/activity';
import { formatDateTimeNaive } from '../../utils/dateUtils';
import { parseNaiveDateTimeToTimestamp } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import { roleBadgeClass, roleDisplayLabel } from '../../utils/roles';

interface RecentUserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  registered: string;
}

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State variables with proper typing
  const [systemStats, setSystemStats] = useState({
    users: {
      total: 0,
      active: 0,
      newThisMonth: 0
    },
    tournaments: {
      total: 0,
      active: 0,
      completed: 0
    },
    bowlingCenters: {
      total: 0,
      active: 0
    },
    events: {
      total: 0,
      active: 0
    },
    games: {
      total: 0,
      active: 0
    },
    uniqueBowlers: 0,
    abuseReports: {
      open: 0,
      in_review: 0,
      total: 0
    },
    billing: {
      available: false,
      message: 'Billing metrics unavailable until Stripe is connected',
      activeAnnualSubscriptions: 0,
      activeMonthlySubscriptions: 0,
      activeSideActionAnnualSubscriptions: 0,
      activeSideActionMonthlySubscriptions: 0,
      unusedTournamentCredits: 0,
      unusedSideActionPasses: 0,
      unusedLargeCapLiftPasses: 0,
    },
    subscriptionTds: 0,
    happeningToday: 0,
    comingUp: 0,
    systemHealth: {
      status: 'healthy' as 'healthy' | 'warning' | 'error',
      uptimeHours: 0,
      lastBackup: null as string | null,
      diskUsage: 0,
      memoryUsage: 0,
      statusReasons: [] as string[],
      dbCacheHitRatio: 0,
      dbSize: 0,
      dbConnections: 0,
      dbResponseTime: 0
    }
  });
  const [healthUnavailable, setHealthUnavailable] = useState(false);
  
  const [recentUsers, setRecentUsers] = useState<RecentUserRow[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all data in parallel with proper error handling
        const [
          systemStatsResponse,
          recentUsersResponse,
          systemHealthResponse,
          activitiesResponse
        ] = await Promise.allSettled([
          SystemAPI.getSystemStats(),
          UsersAPI.getUsers({ limit: 10, registered_only: true, order: 'created_at' }),
          SystemAPI.getSystemHealth(),
          ActivityAPI.getActivityLogs({ limit: 10 })
        ]);
        const allUsers = recentUsersResponse.status === 'fulfilled' ? recentUsersResponse.value : [];
        const activities = activitiesResponse.status === 'fulfilled' ? activitiesResponse.value : [];

        setSystemStats(prev => ({
          ...prev,
          ...(systemStatsResponse.status === 'fulfilled' ? systemStatsResponse.value : {}),
          ...(systemHealthResponse.status === 'fulfilled' ? { systemHealth: systemHealthResponse.value } : {})
        }));
        setHealthUnavailable(systemHealthResponse.status !== 'fulfilled');
        
        // Sort recent users by creation date manually
        const sortedRecentUsers = Array.isArray(allUsers) ? [...allUsers].sort((a, b) => 
          parseNaiveDateTimeToTimestamp(b.created_at) - parseNaiveDateTimeToTimestamp(a.created_at)
        ).slice(0, 10) : [];
        
        // Format recent users data
        const formattedRecentUsers = sortedRecentUsers.map((user: UserRead) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.role,
          registered: user.created_at
        }));
        
        setRecentUsers(formattedRecentUsers);
        setActivityLog(activities);
        
        // Check if any of the crucial APIs failed
        const failedRequests = [
          systemStatsResponse, 
          recentUsersResponse,
          systemHealthResponse
        ].filter(response => response.status === 'rejected');
        
        if (failedRequests.length > 0) {
          console.error('Some dashboard data failed to load:', failedRequests);
          setError('Some dashboard data failed to load. You may need to refresh.');
        }
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
        setError('Failed to load dashboard data. Please log out and back in again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const adminLinks = [
    {
      to: '/admin/happening-today',
      label: 'Happening Today',
      icon: 'calendar',
      description:
        systemStats.happeningToday === 1
          ? '1 event bowling today'
          : `${systemStats.happeningToday ?? 0} events bowling today`,
    },
    {
      to: '/admin/coming-up',
      label: 'Coming Up',
      icon: 'calendar',
      description:
        systemStats.comingUp === 1
          ? '1 event in the next 10 days'
          : `${systemStats.comingUp ?? 0} events in the next 10 days`,
    },
    { to: '/admin/abuse-reports', label: 'Abuse Reports', icon: 'flag', description: 'Review inaccurate-score reports from bowlers' },
    { to: '/admin/grant-credits', label: 'Grant Credits', icon: 'cog', description: 'Grant tournament unlock credits to TDs' },
    { to: '/admin/users', label: 'User Management', icon: 'users', description: 'Manage users, roles, and permissions' },
    { to: '/admin/tournaments', label: 'Tournament Management', icon: 'trophy', description: 'Oversee all tournaments' },
    { to: '/admin/bowling-centers', label: 'Bowling Centers', icon: 'building', description: 'Add and manage bowling centers' },
    { to: '/admin/system-settings', label: 'System Settings', icon: 'cog', description: 'Configure system parameters' }
  ];

  // Format a timestamp to a readable date/time
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) {
      return 'Not available';
    }
    return formatDateTimeNaive(timestamp);
  };

  // Get an appropriate icon for system status
  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <div className="rounded-full bg-success/20 p-1">
            <svg className="h-6 w-6 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="rounded-full bg-pending/20 p-1">
            <svg className="h-6 w-6 text-pending" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="rounded-full bg-danger/20 p-1">
            <svg className="h-6 w-6 text-danger" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
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
        <div className="flex justify-between items-center mb-6">
          <PageTitle>Admin Dashboard</PageTitle>
        </div>
        
        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-6"
          />
        )}
        
        <div className="mb-8">
          <div className="rounded-lg overflow-hidden bg-surface border border-border shadow-sm">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-primary">
                {`Welcome, ${user?.first_name}`}
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                Manage your bowling tournament system from this administrative dashboard. Use the cards below to navigate to different administrative sections of the bowling tournament system.
              </p>

              {systemStats.systemHealth.status !== 'healthy' && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Alert
                    variant={systemStats.systemHealth.status === 'warning' ? 'warning' : 'error'}
                    message={`System status: ${systemStats.systemHealth.status}${systemStats.systemHealth.statusReasons.length > 0 ? ` (${systemStats.systemHealth.statusReasons.join(', ')})` : ''}`}
                    className="mb-0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="shadow-sm">
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
                      Bowlers / participants
                    </dt>
                    <dd className="text-xl font-bold text-primary">
                      {loading ? <Loading size="small" /> : systemStats.users.total}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">{systemStats.users.newThisMonth} new this month</span>
                  <span className="text-text-muted">{systemStats.users.active} active</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                  <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Subscription TDs
                    </dt>
                    <dd className="text-xl font-bold text-primary">
                      {loading ? <Loading size="small" /> : systemStats.subscriptionTds ?? 0}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Paying Annual / Monthly</span>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="shadow-sm">
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
                      Tournaments
                    </dt>
                    <dd className="text-xl font-bold text-primary">
                      {loading ? <Loading size="small" /> : systemStats.tournaments.total}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">{systemStats.tournaments.active} active</span>
                  <span className="text-text-muted">{systemStats.tournaments.completed} completed</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                  <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Events
                    </dt>
                    <dd className="text-xl font-bold text-primary">
                      {loading ? <Loading size="small" /> : systemStats.events.total}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">{systemStats.events.active} active</span>
                  <span className="text-text-muted">{systemStats.uniqueBowlers} unique bowlers</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                  <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Games
                    </dt>
                    <dd className="text-xl font-bold text-primary">
                      {loading ? <Loading size="small" /> : systemStats.games.total}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">{systemStats.games.active} scored</span>
                  <span className="text-text-muted">platform activity</span>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="shadow-sm">
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
                      Bowling Centers
                    </dt>
                    <dd className="text-xl font-bold text-primary">
                      {loading ? <Loading size="small" /> : systemStats.bowlingCenters.total}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">{systemStats.bowlingCenters.active} active</span>
                  <Link to="/admin/bowling-centers" className="text-primary">View all</Link>
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                  <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Abuse Reports
                    </dt>
                    <dd className="text-xl font-bold text-primary">
                      {loading ? (
                        <Loading size="small" />
                      ) : (
                        systemStats.abuseReports.open + systemStats.abuseReports.in_review
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">{systemStats.abuseReports.total} total</span>
                  <Link to="/admin/abuse-reports" className="text-primary">Review</Link>
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                  <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Subscriptions
                    </dt>
                    <dd className="text-xl font-bold text-primary">
                      {loading ? (
                        <Loading size="small" />
                      ) : systemStats.billing.available ? (
                        systemStats.billing.activeAnnualSubscriptions +
                        systemStats.billing.activeMonthlySubscriptions +
                        (systemStats.billing.activeSideActionAnnualSubscriptions ?? 0) +
                        (systemStats.billing.activeSideActionMonthlySubscriptions ?? 0)
                      ) : (
                        '—'
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted truncate" title={systemStats.billing.message}>
                    {systemStats.billing.available
                      ? `${systemStats.billing.unusedTournamentCredits} tournament · ${
                          systemStats.billing.unusedSideActionPasses ?? 0
                        } SA · ${
                          systemStats.billing.unusedLargeCapLiftPasses ?? 0
                        } lift passes`
                      : 'Pending Stripe'}
                  </span>
                  <Link to="/admin/td-credits" className="text-primary shrink-0 ml-3">
                    Review
                  </Link>
                </div>
              </div>
            </div>
          </Card>
          
          <Link to="/admin/system-status" className="block">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {renderStatusIcon(systemStats.systemHealth.status)}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      System Status
                    </dt>
                    <dd className="text-xl font-bold text-primary capitalize">
                      {loading ? <Loading size="small" /> : systemStats.systemHealth.status}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Uptime: {(systemStats.systemHealth.uptimeHours / 24).toFixed(1)} days</span>
                  <span className="text-primary">Details</span>
                </div>
              </div>
            </div>
          </Card>
          </Link>
        </div>

        {/* Admin Quick Links */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {adminLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="bg-surface border border-border overflow-hidden shadow rounded-lg transition-all hover:shadow-md hover:bg-surface-light"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                    {link.icon === 'calendar' && (
                      <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {link.icon === 'users' && (
                      <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                    {link.icon === 'flag' && (
                      <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                    )}
                    {link.icon === 'building' && (
                      <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                    {link.icon === 'trophy' && (
                      <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    )}
                    {link.icon === 'cog' && (
                      <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-lg font-medium text-text truncate">
                        {link.label}
                      </dt>
                      <dd className="text-sm text-text-muted">
                        {link.description}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* System Health and Recent Users */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
          {/* System Health */}
          <Card
            title="Backend System Health"
            className="shadow-sm"
            footer={
              <Link to="/admin/system-status" className="text-primary text-sm font-medium">
                Details
              </Link>
            }
          >
            <div className="p-5">
              {loading ? (
                <Loading />
              ) : (
                <>
                  {healthUnavailable && (
                    <Alert
                      variant="warning"
                      message="System health details are temporarily unavailable."
                      className="mb-4"
                    />
                  )}
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-text-muted">Disk Usage</span>
                      <span className="text-sm font-medium text-text">{systemStats.systemHealth.diskUsage}%</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          systemStats.systemHealth.diskUsage > 80 
                            ? 'bg-red-600' 
                            : systemStats.systemHealth.diskUsage > 60 
                              ? 'bg-yellow-400' 
                              : 'bg-green-600'
                        }`} 
                        style={{ width: `${systemStats.systemHealth.diskUsage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-text-muted">Memory Usage</span>
                      <span className="text-sm font-medium text-text">{systemStats.systemHealth.memoryUsage}%</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          systemStats.systemHealth.memoryUsage > 80 
                            ? 'bg-red-600' 
                            : systemStats.systemHealth.memoryUsage > 60 
                              ? 'bg-yellow-400' 
                              : 'bg-green-600'
                        }`} 
                        style={{ width: `${systemStats.systemHealth.memoryUsage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-light p-3 rounded-md">
                      <p className="text-sm text-text-muted">Last Backup</p>
                      <p className="text-sm font-medium text-text">
                        {formatTimestamp(systemStats.systemHealth.lastBackup)}
                      </p>
                    </div>
                    <div className="bg-surface-light p-3 rounded-md">
                      <p className="text-sm text-text-muted">System Uptime</p>
                      <p className="text-sm font-medium text-text">
                        {Math.floor(systemStats.systemHealth.uptimeHours / 24)} days, {systemStats.systemHealth.uptimeHours % 24} hours
                      </p>
                    </div>
                  </div>
                  
                  {/* Database Performance Section */}
                  <div className="mt-6 mb-2">
                    <h4 className="text-sm font-semibold text-text mb-3">Database Performance</h4>
                    
                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-text-muted">Cache Hit Ratio</span>
                        <span className="text-sm font-medium text-text">{systemStats.systemHealth.dbCacheHitRatio.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            systemStats.systemHealth.dbCacheHitRatio < 50 
                              ? 'bg-red-600' 
                              : systemStats.systemHealth.dbCacheHitRatio < 80 
                                ? 'bg-yellow-400' 
                                : 'bg-green-600'
                          }`} 
                          style={{ width: `${systemStats.systemHealth.dbCacheHitRatio}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-light p-3 rounded-md">
                        <p className="text-sm text-text-muted">Database Size</p>
                        <p className="text-sm font-medium text-text">
                          {systemStats.systemHealth.dbSize.toFixed(1)} MB
                        </p>
                      </div>
                      <div className="bg-surface-light p-3 rounded-md">
                        <p className="text-sm text-text-muted">Active Connections</p>
                        <p className="text-sm font-medium text-text">
                          {systemStats.systemHealth.dbConnections}
                        </p>
                      </div>
                      <div className="bg-surface-light p-3 rounded-md">
                        <p className="text-sm text-text-muted">Response Time</p>
                        <p className="text-sm font-medium text-text">
                          {systemStats.systemHealth.dbResponseTime.toFixed(2)} ms
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
          
          {/* Recent Users */}
          <Card 
            title="Recent User Registrations"
            className="shadow-sm"
            footer={
              <Link to="/admin/users" className="text-primary text-sm font-medium">
                View All Users
              </Link>
            }
          >
            <div className="p-5">
              {loading ? (
                <Loading />
              ) : recentUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-primary">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                          Role
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
                      {recentUsers.map((user, rowIdx) => (
                        <tr
                          key={user.id}
                          className={rowIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-light'}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white">
                                {user.name.charAt(0)}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-text">{user.name}</div>
                                <div className="text-sm text-text-muted">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleBadgeClass(user.role)}`}>
                              {roleDisplayLabel(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                            {formatTimestamp(user.registered)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link to={`/admin/bowlers/${user.id}`} className="text-primary hover:text-primary-light">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-text-muted">No recent user registrations</p>
              )}
            </div>
          </Card>
        </div>
        
        {/* Recent Activity */}
        <Card title="System Activity Log" className="shadow-sm">
          <div className="p-5">
            {loading ? (
              <Loading />
            ) : activityLog.length > 0 ? (
              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {activityLog.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== activityLog.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true"></span>
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                              <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-text-muted">{activity.description} <span className="font-medium text-text">{activity.user}</span></p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-text-muted">
                              {formatTimestamp(activity.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-6">No significant system activity so far.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
