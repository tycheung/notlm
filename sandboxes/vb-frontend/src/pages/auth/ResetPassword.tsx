import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/apiErrors';
import { AuthAPI } from '../../api/auth';
import { useForm } from '../../hooks/useForm';
import AuthLayout from '../../components/layout/AuthLayout';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb } from '../../utils/breadcrumbBuilders';
import { NewPasswordRequest } from '../../types/auth';

// Define types to match the ValidationRule type in useForm
type ValidationRule = {
  validate: (value: any, formValues?: Record<string, any>) => boolean;
  message: string;
};

// Initial form state
const initialState = {
  password: '',
  password_confirm: '',
  token: '',
  email: '',
};

// Validation rules
const createValidationRules = (): Record<string, ValidationRule[]> => ({
  password: [
    {
      validate: (value: any) => !!value,
      message: 'Password is required'
    },
    {
      validate: (value: any) => value.length >= 8,
      message: 'Password must be at least 8 characters'
    }
  ],
  password_confirm: [
    {
      validate: (value: any) => !!value,
      message: 'Please confirm your password'
    },
    {
      validate: (value: any, formValues?: Record<string, any>) => 
        formValues ? value === formValues.password : false,
      message: 'Passwords do not match'
    }
  ],
  token: [
    {
      validate: (value: any) => !!value,
      message: 'Reset token is missing'
    }
  ],
  email: [
    {
      validate: (value: any) => !!value,
      message: 'Email is required'
    },
    {
      validate: (value: any) => /\S+@\S+\.\S+/.test(value),
      message: 'Please enter a valid email'
    }
  ]
});

const ResetPassword: React.FC = () => {
  const {
    values,
    handleChange,
    fieldErrors,
    isSubmitting,
    setFieldRules,
    handleSubmit,
    setValues
  } = useForm(initialState);
  
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkReady, setLinkReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: tokenParam } = useParams<{ token?: string }>();

  // Extract token from URL on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token') || tokenParam || '';
    const email = searchParams.get('email') || '';
    
    if (token && email) {
      setValues({ ...initialState, token, email });
      setApiError(null);
    } else {
      setApiError('Invalid reset link. Please request a new password reset email.');
    }
    setLinkReady(true);
  }, [location, setValues, tokenParam]);

  // Set validation rules
  useEffect(() => {
    const rules = createValidationRules();
    Object.keys(rules).forEach(field => {
      setFieldRules(field as keyof typeof initialState, rules[field]);
    });
  }, [setFieldRules]);

  // Form submission handler
  const onSubmit = async () => {
    setApiError(null);
    
    try {
      // Create request object with the correct field names
      const passwordData: NewPasswordRequest = {
        token: values.token,
        email: values.email,
        password: values.password
      };
      
      await AuthAPI.setNewPassword(passwordData);
      setSuccess(true);
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Password reset successful! You can now log in with your new password.' } 
        });
      }, 3000);
    } catch (error: any) {
      // Handle API errors
      setApiError(
        getErrorMessage(
          error,
          'Unable to reset password. Please try again later or request a new reset link.'
        )
      );
    }
  };

  if (!linkReady) {
    return (
      <AuthLayout
        title="Reset Password"
        subtitle="Create a new password for your account"
      >
        <Breadcrumb items={[homeCrumb(), { label: 'Reset password' }]} className="mb-4" />
        <p className="text-center text-sm text-text-muted">Loading reset link...</p>
      </AuthLayout>
    );
  }

  // If token is missing, show an error with option to request new link
  if ((!values.token || !values.email) && !isSubmitting) {
    return (
      <AuthLayout 
        title="Reset Password" 
        subtitle="Create a new password for your account"
      >
        <Breadcrumb items={[homeCrumb(), { label: 'Reset password' }]} className="mb-4" />
        <div className="bg-danger/15 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          Invalid or missing reset token. Please request a new password reset link.
        </div>
        <div className="text-center">
          <Link
            to="/forgot-password"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-surface hover:bg-surface-light"
          >
            Request New Reset Link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Reset Password" 
      subtitle="Create a new password for your account"
    >
      <Breadcrumb items={[homeCrumb(), { label: 'Reset password' }]} className="mb-4" />
      {success ? (
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-medium text-text">Password Reset Successful</h3>
          <p className="mt-2 text-sm text-text-muted">
            Your password has been updated. Redirecting you to the login page...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {apiError && (
            <div className="bg-danger/15 border border-red-200 text-red-700 px-4 py-3 rounded">
              {apiError}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={values.email}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border ${
                fieldErrors.email ? 'border-red-300' : 'border-border'
              } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-muted">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={values.password}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border ${
                fieldErrors.password ? 'border-red-300' : 'border-border'
              } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {fieldErrors.password && <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>}
          </div>

          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium text-text-muted">
              Confirm New Password
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              value={values.password_confirm}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 border ${
                fieldErrors.password_confirm ? 'border-red-300' : 'border-border'
              } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            />
            {fieldErrors.password_confirm && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password_confirm}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-surface hover:bg-surface-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:text-text-muted"
            >
              Request New Reset Link
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
