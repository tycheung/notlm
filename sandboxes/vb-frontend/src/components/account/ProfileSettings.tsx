import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { useForm } from '../../hooks/useForm';
import Input from '../../components/common/Input';
import { UserRead, Role } from '../../types/user';
import { UsersAPI } from '../../api/users';
import { formatDirectorIdentity } from '../../utils/directorIdentity';
import { formatDateNaive } from '../../utils/dateUtils';
import { getCurrentTimezoneNaiveISO } from '../../utils/dateUtils';
import ReportInaccurateScores from './ReportInaccurateScores';

interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  usbc_id: string;
  display_name: string;
}

interface ProfileSettingsProps {
  user: UserRead;
  updateUser: (updatedUser: UserRead) => void;
  onUpdateSuccess: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, updateUser, onUpdateSuccess }) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canSetDisplayName = user.role === Role.TD || user.role === Role.ADMIN;
  
  // Profile form setup
  const initialFormValues: UserFormData = {
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    usbc_id: user?.usbc_id || '',
    display_name: user?.display_name || '',
  };
  
  const {
    values: formData,
    handleChange,
    setValues,
    handleSubmit,
    fieldErrors,
    formError,
    setFormError,
    isSubmitting,
    setFieldRules,
    validateForm
  } = useForm<UserFormData>(initialFormValues);

  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      setValues({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        usbc_id: user.usbc_id || '',
        display_name: user.display_name || '',
      });
    }
  }, [user, setValues]);

  // Setup validation rules
  useEffect(() => {
    // First name validation
    setFieldRules('first_name', [
      {
        validate: (value) => !!value.trim(),
        message: 'First name is required'
      }
    ]);
    
    // Last name validation
    setFieldRules('last_name', [
      {
        validate: (value) => !!value.trim(),
        message: 'Last name is required'
      }
    ]);
    
    // Email validation
    setFieldRules('email', [
      {
        validate: (value) => !!value.trim(),
        message: 'Email is required'
      },
      {
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Please enter a valid email address'
      }
    ]);
  }, [setFieldRules]);
  
  // Form submission handler for profile
  const onSubmitProfileForm = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      const saved = await UsersAPI.updateCurrentUser({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        usbc_id: formData.usbc_id || undefined,
        ...(canSetDisplayName
          ? { display_name: formData.display_name.trim() || null }
          : {}),
      });

      if (user && saved.usbc_id !== user.usbc_id) {
        const verificationWarning = 'You updated your USBC ID. Your account will need to be re-verified by an administrator.';
        setSuccessMessage(`Profile updated successfully. ${verificationWarning}`);
      } else {
        setSuccessMessage('Profile updated successfully');
      }

      updateUser(saved);
      setIsEditingProfile(false);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

      onUpdateSuccess();
    } catch (error) {
      setFormError('Failed to update profile. Please try again.');
    }
  };

  // Format today's date using naive formatting
  const formatDate = () => {
    const todayString = getCurrentTimezoneNaiveISO();
    return formatDateNaive(todayString);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-primary mb-6">Profile</h2>
      
      {successMessage && (
        <Alert
          variant="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
          className="mb-4"
        />
      )}
      
      {!isEditingProfile ? (
        // View mode
        <div className="bg-surface rounded-lg overflow-hidden shadow p-6">
          <div className="pb-6 mb-6 border-b border-border">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-primary mb-1">
                  {user.first_name} {user.last_name}
                </h2>
                {canSetDisplayName && user.display_name ? (
                  <p className="text-text text-sm mb-1">
                    Public identity: {formatDirectorIdentity(user)}
                  </p>
                ) : null}
                <p className="text-text-muted text-sm">{formatDate()}</p>
              </div>
              <Button
                type="button"
                variant="darkbackground"
                size="medium"
                onClick={() => setIsEditingProfile(true)}
              >
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Personal Info Section */}
            <div className="pb-6 border-b border-border">
              <h3 className="text-lg font-medium text-primary mb-4">Personal Information</h3>
              <div className="space-y-3">
                <p className="text-text-muted flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  {user.email}
                </p>
                <p className="text-text-muted flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  {user.usbc_id || 'Not provided'}
                  {!user.is_verified && (
                    <span className="text-yellow-500 text-sm ml-2">(Pending verification)</span>
                  )}
                </p>
                <p className="text-text-muted flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {user.phone || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Edit mode
        <div className="bg-surface rounded-lg overflow-hidden shadow">
          <form onSubmit={handleSubmit(onSubmitProfileForm)} className="p-6">
            <h2 className="text-xl font-bold text-primary mb-6">Edit Profile</h2>
            
            {formError && (
              <Alert
                variant="error"
                message={formError}
                onDismiss={() => setFormError(null)}
                className="mb-4"
              />
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="first_name"
                  name="first_name"
                  label="First Name"
                  value={formData.first_name}
                  onChange={handleChange}
                  error={fieldErrors.first_name}
                  fullWidth
                  required
                />

                <Input
                  id="last_name"
                  name="last_name"
                  label="Last Name"
                  value={formData.last_name}
                  onChange={handleChange}
                  error={fieldErrors.last_name}
                  fullWidth
                  required
                />
              </div>

              {canSetDisplayName ? (
                <Input
                  id="display_name"
                  name="display_name"
                  label="Display name (optional)"
                  value={formData.display_name}
                  onChange={handleChange}
                  error={fieldErrors.display_name}
                  fullWidth
                  helperText="Shown with your legal name on tournament lists and reports — for example, Victory Events (Jane Smith). You cannot hide your legal name."
                />
              ) : null}

              <Input
                id="email"
                name="email"
                type="email"
                label="Email"
                value={formData.email}
                onChange={handleChange}
                error={fieldErrors.email}
                fullWidth
                required
              />

              <Input
                id="usbc_id"
                name="usbc_id"
                label="USBC ID"
                value={formData.usbc_id}
                onChange={handleChange}
                error={fieldErrors.usbc_id}
                fullWidth
                helperText="Changing your USBC ID will require re-verification"
              />

              <Input
                id="phone"
                name="phone"
                label="Phone"
                value={formData.phone}
                onChange={handleChange}
                error={fieldErrors.phone}
                fullWidth
              />
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="mt-3 sm:mt-0 whitespace-nowrap px-4 py-2 rounded-md text-sm bg-surface-light text-primary border border-border hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="whitespace-nowrap px-4 py-2 rounded-md text-sm bg-primary text-text hover:bg-primary-light transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ReportInaccurateScores />
    </div>
  );
};

export default ProfileSettings; 
