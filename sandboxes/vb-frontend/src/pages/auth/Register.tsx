import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getErrorMessage } from '../../api/apiErrors';
import { AuthAPI } from '../../api/auth';
import { useForm } from '../../hooks/useForm';
import AuthLayout from '../../components/layout/AuthLayout';
import { UserCreate } from '../../types/user';
import { Gender, Role } from '../../types/user';
import { getDashboardRoute } from '../../utils/roles';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Label from '../../components/common/Label';
import { useAuth } from '../../contexts/AuthContext';
import ClaimProfileModal from '../../components/auth/ClaimProfileModal';

// Define types to match the ValidationRule type in useForm
type ValidationRule = {
  validate: (value: any, formValues?: Record<string, any>) => boolean;
  message: string;
};

// Initial form state - minimal required fields
const initialState = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  password_confirm: '',
  usbc_id: '',
  gender: Gender.MALE,
  birth_date: '',
};

// Validation rules
const createValidationRules = (): Record<string, ValidationRule[]> => ({
  first_name: [
    {
      validate: (value: any) => !!value,
      message: 'First name is required'
    }
  ],
  last_name: [
    {
      validate: (value: any) => !!value,
      message: 'Last name is required'
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
  ],
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
  usbc_id: [
    {
      validate: (value: any) => !!value,
      message: 'USBC ID is required'
    }
  ],
  birth_date: [
    {
      validate: (value: any) => !!value,
      message: 'Birth date is required'
    }
  ]
});

const Register: React.FC = () => {
  const {
    values,
    handleChange,
    fieldErrors,
    isSubmitting,
    setFieldRules,
    handleSubmit
  } = useForm(initialState);
  
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardRoute(user.role));
    }
  }, [isAuthenticated, user, navigate]);

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
      // Create a user object with all required fields from the backend
      const userData: UserCreate = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        password: values.password,
        usbc_id: values.usbc_id,
        gender: values.gender,
        birth_date: values.birth_date,
        role: Role.BOWLER, // Default role for new users
        mi: null, // Optional
      };
      
      await AuthAPI.register(userData);
      
      // Show success message
      setSuccessMessage('Account created successfully! You will be redirected to the login page.');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Account created successfully! Please log in.' } 
        });
      }, 3000);
    } catch (error: any) {
      // Handle registration errors
      setApiError(
        getErrorMessage(error, 'Unable to register. Please try again with different information.')
      );
    }
  };

  const handleClaimSuccess = (response: any) => {
    window.alert(response.message);
    setSuccessMessage(response.message);
    setTimeout(() => {
      navigate('/login', { 
        state: { message: response.message } 
      });
    }, 3000);
  };

  return (
    <AuthLayout 
      title="Create an Account" 
      subtitle="Join Victory Bowling to manage your bowling tournaments"
    >
      {successMessage ? (
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
          <h3 className="mt-3 text-lg font-medium text-primary">Registration Successful</h3>
          <p className="mt-2 text-sm text-text">
            {successMessage}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {apiError && (
            <Alert
              variant="error"
              message={apiError}
              className="mb-4"
            />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                id="first_name"
                name="first_name"
                label="First Name *"
                required
                value={values.first_name}
                onChange={handleChange}
                error={fieldErrors.first_name}
                fullWidth
              />
            </div>

            <div>
              <Input
                id="last_name"
                name="last_name"
                label="Last Name *"
                required
                value={values.last_name}
                onChange={handleChange}
                error={fieldErrors.last_name}
                fullWidth
              />
            </div>
          </div>

          <div>
            <Input
              id="email"
              name="email"
              type="email"
              label="Email *"
              autoComplete="email"
              required
              value={values.email}
              onChange={handleChange}
              error={fieldErrors.email}
              fullWidth
            />
          </div>

          <div>
            <Input
              id="usbc_id"
              name="usbc_id"
              label="USBC ID *"
              required
              value={values.usbc_id}
              onChange={handleChange}
              error={fieldErrors.usbc_id}
              fullWidth
            />
          </div>

          <div>
            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              label="Birth Date *"
              required
              value={values.birth_date}
              onChange={handleChange}
              error={fieldErrors.birth_date}
              fullWidth
            />
          </div>

          <div>
            <Label htmlFor="gender" className="mb-1" required>
              Gender
            </Label>
            <select
              id="gender"
              name="gender"
              value={values.gender}
              onChange={handleChange}
              className="w-full bg-surface-light text-text border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value={Gender.MALE}>Male</option>
              <option value={Gender.FEMALE}>Female</option>
              <option value={Gender.OTHER}>Other</option>
            </select>
          </div>

          <div>
            <Input
              id="password"
              name="password"
              type="password"
              label="Password *"
              required
              value={values.password}
              onChange={handleChange}
              error={fieldErrors.password}
              fullWidth
            />
          </div>

          <div>
            <Input
              id="password_confirm"
              name="password_confirm"
              type="password"
              label="Confirm Password *"
              required
              value={values.password_confirm}
              onChange={handleChange}
              error={fieldErrors.password_confirm}
              fullWidth
            />
          </div>

          <div className="mt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              variant="darkbackground"
              fullWidth
            >
              Create account
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-text-muted">
              Already have a USBC ID profile created for you?{' '}
              <button
                type="button"
                onClick={() => setShowClaimModal(true)}
                className="text-primary hover:text-primary-light font-medium"
              >
                Claim your existing profile
              </button>
            </p>
          </div>
        </form>
      )}

      <ClaimProfileModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onSuccess={handleClaimSuccess}
      />
    </AuthLayout>
  );
};

export default Register;
