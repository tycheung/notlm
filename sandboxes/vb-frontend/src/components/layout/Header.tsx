import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import Button from '../common/Button';
import Dropdown, { DropdownItem } from '../common/Dropdown';
import LogoutButton from '../common/LogoutButton';
import Logo from '../common/Logo';
import { Role } from '../../types/user';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const notifications = useNotifications();
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const isInBowlerView = searchParams.get('view') === 'bowler';

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user) {
        try {
          const summary = await notifications.getNotificationSummary(user.id);
          setUnreadCount(summary.unread || 0); // Using snake_case property name
        } catch (error) {
          console.error('Failed to fetch notification count:', error);
          setUnreadCount(0);
        }
      }
    };
    
    fetchUnreadCount();
  }, [user, notifications]);

  // Handle logout functionality
  const handleLogout = () => {
    logout();
  };

  const userMenuItems = [
    { 
      id: 'profile', 
      label: 'Account', 
      action: () => navigate(isInBowlerView ? "/account?view=bowler" : "/account") 
    },
    {
      id: 'subscription',
      label: 'Manage Subscription',
      action: () =>
        navigate(
          isInBowlerView
            ? '/account/subscription?view=bowler'
            : '/account/subscription'
        ),
    },
    { id: 'logout', label: 'Logout', action: handleLogout },
  ];
  
  // Handle dropdown item selection
  const handleMenuItemSelect = (item: DropdownItem) => {
    const selectedItem = userMenuItems.find(menuItem => menuItem.id === item.id);
    if (selectedItem && selectedItem.action) {
      selectedItem.action();
    }
  };

  return (
    <header className="bg-bg text-text shadow-lg border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Logo size="small" showText={true} linkTo="/" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {/* Home/Dashboard - matching MobileNav */}
            <Link to={isInBowlerView ? "/dashboard?view=bowler" : "/dashboard"} className="text-text hover:text-text-muted">
              Home
            </Link>
            
            {/* Tournaments - already exists but update the URL to match MobileNav */}
            <Link to={isInBowlerView ? "/tournaments?view=bowler" : "/tournaments"} className="text-text hover:text-text-muted">
              Tournaments
            </Link>
            
            {/* Stats/Performance Tracking - new from MobileNav */}
            <Link to={isInBowlerView ? "/performance-tracking?view=bowler" : "/performance-tracking"} className="text-text hover:text-text-muted">
              Stats
            </Link>
            
            {/* Keep the existing Role-specific panel links */}
            {user && isInBowlerView && user.role === Role.ADMIN && (
              <Link to="/admin" className="text-text hover:text-text-muted bg-surface px-3 py-1 rounded-md">
                Admin Panel
              </Link>
            )}
            {user && (user.role === Role.BOWLER || (isInBowlerView && user.role === Role.TD)) && (
              <Link to="/director" className="text-text hover:text-text-muted bg-surface px-3 py-1 rounded-md">
                Director dashboard
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {/* Notifications */}
                <button
                  onClick={() => navigate(isInBowlerView ? "/notifications?view=bowler" : "/notifications")}
                  className="relative p-2 rounded-full hover:bg-surface"
                >
                  <span className="sr-only">Notifications</span>
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
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* User menu */}
                <Dropdown
                  trigger={
                    <button className="flex items-center space-x-2 text-text hover:text-text-muted">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-text">
                        {user.first_name?.charAt(0) || user.email.charAt(0)}
                      </div>
                      <span>{user.first_name || user.email}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  }
                  items={userMenuItems.map(item => ({ id: item.id, label: item.label }))}
                  onSelect={handleMenuItemSelect}
                  className="bg-surface text-text right-0"
                />
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="lightbackground" className="text-text border-primary">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-primary hover:bg-primary-light text-text">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-text focus:outline-none"
            onClick={toggleMobileMenu}
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
                d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <nav className="flex flex-col space-y-3">
              {/* Home/Dashboard */}
              <Link
                to={isInBowlerView ? "/dashboard?view=bowler" : "/dashboard"}
                className="text-text hover:text-text-muted py-2 px-4 rounded hover:bg-surface"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              
              {/* Tournaments */}
              <Link
                to={isInBowlerView ? "/tournaments?view=bowler" : "/tournaments"}
                className="text-text hover:text-text-muted py-2 px-4 rounded hover:bg-surface"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tournaments
              </Link>
              
              {/* Stats/Performance Tracking */}
              <Link
                to={isInBowlerView ? "/performance-tracking?view=bowler" : "/performance-tracking"}
                className="text-text hover:text-text-muted py-2 px-4 rounded hover:bg-surface"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Stats
              </Link>
              
              {/* Admin/Director Panels */}
              {user && isInBowlerView && user.role === Role.ADMIN && (
                <Link
                  to="/admin"
                  className="text-text hover:text-text-muted py-2 px-4 rounded hover:bg-surface"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
              {user && (user.role === Role.BOWLER || (isInBowlerView && user.role === Role.TD)) && (
                <Link
                  to="/director"
                  className="text-text hover:text-text-muted py-2 px-4 rounded hover:bg-surface"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Director dashboard
                </Link>
              )}
              {user ? (
                <>
                  <Link
                    to={isInBowlerView ? "/notifications?view=bowler" : "/notifications"}
                    className="text-text hover:text-text-muted py-2 px-4 rounded hover:bg-surface flex items-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to={isInBowlerView ? "/account?view=bowler" : "/account"}
                    className="text-text hover:text-text-muted py-2 px-4 rounded hover:bg-surface"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <Link
                    to={
                      isInBowlerView
                        ? '/account/subscription?view=bowler'
                        : '/account/subscription'
                    }
                    className="text-text hover:text-text-muted py-2 px-4 rounded hover:bg-surface"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Manage Subscription
                  </Link>
                  <LogoutButton 
                    variant="link" 
                    className="text-left text-text hover:text-text-muted py-2 px-4 rounded hover:bg-surface w-full" 
                  />
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link
                    to="/login"
                    className="text-text hover:text-text-muted py-2 px-4 rounded border border-primary hover:bg-surface text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary hover:bg-primary-light text-text py-2 px-4 rounded text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
