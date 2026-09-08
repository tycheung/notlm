import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Label from '../../components/common/Label';
import {
  NotificationPreference,
  EmailFrequency,
  NotificationPreferences,
  TdNotificationPreferences,
  updateNotificationPreferences,
  updateTdNotificationPreferences,
} from '../../api/account';
import { getErrorMessage } from '../../api/apiErrors';

const REST_PRESETS: { label: string; value: number }[] = [
  { label: 'Live (full detail per alert)', value: 0 },
  { label: '15 minutes', value: 900 },
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '24 hours', value: 86400 },
  { label: '72 hours (max)', value: 259200 },
];

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  tdPreferences?: TdNotificationPreferences;
  emailVerified: boolean;
  onUpdateSuccess: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences,
  tdPreferences,
  emailVerified,
  onUpdateSuccess,
}) => {
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference>(
    preferences.notification_preference
  );
  const [emailFrequency, setEmailFrequency] = useState<EmailFrequency>(
    preferences.email_notification_preference
  );
  const [pushEnabled, setPushEnabled] = useState<boolean>(
    preferences.push_notifications_enabled
  );
  const [tdEmailOn, setTdEmailOn] = useState(tdPreferences?.td_notify_email_enabled ?? false);
  const [tdSmsOn, setTdSmsOn] = useState(tdPreferences?.td_notify_sms_enabled ?? false);
  const [tdEmailRest, setTdEmailRest] = useState(tdPreferences?.td_email_rest_period_seconds ?? 0);
  const [tdSmsRest, setTdSmsRest] = useState(tdPreferences?.td_sms_rest_period_seconds ?? 0);
  const [phoneVerifiedSms, setPhoneVerifiedSms] = useState(
    tdPreferences?.phone_verified_for_sms ?? false
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tdPreferences) return;
    setTdEmailOn(tdPreferences.td_notify_email_enabled);
    setTdSmsOn(tdPreferences.td_notify_sms_enabled);
    setTdEmailRest(tdPreferences.td_email_rest_period_seconds);
    setTdSmsRest(tdPreferences.td_sms_rest_period_seconds);
    setPhoneVerifiedSms(tdPreferences.phone_verified_for_sms);
  }, [tdPreferences]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await updateNotificationPreferences({
        notification_preference: notificationPreference,
        email_notification_preference: emailFrequency,
        push_notifications_enabled: pushEnabled,
      });
      if (tdPreferences) {
        await updateTdNotificationPreferences({
          td_notify_email_enabled: tdEmailOn,
          td_notify_sms_enabled: tdSmsOn,
          td_email_rest_period_seconds: tdEmailRest,
          td_sms_rest_period_seconds: tdSmsRest,
          phone_verified_for_sms: phoneVerifiedSms,
        });
      }
      setSuccess('Notification preferences updated successfully');
      onUpdateSuccess();
    } catch (err: any) {
      console.error('Failed to update notification preferences:', err);
      setError(getErrorMessage(err, 'Failed to update preferences. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-primary mb-6">Notification Settings</h2>

      <form onSubmit={handleSubmit}>
        {/* General Notification Preferences */}
        <Card 
          title="Notification Preferences" 
          className="mb-6 bg-surface border-none shadow"
          titleColor="text-primary"
          headerBorderColor="border-border"
        >
          <div className="space-y-4 pb-4 border-b border-border">
            <div>
              <label className="block text-sm font-medium text-primary mb-3">
                What notifications would you like to receive?
              </label>
              
              <div className="space-y-2">
                <label className="flex items-start">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light"
                    value={NotificationPreference.ALL}
                    checked={notificationPreference === NotificationPreference.ALL}
                    onChange={(e) => setNotificationPreference(e.target.value as NotificationPreference)}
                  />
                  <span className="ml-2 text-text-muted">
                    All notifications (tournaments, results, announcements, etc.)
                  </span>
                </label>
                
                <label className="flex items-start">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light"
                    value={NotificationPreference.IMPORTANT}
                    checked={notificationPreference === NotificationPreference.IMPORTANT}
                    onChange={(e) => setNotificationPreference(e.target.value as NotificationPreference)}
                  />
                  <span className="ml-2 text-text-muted">
                    Important notifications only (tournament start times, results, etc.)
                  </span>
                </label>
                
                <label className="flex items-start">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light"
                    value={NotificationPreference.NONE}
                    checked={notificationPreference === NotificationPreference.NONE}
                    onChange={(e) => setNotificationPreference(e.target.value as NotificationPreference)}
                  />
                  <span className="ml-2 text-text-muted">
                    No notifications (not recommended)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Email Notification Settings */}
        <Card 
          title="Email Notifications" 
          className="mb-6 bg-surface border-none shadow"
          titleColor="text-primary"
          headerBorderColor="border-border"
        >
          {!emailVerified && (
            <Alert
              variant="warning"
              message="Verify your email in Security settings to enable email notifications."
              className="mb-4"
            />
          )}
          <div className="space-y-4 pb-4 border-b border-border">
            <div>
              <label className="block text-sm font-medium text-primary mb-3">
                How often would you like to receive email notifications?
              </label>
              
              <div className="space-y-2">
                <label className="flex items-start">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light"
                    value={EmailFrequency.IMMEDIATELY}
                    checked={emailFrequency === EmailFrequency.IMMEDIATELY}
                    disabled={!emailVerified}
                    onChange={(e) => setEmailFrequency(e.target.value as EmailFrequency)}
                  />
                  <span className="ml-2 text-text-muted">
                    Send emails immediately
                  </span>
                </label>
                
                <label className="flex items-start">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light"
                    value={EmailFrequency.DAILY}
                    checked={emailFrequency === EmailFrequency.DAILY}
                    disabled={!emailVerified}
                    onChange={(e) => setEmailFrequency(e.target.value as EmailFrequency)}
                  />
                  <span className="ml-2 text-text-muted">
                    Daily digest (once per day)
                  </span>
                </label>
                
                <label className="flex items-start">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light"
                    value={EmailFrequency.WEEKLY}
                    checked={emailFrequency === EmailFrequency.WEEKLY}
                    disabled={!emailVerified}
                    onChange={(e) => setEmailFrequency(e.target.value as EmailFrequency)}
                  />
                  <span className="ml-2 text-text-muted">
                    Weekly digest (once per week)
                  </span>
                </label>
                <label className="flex items-start">
                  <input
                    type="radio"
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light"
                    value={EmailFrequency.NONE}
                    checked={emailFrequency === EmailFrequency.NONE}
                    disabled={!emailVerified}
                    onChange={(e) => setEmailFrequency(e.target.value as EmailFrequency)}
                  />
                  <span className="ml-2 text-text-muted">
                    Do not send email notifications
                  </span>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Push Notification Settings */}
        <Card 
          title="Push Notifications" 
          className="mb-6 bg-surface border-none shadow"
          titleColor="text-primary"
          headerBorderColor="border-border"
        >
          <div className="space-y-4 pb-4 border-b border-border">
            <Label className="flex items-center text-sm mb-0 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light rounded mr-2"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
              />
              Enable push notifications in browser
            </Label>
            
            <p className="text-text-muted opacity-80 text-sm mt-1">
              You may need to allow notifications in your browser settings for this to work.
            </p>
          </div>
        </Card>

        {tdPreferences && (
          <Card
            title="Tournament director alerts (sign-ups)"
            className="mb-6 bg-surface border-none shadow"
            titleColor="text-primary"
            headerBorderColor="border-border"
          >
            <p className="text-text-muted text-sm mb-4">
              New bowler sign-ups always appear in the app. Optionally get email or text summaries;
              use a rest period to pool bursts (counts only outside the app—full detail stays in-app).
            </p>
            <div className="space-y-4 pb-4 border-b border-border">
              {!emailVerified && (
                <Alert
                  variant="warning"
                  message="TD email alerts are disabled until your email is verified."
                  className="mb-2"
                />
              )}
              <Label className="flex items-center text-sm mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light rounded mr-2"
                  checked={tdEmailOn}
                  disabled={!emailVerified}
                  onChange={(e) => setTdEmailOn(e.target.checked)}
                />
                Email me about new sign-ups
              </Label>
              <div className="ml-6">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Email rest period (digest)
                </label>
                <select
                  className="block w-full max-w-md rounded border border-border bg-surface-light text-text px-2 py-1.5 text-sm"
                  value={tdEmailRest}
                  disabled={!emailVerified}
                  onChange={(e) => setTdEmailRest(Number(e.target.value))}
                >
                  {REST_PRESETS.map((p) => (
                    <option key={`e-${p.value}`} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-4 pt-4">
              <Label className="flex items-center text-sm mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light rounded mr-2"
                  checked={tdSmsOn}
                  onChange={(e) => setTdSmsOn(e.target.checked)}
                />
                Text me (SMS) about new sign-ups
              </Label>
              <Label className="flex items-center text-sm mb-2 ml-6 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-border bg-surface-light rounded mr-2"
                  checked={phoneVerifiedSms}
                  onChange={(e) => setPhoneVerifiedSms(e.target.checked)}
                />
                My phone number is verified for SMS (required for texts)
              </Label>
              <div className="ml-6">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  SMS rest period (digest)
                </label>
                <select
                  className="block w-full max-w-md rounded border border-border bg-surface-light text-text px-2 py-1.5 text-sm"
                  value={tdSmsRest}
                  onChange={(e) => setTdSmsRest(Number(e.target.value))}
                >
                  {REST_PRESETS.map((p) => (
                    <option key={`s-${p.value}`} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Feedback and Submit */}
        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}
        
        {success && (
          <Alert
            variant="success"
            message={success}
            onDismiss={() => setSuccess(null)}
            className="mb-4"
          />
        )}
        
        <Button
          type="submit"
          variant="darkbackground"
          disabled={loading}
          isLoading={loading}
          className="bg-primary text-text hover:bg-primary-light"
        >
          Save Preferences
        </Button>
      </form>
    </div>
  );
};

export default NotificationSettings; 
