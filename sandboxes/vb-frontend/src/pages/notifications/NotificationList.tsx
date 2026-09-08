import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationRead } from '../../types/notification';
import { NotificationType } from '../../types/notification_enum';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Loading from '../../components/common/Loading';
import { useRoleAwareNavigation } from '../../utils/roleBasedRouting';
import { formatDateSmartNaive } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';

const NotificationList: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [notifications, setNotifications] = useState<NotificationRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const roleAwareNav = useRoleAwareNavigation(user);
  
  // Use the notifications hook
  const { 
    loading, 
    error, 
    getUserNotifications, 
    markAsRead, 
    deleteNotification 
  } = useNotifications();

  // Handle resize events
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Fetch notifications when component mounts
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const fetchedNotifications = await getUserNotifications(user.id, false);
        setNotifications(fetchedNotifications);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNotifications();
  }, [user?.id, getUserNotifications]);
  
  // Handle marking a notification as read
  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
      // Update the local state to reflect the change
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === id 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  // Handle deleting a notification
  const handleDeleteNotification = async (id: number) => {
    try {
      await deleteNotification(id);
      // Remove the deleted notification from local state
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== id)
      );
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };
  
  // Handle marking all filtered notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    
    for (const notification of unreadNotifications) {
      try {
        await markAsRead(notification.id);
      } catch (err) {
        console.error(`Error marking notification ${notification.id} as read:`, err);
      }
    }
    
    // Update all at once in the UI
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        unreadNotifications.some(n => n.id === notification.id)
          ? { ...notification, read: true }
          : notification
      )
    );
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.TOURNAMENT_ANNOUNCEMENT:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case NotificationType.SCORE_UPDATE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case NotificationType.BRACKET_UPDATE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      case NotificationType.SYSTEM_ALERT:
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  // Use centralized naive date formatting
  const formatDate = (dateString: string) => {
    return formatDateSmartNaive(dateString, isMobile);
  };
  
  // Filter notifications based on read status
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });
  
  if (!user) {
    return (
      <div className="text-center py-8">
        <Alert 
          variant="warning" 
          message="You need to be logged in to view your notifications."
          className="mb-4"
        />
        <Link to="/login">
          <Button variant="darkbackground">Login</Button>
        </Link>
      </div>
    );
  }
  
  if (isLoading || loading) {
    return (
      <div className="text-center py-8">
        <Loading size="medium" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8">
        <Alert
          variant="error"
          message={error}
          className="mb-4"
        />
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6">
      <Breadcrumb
        items={[
          homeCrumb(),
          layoutDashboardCrumb(location.pathname),
          { label: 'Notifications' },
        ]}
        className="mb-4"
      />
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <PageTitle className="mb-3 sm:mb-0">Notifications</PageTitle>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter tabs */}
            <div className="bg-surface rounded-lg p-1 flex text-sm mb-2 sm:mb-0 mr-auto sm:mr-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-md ${filter === 'all' ? 'bg-surface-light text-text-muted font-medium' : 'text-text-muted'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-md ${filter === 'unread' ? 'bg-surface-light text-text-muted font-medium' : 'text-text-muted'}`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-1.5 rounded-md ${filter === 'read' ? 'bg-surface-light text-text-muted font-medium' : 'text-text-muted'}`}
              >
                Read
              </button>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2 ml-auto sm:ml-0">
              {filteredNotifications.filter(n => !n.read).length > 0 && (
                <Button
                  variant="darkbackground"
                  size={isMobile ? "small" : "medium"}
                  onClick={handleMarkAllAsRead}
                >
                  Mark All Read
                </Button>
              )}
              <Button
                variant="lightbackground"
                size={isMobile ? "small" : "medium"}
                onClick={() => {
                  // Refresh logic
                }}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <p className="text-text-muted">No notifications to display.</p>
            <Button
              variant="lightbackground"
              onClick={() => {
                // Implement refresh logic
              }}
              className="mt-4"
            >
              Refresh
            </Button>
          </div>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <p className="text-text-muted">No {filter === 'all' ? '' : filter} notifications to display.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification: NotificationRead) => (
            <Card 
              key={notification.id} 
              className={`p-0 ${!notification.read ? 'border-l-4 border-primary' : ''}`}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                      <h3 className="text-base sm:text-lg font-medium text-primary truncate">{notification.title}</h3>
                      <span className="text-xs text-text-muted mt-1 sm:mt-0 sm:ml-2">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted mt-1">{notification.message}</p>
                    
                    {/* Mobile-friendly actions */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {notification.entity_id && (
                        <button
                          onClick={() => {
                            if (!notification.read) {
                              handleMarkAsRead(notification.id);
                            }
                            navigate(roleAwareNav.getTournamentPath(notification.entity_id!));
                          }}
                          className="text-xs sm:text-sm bg-surface-light hover:bg-surface-light text-text-muted py-1 px-2 rounded-md"
                        >
                          View Details
                        </button>
                      )}
                      
                      {!notification.read && (
                        <button
                          className="text-xs sm:text-sm bg-surface-light hover:bg-surface-light text-text-muted py-1 px-2 rounded-md"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Mark Read
                        </button>
                      )}
                      
                      <button
                        className="text-xs sm:text-sm bg-surface-light hover:bg-surface-light text-red-400 py-1 px-2 rounded-md ml-auto"
                        onClick={() => handleDeleteNotification(notification.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationList; 
