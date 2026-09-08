import React, { ReactNode, useState, useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import Header from './Header';
import MobileNav from './MobileNav';
import { useAuth } from '../../contexts/AuthContext';

interface UserLayoutProps {
  children: ReactNode;
}

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const hideChromeForAnonymousEvent =
    !authLoading &&
    !user &&
    matchPath({ path: '/events/:id', end: true }, location.pathname) != null;

  // Handle window resize to detect mobile vs desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      {!isMobile && !hideChromeForAnonymousEvent && <Header />}

      <main
        className={`flex-grow ${isMobile && !hideChromeForAnonymousEvent ? 'pb-16' : ''}`}
      >
        {children}
      </main>

      {isMobile && !hideChromeForAnonymousEvent && <MobileNav />}
    </div>
  );
};

export default UserLayout; 
