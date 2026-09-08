import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from '../../hooks/useForm';
import { useAuth } from '../../contexts/AuthContext';

import Input from '../../components/common/Input';
import PasswordInput from '../../components/common/PasswordInput';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Label from '../../components/common/Label';
import Logo from '../../components/common/Logo';
import PageTitle from '../../components/common/PageTitle';
import { getDashboardRoute } from '../../utils/roles';
import { getErrorMessage } from '../../api/apiErrors';

const initialState = {
  email: '',
  password: '',
};

const createValidationRules = () => ({
  email: [
    {
      validate: (value: string) => !!value,
      message: 'Email is required'
    },
    {
      validate: (value: string) => /\S+@\S+\.\S+/.test(value),
      message: 'Please enter a valid email'
    }
  ],
  password: [
    {
      validate: (value: string) => !!value,
      message: 'Password is required'
    }
  ]
});

const Login: React.FC = () => {
  const {
    values,
    handleChange,
    fieldErrors,
    isSubmitting,
    setFieldRules,
    handleSubmit
  } = useForm(initialState);

  const [apiError, setApiError] = useState<string | null>(null);
  const [pending2faSessionId, setPending2faSessionId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2fa, setIsVerifying2fa] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, completeTwoFactorLogin, loading } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const redirectTo = queryParams.get('redirect');

  useEffect(() => {
    if (user && !loading) {
      const locationState = location.state as { from?: string };
      const fromLocation = locationState?.from;
      const storedRedirect = localStorage.getItem('redirectAfterLogin');
      const defaultRoute = getDashboardRoute(user.role);
      const targetPath = fromLocation || storedRedirect || redirectTo || defaultRoute;

      if (storedRedirect) {
        localStorage.removeItem('redirectAfterLogin');
      }

      navigate(targetPath, { replace: true });
    }
  }, [user, navigate, redirectTo, loading, location]);

  useEffect(() => {
    const rules = createValidationRules();
    Object.keys(rules).forEach(field => {
      setFieldRules(field as keyof typeof initialState, rules[field as keyof typeof rules]);
    });
  }, [setFieldRules]);

  const onSubmit = async () => {
    setApiError(null);

    try {
      const result = await login(values.email, values.password);
      if (result.status === 'requires_2fa') {
        setPending2faSessionId(result.sessionId);
        setTwoFactorCode('');
      }
    } catch (error: unknown) {
      setApiError(getErrorMessage(error, 'Unable to log in. Please check your credentials and try again.'));
    }
  };

  const onVerifyTwoFactor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending2faSessionId) return;

    setApiError(null);
    setIsVerifying2fa(true);
    try {
      await completeTwoFactorLogin(twoFactorCode.trim(), pending2faSessionId);
      setPending2faSessionId(null);
    } catch (error: unknown) {
      setApiError(getErrorMessage(error, 'Invalid verification code. Please try again.'));
    } finally {
      setIsVerifying2fa(false);
    }
  };

  const backToCredentials = () => {
    setPending2faSessionId(null);
    setTwoFactorCode('');
    setApiError(null);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size="medium" showText={false} linkTo="/" />
        </div>
        <PageTitle as="h2" size="responsive" className="text-center">
          {pending2faSessionId ? 'Two-factor authentication' : 'Sign in to your account'}
        </PageTitle>
        <p className="mt-2 text-center text-sm sm:text-base text-text-muted">
          {pending2faSessionId
            ? 'Enter the code from your authenticator app'
            : 'Welcome back to Victory Bowling'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface border border-border py-8 px-4 sm:px-10 shadow rounded-lg">
          {pending2faSessionId ? (
            <form onSubmit={onVerifyTwoFactor} className="space-y-5">
              {apiError && (
                <Alert
                  variant="error"
                  message={apiError}
                  className="mb-4"
                />
              )}

              <Input
                id="two-factor-code"
                name="two-factor-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                label="Authentication code"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                fullWidth
              />

              <Button
                type="submit"
                disabled={isVerifying2fa || twoFactorCode.trim().length < 6}
                variant="darkbackground"
                fullWidth
                isLoading={isVerifying2fa}
                className="py-3"
              >
                Verify and sign in
              </Button>

              <button
                type="button"
                onClick={backToCredentials}
                className="w-full text-sm text-primary hover:text-text-muted"
              >
                Back to email and password
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {apiError && (
                <Alert
                  variant="error"
                  message={apiError}
                  className="mb-4"
                />
              )}

              <div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  required
                  value={values.email}
                  onChange={handleChange}
                  error={fieldErrors.email}
                  fullWidth
                />
              </div>

              <div>
                <PasswordInput
                  id="password"
                  name="password"
                  label="Password"
                  autoComplete="current-password"
                  required
                  value={values.password}
                  onChange={handleChange}
                  error={fieldErrors.password}
                  fullWidth
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Label className="flex items-center text-sm mb-0 cursor-pointer">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-700 rounded mr-2"
                    />
                    Remember me
                  </Label>
                </div>

                <div className="text-sm">
                  <Link to="/forgot-password" className="font-medium text-primary hover:text-text-muted">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="darkbackground"
                  fullWidth
                  isLoading={isSubmitting}
                  className="py-3"
                >
                  Sign in
                </Button>
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-text-muted">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-medium text-primary hover:text-text-muted">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
