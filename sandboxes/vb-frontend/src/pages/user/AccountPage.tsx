import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../../components/common/Alert';
import Loading from '../../components/common/Loading';
import SecuritySettings from '../../components/account/SecuritySettings';
import NotificationSettings from '../../components/account/NotificationSettings';
import HomeBaseManagement from '../../components/account/HomeBaseManagement';
import ProfileSettings from '../../components/account/ProfileSettings';
import UsbcIdentityManagement from '../../components/account/UsbcIdentityManagement';
import { getSecurityInfo, UserSecurityInfo } from '../../api/account';
import { formatDateNaive, getCurrentTimezoneNaiveISO } from '../../utils/dateUtils';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';

type AccountTab =
  | 'profile'
  | 'usbc-ids'
  | 'security'
  | 'notifications'
  | 'home-bases';

const AccountPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');
  const [securityInfo, setSecurityInfo] = useState<UserSecurityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, updateUser } = useAuth();

  // Load security info
  useEffect(() => {
    loadSecurityInfo();
  }, []);

  const loadSecurityInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSecurityInfo();
      setSecurityInfo(response.data);
    } catch (err) {
      console.error('Failed to load security info:', err);
      setError('Failed to load account settings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Tabs: contrast comes from global button reset in index.css (no default orange fill).
  const TabButton: React.FC<{
    tab: AccountTab;
    label: string;
    icon?: React.ReactNode;
  }> = ({ tab, label, icon }) => {
    const isActive = activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`flex items-center shrink-0 px-3 py-3 font-semibold border-b-2 transition-colors sm:px-4 ${
          isActive
            ? 'text-primary border-primary'
            : 'text-text-muted border-transparent hover:text-text hover:border-border'
        }`}
      >
        {icon && (
          <span className={`mr-2 shrink-0 ${isActive ? 'text-primary' : 'text-text-dim'}`}>
            {icon}
          </span>
        )}
        <span className="whitespace-nowrap">{label}</span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex justify-center items-center h-64">
          <Loading />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-6">
        <Alert
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-6">
        <div className="text-center">
          <Alert 
            variant="warning" 
            message="Please log in to view your account."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-6">
      <Breadcrumb
        items={[
          homeCrumb(),
          layoutDashboardCrumb(location.pathname),
          { label: 'Account' },
        ]}
        className="mb-4"
      />
      <div className="mb-6">
        <PageTitle size="responsive">Account</PageTitle>
        <p className="text-text-muted text-sm sm:text-base mt-1">
          Manage your profile, account settings, and preferences.
        </p>
      </div>

      {/* Tabs: min-w-0 on the scroller prevents flex subpixel overflow; gap-2 avoids space-x margin quirks */}
      <div className="mb-6 min-w-0 overflow-x-auto border-b border-border">
        <div className="inline-flex gap-2">
          <TabButton 
            tab="profile"
            label="Profile"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            }
          />
          <TabButton 
            tab="usbc-ids"
            label="USBC IDs"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 3a1 1 0 000 2h6a1 1 0 100-2H7zm-1 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" />
              </svg>
            }
          />
          <TabButton 
            tab="security"
            label="Security"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            }
          />
          <TabButton 
            tab="notifications"
            label="Notifications"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            }
          />
          <TabButton 
            tab="home-bases"
            label="Home Bases"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            }
          />
        </div>
      </div>

      <div className="mb-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && user && (
          <ProfileSettings
            user={user}
            updateUser={updateUser}
            onUpdateSuccess={loadSecurityInfo}
          />
        )}
        
        {/* Security Tab */}
        {activeTab === 'usbc-ids' && <UsbcIdentityManagement />}

        {/* Security Tab */}
        {activeTab === 'security' && securityInfo && (
          <SecuritySettings 
            securityInfo={securityInfo} 
            onUpdateSuccess={loadSecurityInfo} 
          />
        )}
        
        {/* Notifications Tab */}
        {activeTab === 'notifications' && securityInfo && (
          <NotificationSettings 
            preferences={{
              notification_preference: securityInfo.notification_preference,
              email_notification_preference: securityInfo.email_notification_preference,
              push_notifications_enabled: securityInfo.push_notifications_enabled
            }}
            emailVerified={securityInfo.email_verified}
            tdPreferences={
              securityInfo.role === 'tournament_director' || securityInfo.role === 'admin'
                ? {
                    td_notify_email_enabled: securityInfo.td_notify_email_enabled ?? false,
                    td_notify_sms_enabled: securityInfo.td_notify_sms_enabled ?? false,
                    td_email_rest_period_seconds: securityInfo.td_email_rest_period_seconds ?? 0,
                    td_sms_rest_period_seconds: securityInfo.td_sms_rest_period_seconds ?? 0,
                    phone_verified_for_sms: securityInfo.phone_verified_for_sms ?? false,
                  }
                : undefined
            }
            onUpdateSuccess={loadSecurityInfo}
          />
        )}
        
        {/* Home Bases Tab */}
        {activeTab === 'home-bases' && (
          <HomeBaseManagement 
            securityInfo={securityInfo} 
            onUpdateSuccess={loadSecurityInfo}
          />
        )}
      </div>
    </div>
  );
};

export default AccountPage; 
