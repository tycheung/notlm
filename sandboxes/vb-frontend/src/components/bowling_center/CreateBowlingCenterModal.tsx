import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import Input from '../common/Input';
import { useForm } from '../../hooks/useForm';
import { getErrorMessage } from '../../api/apiErrors';
import { BowlingCentersAPI } from '../../api/bowling-centers';
import { BowlingCenterCreate } from '../../types/bowling_center';
import { states } from '../../utils/stateAbbreviations';
import {
  clearBowlingCenterCreateDraft,
  loadBowlingCenterCreateDraft,
  saveBowlingCenterCreateDraft,
} from '../../utils/bowlingCenterDraftStorage';

interface CreateBowlingCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBowlingCenterModal: React.FC<CreateBowlingCenterModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  // Initialize form with empty values
  const initialValues: BowlingCenterCreate = {
    name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    lane_count: 12 // Default to 12 lanes
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
    setValues,
  } = useForm<BowlingCenterCreate>(initialValues);

  const [duplicateCentersConfirmOpen, setDuplicateCentersConfirmOpen] = useState(false);
  const [similarCentersCount, setSimilarCentersCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const draft = loadBowlingCenterCreateDraft();
    if (draft?.values) {
      setValues({ ...initialValues, ...draft.values });
    }
  }, [isOpen, setValues]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      saveBowlingCenterCreateDraft({ v: 1, values });
    }, 400);
    return () => clearTimeout(t);
  }, [isOpen, values]);

  // Set up validation rules
  useEffect(() => {
    setFieldRules('name', [
      { validate: (value: string | null | undefined) => Boolean(value), message: 'Name is required' }
    ]);
    
    setFieldRules('address1', [
      { validate: (value: string | null | undefined) => Boolean(value), message: 'Address is required' }
    ]);
    
    setFieldRules('city', [
      { validate: (value: string | null | undefined) => Boolean(value), message: 'City is required' }
    ]);
    
    setFieldRules('state', [
      { validate: (value: string | null | undefined) => Boolean(value), message: 'State is required' }
    ]);
    
    setFieldRules('postal_code', [
      { validate: (value: string | null | undefined) => Boolean(value), message: 'Postal code is required' }
    ]);
    
    setFieldRules('lane_count', [
      { validate: (value: number | null | undefined) => Boolean(value && value > 0), message: 'Lane count is required and must be greater than 0' },
      { validate: (value: number | null | undefined) => !value || value <= 128, message: 'Lane count cannot exceed 128' }
    ]);
    
    setFieldRules('phone', []);
    
    setFieldRules('email', [
      { 
        validate: (value: string | null | undefined) => {
          if (!value || value.trim() === '') return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }, 
        message: 'Please enter a valid email address' 
      }
    ]);
    
    setFieldRules('website', [
      { 
        validate: (value: string | null | undefined) => {
          if (!value || value.trim() === '') return true;
          return /^https?:\/\/.*/.test(value);
        }, 
        message: 'Please enter a valid URL' 
      }
    ]);
    
  }, [setFieldRules]);

  // Function to check for similar centers
  const checkForSimilarCenters = async (values: BowlingCenterCreate) => {
    try {
      // First check for centers with similar names
      const nameResults = await BowlingCentersAPI.getBowlingCenters({
        search: values.name
      });
      
      // Then check for centers with similar addresses in the same city
      const addressResults = await BowlingCentersAPI.getBowlingCenters({
        city: values.city,
        state: values.state
      });
      
      // Filter address results to find similar addresses
      const similarAddressCenters = addressResults.filter(center => 
        center.address1.toLowerCase().includes(values.address1.toLowerCase()) ||
        values.address1.toLowerCase().includes(center.address1.toLowerCase())
      );
      
      // Combine the results, filtering out duplicates
      const combinedResults = [...nameResults];
      similarAddressCenters.forEach(center => {
        if (!combinedResults.some(c => c.id === center.id)) {
          combinedResults.push(center);
        }
      });
      
      return combinedResults;
    } catch (err) {
      console.error("Error checking for similar centers:", err);
      return [];
    }
  };

  const performCreate = async () => {
    const formData = {
      ...values,
      email: values.email?.trim() || null,
      phone: values.phone?.trim() || null,
      website: values.website?.trim() || null
    };

    await BowlingCentersAPI.createBowlingCenter(formData);
    clearBowlingCenterCreateDraft();
    resetForm();
    onSuccess();
    onClose();
  };

  // Handle form submission
  const submitForm = async () => {
    try {
      const similarCenters = await checkForSimilarCenters(values);

      if (similarCenters.length > 0) {
        setSimilarCentersCount(similarCenters.length);
        setDuplicateCentersConfirmOpen(true);
        return;
      }

      await performCreate();
    } catch (error: any) {
      console.error('Error creating bowling center:', error);
      setFormError(getErrorMessage(error, 'Failed to create bowling center. Please try again.'));
    }
  };

  const handleConfirmDuplicateCenters = async () => {
    setDuplicateCentersConfirmOpen(false);
    try {
      await performCreate();
    } catch (error: any) {
      console.error('Error creating bowling center:', error);
      setFormError(getErrorMessage(error, 'Failed to create bowling center. Please try again.'));
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Bowling Center"
      size="large"
      closeOnOutsideClick={false}
    >
      <form onSubmit={handleSubmit(submitForm)}>
        {formError && (
          <div className="mb-4 p-3 bg-danger/15 text-red-700 rounded border border-red-200">
            {formError}
          </div>
        )}
        
        <div className="grid grid-cols-1 mb-4">
          <div>
            <Input
              label="Name"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={fieldErrors.name}
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 mb-4">
          <div>
            <Input
              label="Address Line 1"
              name="address1"
              value={values.address1}
              onChange={handleChange}
              error={fieldErrors.address1}
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 mb-4">
          <div>
            <Input
              label="Address Line 2 (Optional)"
              name="address2"
              value={values.address2 || ''}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Input
              label="City"
              name="city"
              value={values.city}
              onChange={handleChange}
              error={fieldErrors.city}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              State
            </label>
            <select
              name="state"
              value={values.state}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="" disabled>Select State</option>
              {states.map((state) => (
                <option key={state.abbreviation} value={state.abbreviation}>
                  {state.name}
                </option>
              ))}
            </select>
            {fieldErrors.state && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.state}</p>
            )}
          </div>
          
          <div>
            <Input
              label="Postal Code"
              name="postal_code"
              value={values.postal_code}
              onChange={handleChange}
              error={fieldErrors.postal_code}
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Input
              label="Lane Count"
              name="lane_count"
              type="number"
              min="1"
              max="128"
              value={values.lane_count}
              onChange={handleChange}
              error={fieldErrors.lane_count}
              required
            />
          </div>
          
          <div>
            <Input
              label="Phone (Optional)"
              name="phone"
              value={values.phone || ''}
              onChange={handleChange}
              error={fieldErrors.phone}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Input
              label="Email (Optional)"
              name="email"
              type="email"
              value={values.email || ''}
              onChange={handleChange}
              error={fieldErrors.email}
            />
          </div>
          
          <div>
            <Input
              label="Website (Optional)"
              name="website"
              value={values.website || ''}
              onChange={handleChange}
              error={fieldErrors.website}
            />
          </div>
        </div>
        
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
            Create Bowling Center
          </Button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      isOpen={duplicateCentersConfirmOpen}
      onClose={() => setDuplicateCentersConfirmOpen(false)}
      onConfirm={handleConfirmDuplicateCenters}
      title="Similar centers found"
      message={`We found ${similarCentersCount} similar bowling centers that may be duplicates. Continue adding this center? Existing centers will be updated with your changes.`}
      confirmText="Continue"
      cancelText="Cancel"
      confirmVariant="primary"
    />
    </>
  );
};

export default CreateBowlingCenterModal; 
