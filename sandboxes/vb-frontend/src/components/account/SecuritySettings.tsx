import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { 
  UserSecurityInfo, 
  changePassword, 
  requestEmailVerification,
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  TwoFactorSetupResponse,
  getUserSessions,
  deleteSession,
  deleteAllSessions,
  UserSession
} from '../../api/account';
import { getErrorMessage } from '../../api/apiErrors';
import { getRelativeTime } from '../../utils/dateUtils';

interface SecuritySettingsProps {
  securityInfo: UserSecurityInfo;
  onUpdateSuccess: () => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ securityInfo, onUpdateSuccess }) => {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Email verification state
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [emailVerificationError, setEmailVerificationError] = useState<string | null>(null);

  // Two-factor authentication state
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [disableTwoFactorDialogOpen, setDisableTwoFactorDialogOpen] = useState(false);
  const [disableTwoFactorCode, setDisableTwoFactorCode] = useState('');
  const [backupCodesDialogOpen, setBackupCodesDialogOpen] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // General state
  const [loading, setLoading] = useState(false);

  // Load user sessions
  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const response = await getUserSessions();
      setSessions(response.data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setSessionsError('Failed to load active sessions. Please try again.');
    } finally {
      setSessionsLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onUpdateSuccess();
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setPasswordError(getErrorMessage(err, 'Failed to change password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle email verification request
  const handleRequestEmailVerification = async () => {
    setEmailVerificationSent(false);
    setEmailVerificationError(null);
    setLoading(true);

    try {
      await requestEmailVerification(securityInfo.email);
      setEmailVerificationSent(true);
    } catch (err: any) {
      console.error('Failed to request email verification:', err);
      setEmailVerificationError(getErrorMessage(err, 'Failed to send verification email. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Two-factor authentication
  const handleSetupTwoFactor = async () => {
    setTwoFactorError(null);
    setLoading(true);

    try {
      const response = await setupTwoFactor();
      setTwoFactorSetup(response.data);
      setTwoFactorDialogOpen(true);
    } catch (err: any) {
      console.error('Failed to setup two-factor auth:', err);
      setTwoFactorError(getErrorMessage(err, 'Failed to setup two-factor authentication. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    setTwoFactorError(null);
    setLoading(true);

    try {
      await verifyTwoFactor(twoFactorCode);
      setTwoFactorDialogOpen(false);
      setTwoFactorCode('');
      setTwoFactorSetup(null);
      onUpdateSuccess();
    } catch (err: any) {
      console.error('Failed to verify two-factor code:', err);
      setTwoFactorError(getErrorMessage(err, 'Invalid verification code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    setTwoFactorError(null);
    setLoading(true);

    try {
      await disableTwoFactor(disableTwoFactorCode);
      setDisableTwoFactorDialogOpen(false);
      setDisableTwoFactorCode('');
      onUpdateSuccess();
    } catch (err: any) {
      console.error('Failed to disable two-factor auth:', err);
      setTwoFactorError(getErrorMessage(err, 'Invalid verification code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Session management
  const handleDeleteSession = async (sessionId: number) => {
    setSessionsError(null);
    try {
      await deleteSession(sessionId);
      loadSessions(); // Reload sessions
    } catch (err: any) {
      console.error('Failed to delete session:', err);
      setSessionsError(getErrorMessage(err, 'Failed to delete session. Please try again.'));
    }
  };

  const handleDeleteAllSessions = async () => {
    setSessionsError(null);
    try {
      await deleteAllSessions(true); // Keep current session
      loadSessions(); // Reload sessions
    } catch (err: any) {
      console.error('Failed to delete all sessions:', err);
      setSessionsError(getErrorMessage(err, 'Failed to delete sessions. Please try again.'));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-primary mb-6">Security Settings</h2>

      {/* Password Management Section */}
      <Card 
        title="Password Management" 
        className="mb-6 bg-surface border-none shadow"
        titleColor="text-primary"
        headerBorderColor="border-border"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4 pb-4 border-b border-border">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-primary mb-1">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              className="w-full rounded-md bg-surface-light border border-border px-3 py-2 text-text-muted placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-primary mb-1">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                className="w-full rounded-md bg-surface-light border border-border px-3 py-2 text-text-muted placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-text-muted opacity-80">Password must be at least 8 characters long</p>
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-primary mb-1">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="w-full rounded-md bg-surface-light border border-border px-3 py-2 text-text-muted placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          {passwordError && (
            <Alert variant="error" message={passwordError} onDismiss={() => setPasswordError(null)} />
          )}
          
          {passwordSuccess && (
            <Alert variant="success" message={passwordSuccess} onDismiss={() => setPasswordSuccess(null)} />
          )}
          
          <div>
            <Button
              type="submit"
              variant="darkbackground"
              disabled={loading}
              isLoading={loading}
              className="bg-primary text-text hover:bg-primary-light"
            >
              Change Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Email Verification Section */}
      <Card 
        title="Email Verification" 
        className="mb-6 bg-surface border-none shadow"
        titleColor="text-primary"
        headerBorderColor="border-border"
      >
        <div className="mb-4 pb-4 border-b border-border">
          <div className="mb-2">
            <span className="text-text-muted">Email Status:</span>
          </div>
          
          {securityInfo.email_verified ? (
            <Alert
              variant="success"
              message="Your email is verified."
            />
          ) : (
            <Alert
              variant="warning"
              message="Your email is not verified. Please verify your email for additional security."
            />
          )}
        </div>
        
        {!securityInfo.email_verified && (
          <Button
            variant="lightbackground"
            onClick={handleRequestEmailVerification}
            disabled={loading || emailVerificationSent}
            isLoading={loading}
            className="border-primary text-primary hover:bg-surface-light"
          >
            Send Verification Email
          </Button>
        )}
        
        {emailVerificationSent && (
          <Alert
            variant="success"
            message={`Verification email has been sent to ${securityInfo.email}. Please check your inbox.`}
            className="mt-4"
          />
        )}
        
        {emailVerificationError && (
          <Alert
            variant="error"
            message={emailVerificationError}
            onDismiss={() => setEmailVerificationError(null)}
            className="mt-4"
          />
        )}
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card 
        title="Two-Factor Authentication" 
        className="mb-6 bg-surface border-none shadow"
        titleColor="text-primary"
        headerBorderColor="border-border"
      >
        <div className="mb-4 pb-4 border-b border-border">
          <div className="mb-2">
            <span className="text-text-muted">2FA Status:</span>
          </div>
          
          {securityInfo.is_2fa_enabled ? (
            <Alert
              variant="success"
              message="Two-factor authentication is enabled."
            />
          ) : (
            <Alert
              variant="warning"
              message="Two-factor authentication is disabled. Enable it for additional security."
            />
          )}
        </div>
        
        {securityInfo.is_2fa_enabled ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              onClick={() => setDisableTwoFactorDialogOpen(true)}
              disabled={loading}
            >
              Disable Two-Factor Authentication
            </Button>
            
            <Button
              variant="lightbackground"
              onClick={() => setBackupCodesDialogOpen(true)}
              disabled={loading}
              className="border-primary text-primary hover:bg-surface-light"
            >
              View Backup Codes
            </Button>
          </div>
        ) : (
          <Button
            variant="darkbackground"
            onClick={handleSetupTwoFactor}
            disabled={loading}
            isLoading={loading}
            className="bg-primary text-text hover:bg-primary-light"
          >
            Enable Two-Factor Authentication
          </Button>
        )}
        
        {twoFactorError && (
          <Alert
            variant="error"
            message={twoFactorError}
            onDismiss={() => setTwoFactorError(null)}
            className="mt-4"
          />
        )}
      </Card>

      {/* Active Sessions Section */}
      <Card 
        title="Active Sessions" 
        className="bg-surface border-none shadow"
        titleColor="text-primary"
        headerBorderColor="border-border"
      >
        <div className="mb-4 pb-4 border-b border-border">
          <p className="text-text-muted mb-4">
            See all devices where you're currently logged in. You can log out of other sessions if you don't recognize them.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="lightbackground"
              onClick={loadSessions}
              disabled={sessionsLoading}
              isLoading={sessionsLoading}
              className="border-primary text-primary hover:bg-surface-light"
            >
              {sessions.length === 0 ? 'Load Sessions' : 'Refresh Sessions'}
            </Button>
            
            {sessions.length > 0 && (
              <Button
                variant="danger"
                onClick={handleDeleteAllSessions}
                disabled={sessionsLoading}
              >
                Log Out From All Other Devices
              </Button>
            )}
          </div>
        </div>
        
        {sessionsError && (
          <Alert
            variant="error"
            message={sessionsError}
            onDismiss={() => setSessionsError(null)}
            className="mb-4"
          />
        )}
        
        {sessions.length > 0 ? (
          <div className="border border-border rounded-md divide-y divide-border">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-primary">{session.device_info || 'Unknown Device'}</div>
                  <div className="text-sm text-text-muted opacity-80">
                    IP: {session.ip_address || 'Unknown'} • Last active: {getRelativeTime(session.last_active_at)}
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => handleDeleteSession(session.id)}
                >
                  Log Out
                </Button>
              </div>
            ))}
          </div>
        ) : !sessionsLoading && (
          <Alert
            variant="info"
            message="No active sessions found. Click 'Load Sessions' to check your current sessions."
          />
        )}
      </Card>

      {/* Two-Factor Setup Dialog */}
      {twoFactorDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface text-text-muted rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-primary">Set Up Two-Factor Authentication</h3>
            </div>
            
            <div className="px-6 py-4">
              {twoFactorSetup && (
                <div className="space-y-4">
                  <p className="text-text-muted">1. Scan this QR code with your authenticator app:</p>
                  
                  <div className="flex justify-center my-6">
                    <img src={twoFactorSetup.qr_code_url} alt="QR Code" className="max-w-[250px]" />
                  </div>
                  
                  <p className="text-text-muted">2. If you can't scan the QR code, use this secret key:</p>
                  
                  <div className="bg-surface-light p-3 rounded font-mono break-all text-text-muted">
                    {twoFactorSetup.secret}
                  </div>
                  
                  <p className="text-text-muted">3. Enter the 6-digit code from your authenticator app:</p>
                  
                  <input
                    type="text"
                    className="w-full rounded-md bg-surface-light border border-border px-3 py-2 text-text-muted placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    maxLength={6}
                    placeholder="000000"
                  />
                  
                  <div>
                    <h4 className="font-bold text-primary">Save your backup codes in a secure place:</h4>
                    <p className="text-yellow-500 text-sm">
                      These codes will only be shown once. Use them to log in if you lose access to your authenticator app.
                    </p>
                    
                    <div className="bg-surface-light p-3 rounded mt-2 grid grid-cols-2 gap-2">
                      {twoFactorSetup.backup_codes.map((code, index) => (
                        <div key={index} className="font-mono text-sm text-text-muted">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {twoFactorError && (
                    <Alert
                      variant="error"
                      message={twoFactorError}
                      onDismiss={() => setTwoFactorError(null)}
                    />
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 py-3 bg-surface-light border-t border-border flex justify-end space-x-2">
              <Button
                variant="lightbackground"
                onClick={() => setTwoFactorDialogOpen(false)}
                className="border-primary text-primary hover:bg-surface-light"
              >
                Cancel
              </Button>
              <Button
                variant="darkbackground"
                onClick={handleVerifyTwoFactor}
                disabled={twoFactorCode.length !== 6 || loading}
                isLoading={loading}
                className="bg-primary text-text hover:bg-primary-light"
              >
                Verify and Enable
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Disable Two-Factor Dialog */}
      {disableTwoFactorDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface text-text-muted rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-primary">Disable Two-Factor Authentication</h3>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-text-muted mb-4">
                To disable two-factor authentication, please enter a verification code from your authenticator app.
              </p>
              
              <input
                type="text"
                className="w-full rounded-md bg-surface-light border border-border px-3 py-2 text-text-muted placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={disableTwoFactorCode}
                onChange={(e) => setDisableTwoFactorCode(e.target.value)}
                maxLength={6}
                placeholder="000000"
              />
              
              {twoFactorError && (
                <Alert
                  variant="error"
                  message={twoFactorError}
                  onDismiss={() => setTwoFactorError(null)}
                  className="mt-4"
                />
              )}
            </div>
            
            <div className="px-6 py-3 bg-surface-light border-t border-border flex justify-end space-x-2">
              <Button
                variant="lightbackground"
                onClick={() => setDisableTwoFactorDialogOpen(false)}
                className="border-primary text-primary hover:bg-surface-light"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDisableTwoFactor}
                disabled={disableTwoFactorCode.length !== 6 || loading}
                isLoading={loading}
              >
                Disable 2FA
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Dialog */}
      {backupCodesDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface text-text-muted rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-primary">Backup Codes</h3>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-text-muted">
                You need to disable and re-enable two-factor authentication to view new backup codes.
              </p>
            </div>
            
            <div className="px-6 py-3 bg-surface-light border-t border-border flex justify-end">
              <Button
                variant="lightbackground"
                onClick={() => setBackupCodesDialogOpen(false)}
                className="border-primary text-primary hover:bg-surface-light"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings; 
