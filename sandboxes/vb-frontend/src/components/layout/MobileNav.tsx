import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/user';
import { isDirectorSuiteRole } from '../../utils/roles';
import { useNotifications } from '../../hooks/useNotifications';

const MobileNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const notifications = useNotifications();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchParams] = useSearchParams();
  const isInBowlerView = searchParams.get('view') === 'bowler';
  
  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user) {
        try {
          // Fetch all notifications and count unread ones manually
          const allNotifications = await notifications.getUserNotifications(user.id);
          const unreadNotifications = allNotifications.filter(notification => !notification.read);
          setUnreadCount(unreadNotifications.length);
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
          setUnreadCount(0);
        }
      }
    };
    
    fetchUnreadCount();
    
    // Set up polling for notifications every 30 seconds
    const intervalId = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(intervalId);
  }, [user, notifications]);

  // Check if a path is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Render the admin/director mode switch button if appropriate
  const renderRoleSwitchButton = () => {
    if (!user || !isInBowlerView) return null;

    if (user.role === Role.ADMIN || user.role === 'admin') {
      return (
        <Link to="/admin" className="flex flex-col items-center p-2 text-text-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c.426 1.756 2.924 1.756 3.35 0a1.724 1.724 0 002.573-1.066c1.543.94 3.31-.826 2.37-2.37a1.724 1.724 0 001.065-2.572c1.756-.426 1.756-2.924 0-3.35a1.724 1.724 0 00-1.066-2.573c.94-1.543-.826-3.31-2.37-2.37a1.724 1.724 0 00-2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-xs mt-1">Admin</span>
        </Link>
      );
    } else if (isDirectorSuiteRole(user.role) && user.role !== Role.ADMIN && user.role !== 'admin') {
      return (
        <Link to="/director" className="flex flex-col items-center p-2 text-text-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span className="text-xs mt-1">Director</span>
        </Link>
      );
    }
    
    return null;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border py-2 px-4 z-50">
      <div className="flex justify-between items-center">
        {/* Home/Dashboard */}
        <Link
          to={isInBowlerView ? "/dashboard?view=bowler" : "/dashboard"}
          className={`flex flex-col items-center p-2 ${
            isActive('/dashboard') ? 'text-primary' : 'text-text-muted'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span className="text-xs mt-1">Home</span>
        </Link>

        {/* Tournaments */}
        <Link
          to={isInBowlerView ? "/tournaments?view=bowler" : "/tournaments"}
          className={`flex flex-col items-center p-2 ${
            isActive('/tournaments') ? 'text-primary' : 'text-text-muted'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span className="text-xs mt-1">Tournaments</span>
        </Link>

        {/* Stats (formerly My Events) */}
        <Link
          to={isInBowlerView ? "/performance-tracking?view=bowler" : "/performance-tracking"}
          className={`flex flex-col items-center p-2 ${
            isActive('/performance-tracking') ? 'text-primary' : 'text-text-muted'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-xs mt-1">Stats</span>
        </Link>

        {/* Role Switch Button if needed */}
        {renderRoleSwitchButton() || (
          // Notifications - with badge for unread count
          <Link
            to={isInBowlerView ? "/notifications?view=bowler" : "/notifications"}
            className={`flex flex-col items-center p-2 relative ${
              isActive('/notifications') ? 'text-primary' : 'text-text-muted'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-xs text-white font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="text-xs mt-1">Alerts</span>
          </Link>
        )}

        {/* Profile */}
        <Link
          to={isInBowlerView ? "/account?view=bowler" : "/account"}
          className={`flex flex-col items-center p-2 ${
            isActive('/account') ? 'text-primary' : 'text-text-muted'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="text-xs mt-1">Account</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileNav; 
