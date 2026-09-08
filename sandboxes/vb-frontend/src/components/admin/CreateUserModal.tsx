import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';
import { useForm } from '../../hooks/useForm';
import { getErrorMessage } from '../../api/apiErrors';
import { UsersAPI } from '../../api/users';
import { Role, Gender, UserCreate, UserRead } from '../../types/user';
import { formatISO } from 'date-fns';
import AdminUserSubscriptionSection, {
  applySubscriptionDraft,
  emptySubscriptionDraft,
  PendingSubscriptionDraft,
} from './AdminUserSubscriptionSection';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdUser?: UserRead) => void;
  isTournamentDirector?: boolean;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isTournamentDirector = false
}) => {
  const [subscriptionDraft, setSubscriptionDraft] = useState<PendingSubscriptionDraft>(
    emptySubscriptionDraft
  );

  // Initialize form with empty values
  const initialValues: UserCreate = {
    first_name: '',
    last_name: '',
    mi: '',
    email: '',
    password: '',
    usbc_id: '',
    phone: '',
    gender: Gender.MALE,
    birth_date: formatISO(new Date(), { representation: 'date' }),
    role: Role.BOWLER,
    is_active: true,
  };

  const { 
    values, 
    handleChange, 
    setValues,
    handleSubmit, 
    fieldErrors, 
    setFieldRules, 
    formError, 
    setFormError,
    isSubmitting,
    resetForm
  } = useForm<UserCreate>(initialValues);

  // Generate random password for TD user creation
  useEffect(() => {
    if (isTournamentDirector && isOpen) {
      // Generate a secure random password
      const randomPassword = Array(16)
        .fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*')
        .map(x => x[Math.floor(Math.random() * x.length)])
        .join('');
      
      // Update password in the form values
      setValues(prev => ({
        ...prev,
        password: randomPassword
      }));
    }
  }, [isTournamentDirector, isOpen, setValues]);

  // Set up validation rules
  useEffect(() => {
    setFieldRules('first_name', [
      { validate: value => Boolean(value), message: 'First name is required' }
    ]);
    
    setFieldRules('last_name', [
      { validate: value => Boolean(value), message: 'Last name is required' }
    ]);
    
    if (isTournamentDirector) {
      setFieldRules('email', [
        {
          validate: (value) => {
            const v = String(value || '').trim();
            if (!v) return true;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          },
          message: 'Please enter a valid email address',
        },
      ]);
      setFieldRules('usbc_id', []);
      setFieldRules('password', []);
    } else {
      setFieldRules('email', [
        { validate: value => Boolean(value), message: 'Email is required' },
        {
          validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
          message: 'Please enter a valid email address',
        },
      ]);
      setFieldRules('password', [
        { validate: value => Boolean(value), message: 'Password is required' },
        {
          validate: value => value.length >= 8,
          message: 'Password must be at least 8 characters long',
        },
      ]);
      setFieldRules('usbc_id', [
        { validate: value => Boolean(value), message: 'USBC ID is required' },
      ]);
    }
  }, [setFieldRules, isTournamentDirector]);

  // Handle form submission
  const submitForm = async () => {
    try {
      let createdUser;
      
      if (isTournamentDirector) {
        const trimmedUsbc = (values.usbc_id || '').trim();
        const trimmedEmail = (values.email || '').trim();
        const userData = {
          ...values,
          email: trimmedEmail || undefined,
          send_welcome_email: Boolean(trimmedEmail),
          usbc_id: trimmedUsbc || undefined,
        };
        createdUser = await UsersAPI.createUserByTD(userData);
      } else {
        const payload = { ...values, role: Role.BOWLER };
        createdUser = await UsersAPI.createUserByAdmin(payload);
        if (createdUser?.id) {
          await applySubscriptionDraft(createdUser.id, subscriptionDraft);
        }
      }
      
      resetForm();
      setSubscriptionDraft(emptySubscriptionDraft());
      onSuccess(createdUser);
      onClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setFormError(getErrorMessage(error, 'Failed to create user. Please try again.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New User"
      size="large"
      closeOnOutsideClick={false}
    >
      <form onSubmit={handleSubmit(submitForm)}>
        {formError && (
          <div className="mb-4 p-3 bg-danger/15 text-red-700 rounded border border-red-200">
            {formError}
          </div>
        )}
        
        {isTournamentDirector && (
          <div className="mb-4 p-3 bg-surface-light rounded border border-border">
            <p className="text-sm text-text-muted">
              With an email, a set-password link is sent (you will not see the temporary
              password). Leave email blank to create a temporary bowler record — same as
              CSV import with no USBC ID (a temporary ID is assigned if USBC is also
              omitted).
            </p>
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Input
              label={isTournamentDirector ? 'Email (optional)' : 'Email'}
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              error={fieldErrors.email}
              required={!isTournamentDirector}
            />
          </div>
          
          {!isTournamentDirector && (
            <div>
              <Input
                label="Password"
                name="password"
                type="password"
                value={values.password}
                onChange={handleChange}
                error={fieldErrors.password}
                required
              />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Input
              label={isTournamentDirector ? 'USBC ID (optional)' : 'USBC ID'}
              name="usbc_id"
              value={values.usbc_id}
              onChange={handleChange}
              error={fieldErrors.usbc_id}
              required={!isTournamentDirector}
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
          <p className="text-sm text-text-muted italic mb-2">
            Note: Bowling averages (lifetime, 1-year, 90-day, and 50-game) are calculated from game scores after the user participates in tournaments.
          </p>
        </div>
        
        {!isTournamentDirector && (
          <>
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

            <AdminUserSubscriptionSection
              draftMode
              draft={subscriptionDraft}
              onDraftChange={setSubscriptionDraft}
              disabled={isSubmitting}
            />
          </>
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
            Create User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal; 
