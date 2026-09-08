import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb } from '../../utils/breadcrumbBuilders';
import { AuthAPI } from '../../api/auth';
import { getErrorMessage } from '../../api/apiErrors';

const VerifyEmail: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('Verifying your email address...');

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  useEffect(() => {
    const run = async () => {
      if (!token || !email) {
        setIsSuccess(false);
        setMessage('Invalid verification link. Please request a new verification email.');
        setIsLoading(false);
        return;
      }

      try {
        await AuthAPI.verifyEmail(token, email);
        setIsSuccess(true);
        setMessage('Your email has been verified. You can now sign in.');
      } catch (error: unknown) {
        setIsSuccess(false);
        setMessage(getErrorMessage(error, 'Email verification failed. Please request a new link.'));
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [email, token]);

  return (
    <AuthLayout title="Email Verification" subtitle="Confirm your account email">
      <Breadcrumb items={[homeCrumb(), { label: 'Verify email' }]} className="mb-4" />
      <div className="text-center">
        <h3 className="mt-3 text-lg font-medium text-text">{message}</h3>
        {isLoading ? (
          <p className="mt-2 text-sm text-text-muted">Please wait...</p>
        ) : (
          <div className="mt-6 space-y-3">
            <Link to="/login" className="text-sm text-primary hover:text-text-muted">
              {isSuccess ? 'Go to login' : 'Back to login'}
            </Link>
            {!isSuccess && (
              <div>
                <Link to="/account" className="text-sm text-primary hover:text-text-muted">
                  Open account settings
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
