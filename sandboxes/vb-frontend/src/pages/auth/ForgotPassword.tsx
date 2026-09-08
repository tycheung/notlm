import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../api/apiErrors';
import { AuthAPI } from '../../api/auth';
import { useForm } from '../../hooks/useForm';
import AuthLayout from '../../components/layout/AuthLayout';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb } from '../../utils/breadcrumbBuilders';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

// Initial form state
const initialState = {
  email: '',
};

// Validation rules
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
  ]
});

const ForgotPassword: React.FC = () => {
  const {
    values,
    handleChange,
    fieldErrors,
    isSubmitting,
    setFieldRules,
    handleSubmit,
    resetForm
  } = useForm(initialState);
  
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Set validation rules
  useEffect(() => {
    const rules = createValidationRules();
    Object.keys(rules).forEach(field => {
      setFieldRules(field as keyof typeof initialState, rules[field as keyof typeof rules]);
    });
  }, [setFieldRules]);

  // Form submission handler
  const onSubmit = async () => {
    setApiError(null);
    
    try {
      await AuthAPI.requestPasswordReset({
        email: values.email,
      });
      setSuccess(true);
    } catch (error: any) {
      // Handle API errors
      setApiError(
        getErrorMessage(error, 'Unable to process your request. Please try again later.')
      );
    }
  };

  const handleTryAgain = () => {
    setSuccess(false);
    setApiError(null);
    resetForm();
  };

  return (
    <AuthLayout 
      title="Forgot Password" 
      subtitle="We'll send a password reset link to your email"
    >
      <Breadcrumb items={[homeCrumb(), { label: 'Forgot password' }]} className="mb-4" />
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
          <h3 className="mt-3 text-lg font-medium text-text-muted">Check your email</h3>
          <p className="mt-2 text-sm text-text-muted">
            We've sent a password reset link to {values.email}. Please check your inbox and follow the instructions to reset your password.
          </p>
          <div className="mt-6">
            <Button
              onClick={handleTryAgain}
              variant="lightbackground"
              size="small"
            >
              Try another email
            </Button>
          </div>
          <div className="mt-4">
            <Link
              to="/login"
              className="text-sm text-text-muted hover:text-text-muted"
            >
              Back to login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              variant="darkbackground"
              fullWidth
            >
              Send Reset Link
            </Button>
          </div>

          <div className="text-center mt-4">
            <Link
              to="/login"
              className="text-sm text-text-muted hover:text-text-muted"
            >
              Back to login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
