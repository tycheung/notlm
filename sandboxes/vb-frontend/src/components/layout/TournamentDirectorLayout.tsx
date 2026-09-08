import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { navPathMatches } from '../../utils/navPath';
import { isSaOnlyRole } from '../../utils/roles';
import { UsersAPI } from '../../api/users';
import { EventsAPI } from '../../api/events';
import LogoutButton from '../common/LogoutButton';
import Logo from '../common/Logo';
import { DirectorGuideHost } from '../../features/director-guide';
import { GUIDE_IDS } from '../../features/director-guide/guideIds';

interface TournamentDirectorLayoutProps {
  children: React.ReactNode;
}

const TournamentDirectorLayout: React.FC<TournamentDirectorLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const { data: temporaryUsbcRows = [] } = useQuery({
    queryKey: ['temporaryUsbcUsers'],
    queryFn: () => UsersAPI.getTemporaryUsbcUsers({ skip: 0, limit: 500 }),
    enabled: Boolean(user),
  });

  const { data: pendingSignups = [] } = useQuery({
    queryKey: ['pendingSignupEvents'],
    queryFn: () => EventsAPI.getPendingSignupEvents(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const pendingSignupCount = pendingSignups.reduce(
    (sum, row) => sum + (row.pending_count || 0),
    0
  );
  const actionsNeededCount = temporaryUsbcRows.length + pendingSignupCount;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const navLinks = [
    { 
      to: '/director', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      text: 'Dashboard' 
    },
    { 
      to: '/director/tournaments', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ), 
      text: 'Tournament Management' 
    },
    { 
      to: '/director/side-actions', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ), 
      text: 'Side Action Management' 
    },
    { 
      to: '/director/bowling-centers', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ), 
      text: 'Bowling Centers' 
    },
    {
      to: '/director/event-formats',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      text: 'Event Format',
    },
    {
      to: '/director/side-action-templates',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      text: 'SA Templates',
    },
    {
      to: '/director/actions-needed',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      text: 'Actions Needed',
    },
    {
      to: '/director/averages',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      text: 'House averages',
    },
    {
      to: '/director/bowlers',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      text: 'Bowler lookup',
    },
    {
      to: '/director/subscription',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      text: 'Manage Subscription',
    },
  ];

  const saAccount = isSaOnlyRole(user?.role);

  const visibleNavLinks = navLinks.filter((link) => {
    if (!saAccount) return true;
    return (
      link.to !== '/director/tournaments' && link.to !== '/director/event-formats'
    );
  });

  const isActive = (path: string) => navPathMatches(location.pathname, path);

  return (
    <DirectorGuideHost>
    <div className="flex h-screen bg-bg">
      {/* Mobile sidebar */}
      <div className="md:hidden">
        <button
          onClick={toggleSidebar}
          className="p-2 m-2 text-primary rounded-md hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition duration-200 ease-in-out z-30 w-64 bg-surface shadow-lg md:relative md:shadow-none flex flex-col`}
      >
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Logo size="small" showText={false} linkTo="/" />
            <h2 className="text-xl font-semibold text-primary">Tournament Director</h2>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-primary hover:text-text focus:outline-none focus:ring-2 focus:ring-primary md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main navigation */}
        <nav className="p-4 flex-grow overflow-y-auto">
          <ul className="space-y-2">
            {visibleNavLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  data-guide-id={
                    link.to === '/director/bowling-centers'
                      ? GUIDE_IDS.BOWLING_CENTERS_NAV
                      : link.to === '/director/subscription'
                        ? GUIDE_IDS.SUBSCRIPTION_NAV
                        : undefined
                  }
                  className={`flex items-center gap-2 p-2 rounded-md min-w-0 ${
                    isActive(link.to)
                      ? 'bg-surface-light text-text'
                      : 'text-text-muted hover:bg-surface-light hover:text-text'
                  }`}
                >
                  <span className="flex-shrink-0">{link.icon}</span>
                  <span className="flex-1 min-w-0">{link.text}</span>
                  {link.to === '/director/actions-needed' && (
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        actionsNeededCount > 0
                          ? 'bg-primary/15 text-primary border border-primary/25'
                          : 'bg-surface-light text-text-muted border border-border'
                      }`}
                      aria-label={`${actionsNeededCount} action${actionsNeededCount === 1 ? '' : 's'} needed`}
                    >
                      {actionsNeededCount > 99 ? '99+' : actionsNeededCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Account Settings & Logout */}
        <div className="mt-auto border-t border-border">
          <Link
            to="/dashboard?view=bowler"
            className="flex items-center p-4 text-text-muted hover:text-text"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
            <span>Bowler View</span>
          </Link>
          <Link
            to="/director/account"
            className={`flex items-center p-4 ${
              isActive('/director/account')
                ? 'text-text'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Account Settings</span>
          </Link>
          <div className="p-4 border-t border-border">
            <LogoutButton 
              variant="link" 
              className="flex items-center gap-2 w-full text-left text-text-muted hover:text-primary transition-colors" 
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto bg-bg">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
    </DirectorGuideHost>
  );
};

export default TournamentDirectorLayout; 
