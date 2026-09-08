import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { useForm } from '../../hooks/useForm';
import { getErrorMessage } from '../../api/apiErrors';
import { UsersAPI } from '../../api/users';
import { Role, UserCreateMinimal, UserRead } from '../../types/user';
import AdminUserSubscriptionSection, {
  applySubscriptionDraft,
  emptySubscriptionDraft,
  PendingSubscriptionDraft,
} from './AdminUserSubscriptionSection';

interface CreateMinimalUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdUser?: UserRead) => void;
}

const CreateMinimalUserModal: React.FC<CreateMinimalUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [subscriptionDraft, setSubscriptionDraft] = useState<PendingSubscriptionDraft>(
    emptySubscriptionDraft
  );
  
  const initialValues: UserCreateMinimal = {
    usbc_id: '',
    first_name: '',
    last_name: '',
    role: Role.BOWLER,
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
    resetForm
  } = useForm<UserCreateMinimal>(initialValues);

  React.useEffect(() => {
    setFieldRules('usbc_id', [
      { validate: value => Boolean(value), message: 'USBC ID is required' }
    ]);
    
    setFieldRules('first_name', [
      { validate: value => Boolean(value), message: 'First name is required' }
    ]);
    
    setFieldRules('last_name', [
      { validate: value => Boolean(value), message: 'Last name is required' }
    ]);
  }, [setFieldRules]);

  const submitForm = async () => {
    setFormError(null);
    
    try {
      const createdUser = await UsersAPI.createMinimalUser({
        ...values,
        role: Role.BOWLER,
      });
      if (createdUser?.id) {
        await applySubscriptionDraft(createdUser.id, subscriptionDraft);
      }
      resetForm();
      setSubscriptionDraft(emptySubscriptionDraft());
      onSuccess(createdUser);
      onClose();
    } catch (error: any) {
      console.error('Error creating minimal user:', error);
      setFormError(getErrorMessage(error, 'Failed to create user. Please try again.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Minimal User Profile"
      size="medium"
      closeOnOutsideClick={false}
    >
      <form onSubmit={handleSubmit(submitForm)}>
        {formError && (
          <div className="mb-4 p-3 bg-danger/15 text-red-700 rounded border border-red-200">
            {formError}
          </div>
        )}
        
        <div className="mb-4 p-3 bg-accent/15 rounded border border-blue-200">
          <p className="text-sm text-text-muted">
            This creates a minimal user profile with just USBC ID, first name, and last name. 
            The user will not be able to login until they claim their profile by providing 
            their email and password. Elevated access is set under Subscription below.
          </p>
        </div>
        
        <div className="mb-4">
          <Input
            label="USBC ID"
            name="usbc_id"
            value={values.usbc_id}
            onChange={handleChange}
            error={fieldErrors.usbc_id}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
              label="Last Name"
              name="last_name"
              value={values.last_name}
              onChange={handleChange}
              error={fieldErrors.last_name}
              required
            />
          </div>
        </div>

        <AdminUserSubscriptionSection
          draftMode
          draft={subscriptionDraft}
          onDraftChange={setSubscriptionDraft}
          disabled={isSubmitting}
        />
        
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
            Create Minimal User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateMinimalUserModal;
