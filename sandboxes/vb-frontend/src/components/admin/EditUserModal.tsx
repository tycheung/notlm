import React, { useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';
import { useForm } from '../../hooks/useForm';
import { getErrorMessage } from '../../api/apiErrors';
import { UsersAPI } from '../../api/users';
import { Role, Gender, UserUpdate, UserRead } from '../../types/user';
import { formatISO } from 'date-fns';
import AdminUserSubscriptionSection from './AdminUserSubscriptionSection';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserRead | null;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user
}) => {
  // Initialize form with empty values or user values if available
  const initialValues: UserUpdate = {
    first_name: '',
    last_name: '',
    display_name: '',
    mi: '',
    email: '',
    usbc_id: '',
    phone: '',
    gender: Gender.MALE,
    birth_date: formatISO(new Date(), { representation: 'date' }),
    role: Role.BOWLER,
    average_lifetime_score: null,
    average_365day_score: null,
    average_90day_score: null,
    average_50games_score: null,
    is_active: true,
    is_verified: false,
  };

  const { 
    values, 
    handleChange, 
    handleSubmit, 
    fieldErrors, 
    setFieldRules, 
    formError, 
    setFormError,
    isSubmitting,
    resetForm,
    setValues
  } = useForm<UserUpdate>(initialValues);

  // Load user data when user prop changes
  useEffect(() => {
    if (user) {
      setValues({
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: user.display_name || '',
        mi: user.mi || '',
        email: user.email,
        usbc_id: user.usbc_id,
        phone: user.phone || '',
        gender: user.gender,
        birth_date: user.birth_date || formatISO(new Date(), { representation: 'date' }),
        role: user.role,
        average_lifetime_score: user.average_lifetime_score,
        average_365day_score: user.average_365day_score,
        average_90day_score: user.average_90day_score,
        average_50games_score: user.average_50games_score,
        is_active: user.is_active,
        is_verified: user.is_verified,
        password: '' // Empty password field since we don't want to update password by default
      });
    }
  }, [user, setValues]);

  // Set up validation rules
  useEffect(() => {
    setFieldRules('first_name', [
      { validate: (value: string | undefined) => Boolean(value), message: 'First name is required' }
    ]);
    
    setFieldRules('last_name', [
      { validate: (value: string | undefined) => Boolean(value), message: 'Last name is required' }
    ]);
    
    setFieldRules('email', [
      { validate: (value: string | undefined) => Boolean(value), message: 'Email is required' },
      { 
        validate: (value: string | undefined) => value ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : false, 
        message: 'Please enter a valid email address' 
      }
    ]);
    
    setFieldRules('password', [
      { 
        validate: (value: string | undefined) => !value || value.length >= 8, 
        message: 'Password must be at least 8 characters long or empty to keep current password' 
      }
    ]);
    
    setFieldRules('usbc_id', [
      { validate: (value: string | undefined) => Boolean(value), message: 'USBC ID is required' }
    ]);
  }, [setFieldRules]);

  // Handle form submission
  const submitForm = async () => {
    if (!user) return;
    
    try {
      // Remove empty password to avoid changing it if not intended
      const dataToSubmit = { ...values };
      if (!dataToSubmit.password) {
        delete dataToSubmit.password;
      }
      if (typeof dataToSubmit.display_name === 'string') {
        dataToSubmit.display_name = dataToSubmit.display_name.trim() || null;
      }
      // Role is managed by the Subscription section APIs.
      delete dataToSubmit.role;
      
      await UsersAPI.updateUser(user.id, dataToSubmit);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      setFormError(getErrorMessage(error, 'Failed to update user. Please try again.'));
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User"
      size="large"
      closeOnOutsideClick={false}
    >
      <form onSubmit={handleSubmit(submitForm)}>
        {formError && (
          <div className="mb-4 p-3 bg-danger/15 text-red-700 rounded border border-red-200">
            {formError}
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Input
              label="First Name"
              name="first_name"
              value={values.first_name}
              onChange={handleChange}
              error={fieldErrors.first_name}
              required
            />
          </div>
          
          <div>
            <Input
              label="Middle Initial (Optional)"
              name="mi"
              value={values.mi || ''}
              onChange={handleChange}
              maxLength={1}
            />
          </div>
          
          <div>
            <Input
              label="Last Name"
              name="last_name"
              value={values.last_name}
              onChange={handleChange}
              error={fieldErrors.last_name}
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <Input
            label="Display name (optional)"
            name="display_name"
            value={values.display_name || ''}
            onChange={handleChange}
            helperText="For tournament directors: shown with the legal name on lists and reports."
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Input
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              error={fieldErrors.email}
              required
            />
          </div>
          
          <div>
            <Input
              label="Password (leave empty to keep current)"
              name="password"
              type="password"
              value={values.password || ''}
              onChange={handleChange}
              error={fieldErrors.password}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Input
              label="USBC ID"
              name="usbc_id"
              value={values.usbc_id}
              onChange={handleChange}
              error={fieldErrors.usbc_id}
              required
            />
          </div>
          
          <div>
            <Input
              label="Phone (Optional)"
              name="phone"
              value={values.phone || ''}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Gender
            </label>
            <select
              name="gender"
              value={values.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value={Gender.MALE}>Male</option>
              <option value={Gender.FEMALE}>Female</option>
              <option value={Gender.OTHER}>Other</option>
            </select>
          </div>
          
          <div>
            <Input
              label="Birth Date"
              name="birth_date"
              type="date"
              value={values.birth_date}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-muted mb-3">System-Calculated Averages (Read-Only)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Input
                label="Lifetime Average"
                name="average_lifetime_score"
                type="number"
                value={values.average_lifetime_score === null ? '' : values.average_lifetime_score}
                disabled={true}
              />
            </div>
            <div>
              <Input
                label="1-Year Average"
                name="average_365day_score"
                type="number"
                value={values.average_365day_score === null ? '' : values.average_365day_score}
                disabled={true}
              />
            </div>
            <div>
              <Input
                label="90-Day Average"
                name="average_90day_score"
                type="number"
                value={values.average_90day_score === null ? '' : values.average_90day_score}
                disabled={true}
              />
            </div>
            <div>
              <Input
                label="Last 50 Games Average"
                name="average_50games_score"
                type="number"
                value={values.average_50games_score === null ? '' : values.average_50games_score}
                disabled={true}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <Label className="flex items-center text-sm mb-0 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={values.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
            />
            User is active
          </Label>
        </div>
        
        <div className="flex items-center mb-4">
          <Label className="flex items-center text-sm mb-0 cursor-pointer">
            <input
              type="checkbox"
              name="is_verified"
              id="is_verified"
              checked={values.is_verified}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
            />
            User is verified
          </Label>
        </div>

        {user && (
          <AdminUserSubscriptionSection
            userId={user.id}
            currentRole={user.role}
            initialBilling={user.billing ?? null}
            disabled={isSubmitting}
          />
        )}
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="lightbackground"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          <Button
            variant="darkbackground"
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal; 
