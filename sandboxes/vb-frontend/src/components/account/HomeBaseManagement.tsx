import React, { useState, useEffect } from 'react';
import { UsersAPI } from '../../api/users';
import { HomeBaseRead, HomeBaseCreate, HomeBaseUpdate } from '../../types/user';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import Label from '../common/Label';
import Loading from '../common/Loading';
import ConfirmDialog from '../common/ConfirmDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserPreferences, UserPreferences } from '../../api/account';
import { getErrorMessage } from '../../api/apiErrors';

interface HomeBaseFormData {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
}

interface HomeBaseManagementProps {
  securityInfo?: any; // Gets passed from parent to access default_search_radius
  onUpdateSuccess?: () => void; // Callback for when preferences are updated
}

const HomeBaseManagement: React.FC<HomeBaseManagementProps> = ({ 
  securityInfo,
  onUpdateSuccess 
}) => {
  const queryClient = useQueryClient();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingBaseId, setEditingBaseId] = useState<number | null>(null);
  const [defaultRadius, setDefaultRadius] = useState(securityInfo?.default_search_radius || 50);
  const [formData, setFormData] = useState<HomeBaseFormData>({
    name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal_code: '',
    is_default: false
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [homeBaseToDelete, setHomeBaseToDelete] = useState<number | null>(null);

  // Update defaultRadius when securityInfo changes
  useEffect(() => {
    if (securityInfo?.default_search_radius) {
      setDefaultRadius(securityInfo.default_search_radius);
    }
  }, [securityInfo]);

  // Fetch home bases
  const { 
    data: homeBases = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['homeBases'],
    queryFn: async () => {
      const bases = await UsersAPI.getHomeBases();
      return bases;
    }
  });

  // Create new home base
  const createMutation = useMutation({
    mutationFn: (data: HomeBaseCreate) => UsersAPI.createHomeBase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeBases'] });
      setIsAddingNew(false);
      resetForm();
      setSuccessMessage('Home base created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setFormError(getErrorMessage(err, 'Failed to create home base'));
    }
  });

  // Update home base
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; updateData: HomeBaseUpdate }) => 
      UsersAPI.updateHomeBase(data.id, data.updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeBases'] });
      setEditingBaseId(null);
      resetForm();
      setSuccessMessage('Home base updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setFormError(getErrorMessage(err, 'Failed to update home base'));
    }
  });

  // Delete home base
  const deleteMutation = useMutation({
    mutationFn: (id: number) => UsersAPI.deleteHomeBase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeBases'] });
      setSuccessMessage('Home base deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setFormError(getErrorMessage(err, 'Failed to delete home base'));
    }
  });

  // Set as default home base
  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => UsersAPI.setDefaultHomeBase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeBases'] });
      setSuccessMessage('Default home base updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setFormError(getErrorMessage(err, 'Failed to set default home base'));
    }
  });

  // Update default search radius
  const updateRadiusMutation = useMutation({
    mutationFn: (preferences: UserPreferences) => updateUserPreferences(preferences),
    onSuccess: () => {
      setSuccessMessage('Default search radius updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      // Update security info in parent component
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    },
    onError: (err: any) => {
      setFormError(getErrorMessage(err, 'Failed to update search radius'));
    }
  });

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postal_code: '',
      is_default: false
    });
    setFormError(null);
  };

  // When editing, populate form with selected home base data
  useEffect(() => {
    if (editingBaseId !== null) {
      const homeBase = homeBases.find(base => base.id === editingBaseId);
      if (homeBase) {
        setFormData({
          name: homeBase.name,
          address1: homeBase.address1,
          address2: homeBase.address2 || '',
          city: homeBase.city,
          state: homeBase.state,
          postal_code: homeBase.postal_code,
          is_default: homeBase.is_default
        });
      }
    }
  }, [editingBaseId, homeBases]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic validation
    if (!formData.name || !formData.address1 || !formData.city || !formData.state || !formData.postal_code) {
      setFormError('Please fill in all required fields.');
      return;
    }

    let coords: { latitude?: number; longitude?: number } = {};
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 60_000,
          });
        });
        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch {
        // Optional: nearby search requires coords; save still succeeds without them.
      }
    }

    const payload = { ...formData, ...coords };

    if (editingBaseId !== null) {
      updateMutation.mutate({
        id: editingBaseId,
        updateData: payload
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Handle cancellation of add/edit
  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingBaseId(null);
    resetForm();
  };

  // Handle radius change
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDefaultRadius(Number(e.target.value));
  };

  // Save radius as user preference
  const handleSaveRadius = () => {
    updateRadiusMutation.mutate({
      default_search_radius: defaultRadius
    });
  };

  // Handle setting a home base as default
  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate(id);
  };

  const handleDeleteClick = (id: number) => {
    setHomeBaseToDelete(id);
  };

  const confirmDeleteHomeBase = () => {
    if (homeBaseToDelete != null) {
      deleteMutation.mutate(homeBaseToDelete);
    }
    setHomeBaseToDelete(null);
  };

  // Start editing a home base
  const handleEdit = (id: number) => {
    setEditingBaseId(id);
    setIsAddingNew(false);
  };

  if (isLoading) {
    return <Loading size="medium" />;
  }

  if (error) {
    return (
      <Alert 
        variant="error" 
        message="Failed to load home bases. Please try again later."
      />
    );
  }

  const hasHomeBases = homeBases.length > 0;

  return (
    <div className="space-y-6">
      {successMessage && (
        <Alert
          variant="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {formError && (
        <Alert
          variant="error"
          message={formError}
          onDismiss={() => setFormError(null)}
        />
      )}

      {/* Radius Settings */}
      <div className="bg-surface-light p-4 rounded-lg">
        <h3 className="text-lg font-medium text-text-muted mb-3">Default Search Radius</h3>
        <p className="text-text-muted text-sm mb-4">
          Set your default radius for searching tournaments near your home bases.
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-border">
          <div className="w-full">
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={defaultRadius}
              onChange={handleRadiusChange}
              className="w-full max-w-md h-2 bg-border rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between max-w-md text-xs text-text-muted mt-1">
              <span>10 miles</span>
              <span>200 miles</span>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-text-muted font-medium mr-3 w-20 text-center">{defaultRadius} miles</span>
            <Button 
              variant="darkbackground" 
              size="small"
              onClick={handleSaveRadius}
              isLoading={updateRadiusMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Home Bases List */}
      {hasHomeBases && !isAddingNew && editingBaseId === null && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-text-muted">Your Home Bases</h3>
            <Button 
              variant="darkbackground" 
              onClick={() => setIsAddingNew(true)}
              size="small"
            >
              Add New
            </Button>
          </div>
          
          <div className="space-y-4">
            {homeBases.map(base => (
              <div key={base.id} className="bg-surface-light p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-text-muted font-medium">
                      {base.name} 
                      {base.is_default && (
                        <span className="ml-2 text-xs bg-primary text-text px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </h4>
                    <p className="text-text-muted text-sm mt-1">{base.address1}</p>
                    {base.address2 && <p className="text-text-muted text-sm">{base.address2}</p>}
                    <p className="text-text-muted text-sm">
                      {base.city}, {base.state} {base.postal_code}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(base.id)}
                      className="text-text-muted hover:text-text-muted"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(base.id)}
                      className="text-text-muted hover:text-text-muted"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {!base.is_default && (
                      <button
                        onClick={() => handleSetDefault(base.id)}
                        className="text-text-muted hover:text-text-muted"
                        title="Set as Default"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasHomeBases && !isAddingNew && (
        <div className="text-center py-8 bg-surface-light rounded-lg">
          <h3 className="text-lg font-medium text-text-muted mb-2">No Home Bases Added Yet</h3>
          <p className="text-text-muted text-sm mb-4">
            Add home bases to easily find tournaments nearby.
          </p>
          <Button 
            variant="darkbackground" 
            onClick={() => setIsAddingNew(true)}
          >
            Add Your First Home Base
          </Button>
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAddingNew || editingBaseId !== null) && (
        <div className="bg-surface-light p-4 rounded-lg">
          <h3 className="text-lg font-medium text-text-muted mb-4">
            {editingBaseId !== null ? 'Edit Home Base' : 'Add New Home Base'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="name"
              name="name"
              label="Name"
              placeholder="e.g., Home, Work, Parents' House"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            
            <Input
              id="address1"
              name="address1"
              label="Address Line 1"
              value={formData.address1}
              onChange={handleInputChange}
              fullWidth
              required
            />
            
            <Input
              id="address2"
              name="address2"
              label="Address Line 2 (Optional)"
              value={formData.address2}
              onChange={handleInputChange}
              fullWidth
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="city"
                name="city"
                label="City"
                value={formData.city}
                onChange={handleInputChange}
                fullWidth
                required
              />
              
              <Input
                id="state"
                name="state"
                label="State"
                value={formData.state}
                onChange={handleInputChange}
                fullWidth
                required
              />
              
              <Input
                id="postal_code"
                name="postal_code"
                label="Postal Code"
                value={formData.postal_code}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </div>
            
            <div className="flex items-center">
              <Label className="flex items-center text-sm mb-0 cursor-pointer">
                <input
                  id="is_default"
                  name="is_default"
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
                />
                Set as default home base
              </Label>
            </div>
            
            <div className="flex justify-end space-x-3 mt-4">
              <Button 
                variant="lightbackground" 
                type="button" 
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                variant="darkbackground" 
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {editingBaseId !== null ? 'Update' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={homeBaseToDelete != null}
        onClose={() => setHomeBaseToDelete(null)}
        onConfirm={confirmDeleteHomeBase}
        title="Delete home base"
        message="Are you sure you want to delete this home base?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default HomeBaseManagement; 
