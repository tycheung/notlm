import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';
import { useForm } from '../../hooks/useForm';
import { getErrorMessage } from '../../api/apiErrors';
import { UsersAPI } from '../../api/users';
import { UserClaimRequest, UserClaimResponse, USBCSearchResult, Gender } from '../../types/user';

interface ClaimProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: UserClaimResponse) => void;
}

const ClaimProfileModal: React.FC<ClaimProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [usbcId, setUsbcId] = useState('');
  const [searchResult, setSearchResult] = useState<USBCSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [step, setStep] = useState<'search' | 'claim'>('search');
  const [isDispute, setIsDispute] = useState(false);
  
  // Keep form initial state stable across renders so reset callbacks remain stable.
  const initialValues = useMemo<UserClaimRequest>(() => ({
    usbc_id: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    gender: Gender.MALE,
    birth_date: '',
    claimant_notes: '',
  }), []);

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
  } = useForm<UserClaimRequest>(initialValues);

  // Set up validation rules
  React.useEffect(() => {
    setFieldRules('email', [
      { validate: value => Boolean(value), message: 'Email is required' },
      { 
        validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 
        message: 'Please enter a valid email address' 
      }
    ]);
    
    setFieldRules('password', [
      { validate: value => Boolean(value), message: 'Password is required' },
      { 
        validate: value => value.length >= 8, 
        message: 'Password must be at least 8 characters long' 
      }
    ]);
  }, [setFieldRules]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('search');
      setUsbcId('');
      setSearchResult(null);
      setSearchError(null);
      setIsDispute(false);
      resetForm();
    }
  }, [isOpen, resetForm]);

  // Handle USBC ID search
  const handleSearch = async () => {
    if (!usbcId.trim()) {
      setSearchError('Please enter a USBC ID');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await UsersAPI.searchUSBC(usbcId.trim());
      setSearchResult(result);
      
      if (result.has_existing_profile && result.can_claim) {
        setValues({
          ...values,
          usbc_id: usbcId.trim(),
          first_name: result.first_name,
          last_name: result.last_name,
        });
        setIsDispute(false);
        setStep('claim');
      } else if (result.has_existing_profile && !result.can_claim) {
        setValues({
          ...values,
          usbc_id: usbcId.trim(),
          first_name: '',
          last_name: '',
        });
        setIsDispute(true);
        setStep('claim');
      } else {
        setSearchError('No existing profile found for this USBC ID. Create a new account instead.');
      }
    } catch (error: any) {
      console.error('Error searching USBC ID:', error);
      setSearchError('Failed to search USBC ID. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle profile claim
  const submitClaim = async () => {
    setFormError(null);
    
    try {
      const response = await UsersAPI.claimProfile(values);
      onSuccess(response);
      onClose();
    } catch (error: any) {
      console.error('Error claiming profile:', error);
      setFormError(getErrorMessage(error, 'Failed to claim profile. Please try again.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Claim Your Profile"
      size="large"
      closeOnOutsideClick={false}
    >
      {step === 'search' ? (
        <div>
          <div className="mb-4 p-3 bg-accent/15 rounded border border-blue-200">
            <p className="text-sm text-text-muted">
              If a tournament director added you with your USBC ID, search it here and set your
              email and password. If that ID already belongs to someone else, you can request an
              admin review.
            </p>
          </div>
          
          <div className="mb-4">
            <Input
              label="USBC ID"
              name="usbc_id"
              value={usbcId}
              onChange={(e) => setUsbcId(e.target.value)}
              placeholder="Enter your USBC ID"
              required
            />
          </div>
          
          {searchError && (
            <div className="mb-4 p-3 bg-danger/15 text-red-700 rounded border border-red-200">
              {searchError}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="lightbackground"
              onClick={onClose}
            >
              Cancel
            </Button>
            
            <Button
              variant="darkbackground"
              onClick={handleSearch}
              isLoading={isSearching}
              disabled={isSearching || !usbcId.trim()}
            >
              Search
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(submitClaim)}>
          {formError && (
            <div className="mb-4 p-3 bg-danger/15 text-red-700 rounded border border-red-200">
              {formError}
            </div>
          )}
          
          {searchResult && (
            <div className={`mb-4 p-3 rounded border ${isDispute ? 'bg-accent/15 border-blue-200' : 'bg-success/15 border-green-200'}`}>
              <p className="text-sm text-text-muted">
                {isDispute ? (
                  <>
                    USBC ID <strong>{searchResult.usbc_id}</strong> is already claimed
                    {searchResult.first_name || searchResult.last_name
                      ? ` (on file as ${searchResult.first_name} ${searchResult.last_name})`
                      : ''}
                    . Submit your details to request an admin review. You will get a login while
                    that review is pending.
                  </>
                ) : (
                  <>
                    Found profile for <strong>{searchResult.first_name} {searchResult.last_name}</strong>
                    {' '}with USBC ID <strong>{searchResult.usbc_id}</strong>
                  </>
                )}
              </p>
            </div>
          )}
          
          {isDispute && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Input
                label="First name"
                name="first_name"
                value={values.first_name || ''}
                onChange={handleChange}
                error={fieldErrors.first_name}
                required
              />
            </div>
            <div>
              <Input
                label="Last name"
                name="last_name"
                value={values.last_name || ''}
                onChange={handleChange}
                error={fieldErrors.last_name}
                required
              />
            </div>
          </div>
          )}

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
                label="Password"
                name="password"
                type="password"
                value={values.password}
                onChange={handleChange}
                error={fieldErrors.password}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Input
                label="Phone (Optional)"
                name="phone"
                value={values.phone || ''}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <Label htmlFor="gender" className="mb-1">
                Gender (Optional)
              </Label>
              <select
                id="gender"
                name="gender"
                value={values.gender || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="">Select Gender</option>
                <option value={Gender.MALE}>Male</option>
                <option value={Gender.FEMALE}>Female</option>
                <option value={Gender.OTHER}>Other</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Input
                label="Birth Date (Optional)"
                name="birth_date"
                type="date"
                value={values.birth_date || ''}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <Input
              label="Additional Notes (Optional)"
              name="claimant_notes"
              value={values.claimant_notes || ''}
              onChange={handleChange}
              placeholder="Any additional information to help verify your identity"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="lightbackground"
              onClick={() => setStep('search')}
              disabled={isSubmitting}
            >
              Back
            </Button>
            
            <Button
              variant="darkbackground"
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {isDispute ? 'Request admin review' : 'Claim Profile'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ClaimProfileModal;
