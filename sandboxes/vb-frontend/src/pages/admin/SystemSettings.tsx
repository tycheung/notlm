import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  SystemSettingRead, 
  SystemSettingUpdate,
  SettingType,
  parseOptions,
  serializeOptions
} from '../../types/system_settings';
import { SystemSettingsAPI } from '../../api/system-settings';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageTitle from '../../components/common/PageTitle';
import Breadcrumb from '../../components/common/Breadcrumb';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';

// Default settings to create if none exist
const defaultSettings = [
  {
    key: 'site_name',
    value: 'Victory Bowling',
    setting_type: 'text' as SettingType,
    description: 'The name of the bowling tournament platform',
    options: null
  },
  {
    key: 'site_description',
    value: 'Manage and participate in bowling tournaments',
    setting_type: 'text' as SettingType,
    description: 'Brief description of the platform for SEO',
    options: null
  },
  {
    key: 'registration_enabled',
    value: 'true',
    setting_type: 'boolean' as SettingType,
    description: 'Allow new users to register on the platform',
    options: null
  },
  {
    key: 'maintenance_mode',
    value: 'false',
    setting_type: 'boolean' as SettingType,
    description: 'Put the site in maintenance mode (only admins can access)',
    options: null
  },
  {
    key: 'notification_system',
    value: 'email',
    setting_type: 'select' as SettingType,
    description: 'Primary method for sending notifications to users',
    options: serializeOptions(['email', 'sms', 'both', 'none'])
  }
];

const SystemSettings: React.FC = () => {
  const location = useLocation();
  const [settings, setSettings] = useState<SystemSettingRead[]>([]);
  const [editableSettings, setEditableSettings] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [creatingDefaults, setCreatingDefaults] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Get all settings from API
      const fetchedSettings = await SystemSettingsAPI.getSettings();
      
      // Log the response for debugging
      
      // Ensure that fetchedSettings is an array and all items have an id
      const settingsArray = Array.isArray(fetchedSettings) 
        ? fetchedSettings.filter(setting => setting && typeof setting.id === 'number')
        : [];
      
      // If no settings found, try to create defaults automatically
      if (settingsArray.length === 0) {
        try {
          const createdSettings = await SystemSettingsAPI.createDefaults();
          if (Array.isArray(createdSettings) && createdSettings.length > 0) {
            
            // Refresh to get all settings including newly created ones
            const refreshedSettings = await SystemSettingsAPI.getSettings();
            const validSettings = Array.isArray(refreshedSettings)
              ? refreshedSettings.filter(setting => setting && typeof setting.id === 'number')
              : [];
            
            setSettings(validSettings);
            setSuccessMessage(`Created ${createdSettings.length} default system settings.`);
            
            // Clear success message after a few seconds
            setTimeout(() => {
              setSuccessMessage(null);
            }, 3000);
            
            setErrorMessage(null);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error auto-creating default settings:', err);
          // Continue with empty settings array
        }
      }
      
      setSettings(settingsArray);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error loading settings:', error);
      setErrorMessage('Failed to load settings. Please try again later.');
      // Always ensure settings is an array even on error
      setSettings([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh settings without page reload
  const handleRefresh = async (e?: React.MouseEvent) => {
    // Prevent default behavior to avoid page navigation
    if (e) {
      e.preventDefault();
    }
    
    setRefreshing(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      await loadSettings();
      setSuccessMessage('Settings refreshed successfully!');
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error refreshing settings:', error);
      setErrorMessage('Failed to refresh settings. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle creating default settings explicitly
  const handleCreateDefaultSettings = async () => {
    setCreatingDefaults(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      const createdSettings = await SystemSettingsAPI.createDefaults();
      
      if (Array.isArray(createdSettings) && createdSettings.length > 0) {
        
        // Update settings list with newly created settings and existing ones
        await loadSettings();
        setSuccessMessage(`Successfully created ${createdSettings.length} default settings.`);
      } else if (Array.isArray(createdSettings) && createdSettings.length === 0) {
        setSuccessMessage('No new settings were created. All default settings already exist.');
      } else {
        console.error('Invalid response when creating default settings:', createdSettings);
        setErrorMessage('Failed to create default settings. Check console for details.');
      }
    } catch (error) {
      console.error('Error creating default settings:', error);
      setErrorMessage('An unexpected error occurred when creating default settings.');
    } finally {
      setCreatingDefaults(false);
    }
  };

  // Start editing a setting
  const handleEdit = (id: number) => {
    if (typeof id !== 'number') return;
    
    const setting = settings.find(s => s.id === id);
    if (setting) {
      setEditableSettings({
        ...editableSettings,
        [id.toString()]: setting.value || ''
      });
      setIsEditing({
        ...isEditing,
        [id.toString()]: true
      });
    }
  };

  // Cancel editing
  const handleCancel = (id: number) => {
    if (typeof id !== 'number') return;
    
    setIsEditing({
      ...isEditing,
      [id.toString()]: false
    });
    
    // Reset the editable value
    const setting = settings.find(s => s.id === id);
    if (setting) {
      setEditableSettings({
        ...editableSettings,
        [id.toString()]: setting.value || ''
      });
    }
  };

  // Handle input change
  const handleChange = (id: number, value: string) => {
    if (typeof id !== 'number') return;
    
    setEditableSettings({
      ...editableSettings,
      [id.toString()]: value
    });
  };

  // Save changes to a setting
  const handleSave = async (id: number) => {
    if (typeof id !== 'number') return;
    
    try {
      const setting = settings.find(s => s.id === id);
      if (!setting) return;
      
      const updateData: SystemSettingUpdate = {
        value: editableSettings[id.toString()] || null
      };
      
      const updatedSetting = await SystemSettingsAPI.updateSetting(id, updateData);
      
      // Only update if the result is valid
      if (updatedSetting && typeof updatedSetting.id === 'number') {
        
        // Update local state
        setSettings(prevSettings => 
          prevSettings.map(s => s.id === id ? updatedSetting : s)
        );
        
        setIsEditing({
          ...isEditing,
          [id.toString()]: false
        });
        
        setSuccessMessage('Setting updated successfully!');
        
        // Clear success message after a few seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        console.error(`Invalid response when updating setting ${id}:`, updatedSetting);
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error(`Error updating setting ${id}:`, error);
      setErrorMessage('Failed to update setting. Please try again.');
      
      // Clear error message after a few seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  // Save all settings
  const handleSaveAll = async () => {
    try {
      if (!Array.isArray(settings) || settings.length === 0) {
        setErrorMessage('No settings to save');
        return;
      }

      const updatePromises = settings.map(async setting => {
        // Skip settings without a valid id
        if (typeof setting.id !== 'number') return setting;
        
        const id = setting.id;
        const newValue = editableSettings[id.toString()];
        
        // Only update if the value has been edited
        if (newValue !== undefined && newValue !== setting.value) {
          const updateData: SystemSettingUpdate = {
            value: newValue
          };
          
          try {
            const updated = await SystemSettingsAPI.updateSetting(id, updateData);
            
            if (updated && typeof updated.id === 'number') {
              return updated;
            } else {
              console.error(`Invalid response when updating setting ${id}:`, updated);
              return setting;
            }
          } catch (err) {
            console.error(`Failed to update setting ${id}:`, err);
            return setting;
          }
        }
        
        return setting;
      });
      
      const updatedSettings = await Promise.all(updatePromises);
      
      // Filter out any invalid settings
      const validSettings = updatedSettings.filter(s => s && typeof s.id === 'number');
      
      setSettings(validSettings);
      setIsEditing({});  // Clear all editing states
      setSuccessMessage('All settings updated successfully!');
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
      setErrorMessage('Failed to update settings. Please try again.');
      
      // Clear error message after a few seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  // Reset all settings to defaults
  const handleResetToDefaults = async () => {
    setShowResetConfirm(false);
    try {
      if (!Array.isArray(settings) || settings.length === 0) {
        setErrorMessage('No settings to reset');
        return;
      }

      const resetPromises = settings.map(async (setting) => {
        if (typeof setting.id !== 'number') return setting;

        const defaultSetting = defaultSettings.find(d => d.key === setting.key);

        if (defaultSetting) {
          const updateData: SystemSettingUpdate = {
            value: defaultSetting.value,
            setting_type: defaultSetting.setting_type,
            description: defaultSetting.description,
            options: defaultSetting.options,
            is_active: true
          };

          try {
            const updated = await SystemSettingsAPI.updateSetting(setting.id, updateData);

            if (updated && typeof updated.id === 'number') {
              return updated;
            } else {
              console.error(`Invalid response when resetting setting ${setting.id}:`, updated);
              return setting;
            }
          } catch (err) {
            console.error(`Failed to reset setting ${setting.id}:`, err);
            return setting;
          }
        }

        return setting;
      });

      const resetSettings = await Promise.all(resetPromises);

      const validSettings = resetSettings.filter(s => s && typeof s.id === 'number');

      setSettings(validSettings);
      setEditableSettings({});
      setIsEditing({});
      setSuccessMessage('All settings reset to defaults!');

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error resetting settings:', error);
      setErrorMessage('Failed to reset settings. Please try again.');

      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  // Render different input types based on setting type
  const renderSettingInput = (setting: SystemSettingRead) => {
    if (!setting || typeof setting.id !== 'number') return null;
    
    const isCurrentlyEditing = isEditing[setting.id.toString()];
    const currentValue = isCurrentlyEditing 
      ? (editableSettings[setting.id.toString()] !== undefined ? editableSettings[setting.id.toString()] : setting.value || '')
      : setting.value || '';
    
    switch (setting.setting_type) {
      case 'boolean':
        return isCurrentlyEditing ? (
          <select
            id={`setting-${setting.id}`}
            value={currentValue}
            onChange={(e) => handleChange(setting.id, e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        ) : (
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            currentValue === 'true' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {currentValue === 'true' ? 'Enabled' : 'Disabled'}
          </span>
        );
      
      case 'number':
        return isCurrentlyEditing ? (
          <Input
            type="number"
            id={`setting-${setting.id}`}
            value={currentValue}
            onChange={(e) => handleChange(setting.id, e.target.value)}
            fullWidth
          />
        ) : (
          <span>{currentValue}</span>
        );
      
      case 'select': {
        const options = parseOptions(setting.options);
        return isCurrentlyEditing ? (
          <select
            id={`setting-${setting.id}`}
            value={currentValue}
            onChange={(e) => handleChange(setting.id, e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          >
            {Array.isArray(options) && options.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        ) : (
          <span className="capitalize">{currentValue}</span>
        );
      }
      
      case 'text':
      default:
        return isCurrentlyEditing ? (
          <Input
            type="text"
            id={`setting-${setting.id}`}
            value={currentValue}
            onChange={(e) => handleChange(setting.id, e.target.value)}
            fullWidth
          />
        ) : (
          <span>{currentValue}</span>
        );
    }
  };

  // Render settings in a card layout
  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <Breadcrumb
          items={[homeCrumb(), layoutDashboardCrumb(location.pathname), { label: 'System settings' }]}
          className="mb-4"
        />
        <div className="flex justify-between items-center mb-6">
          <PageTitle>System Settings</PageTitle>
          <div className="flex space-x-2">
            {/* Refresh button with proper event handler */}
            <Button
              variant="lightbackground"
              onClick={handleRefresh}
              disabled={loading || refreshing || creatingDefaults}
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </Button>
            <Button
              variant="lightbackground"
              onClick={() => setShowResetConfirm(true)}
              disabled={loading || refreshing || creatingDefaults || settings.length === 0}
            >
              Reset to Defaults
            </Button>
            <Button
              variant="darkbackground"
              onClick={handleSaveAll}
              disabled={loading || refreshing || creatingDefaults || settings.length === 0}
            >
              Save All Changes
            </Button>
          </div>
        </div>

        {successMessage && (
          <Alert
            variant="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
            className="mb-4"
          />
        )}
        
        {errorMessage && (
          <Alert
            variant="error"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
            className="mb-4"
          />
        )}
        
        <Card className="bg-surface shadow mb-4">
          <div className="p-4">
            <p className="text-text-muted mb-2">
              Configure system-wide settings for your bowling tournament platform. These settings affect how the entire platform operates.
            </p>
            <p className="text-text-muted text-sm">
              Note: Some settings may require a page refresh to take effect after saving.
            </p>
          </div>
        </Card>
        
        {loading || refreshing ? (
          <Card className="bg-surface shadow">
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-2 text-text-muted">{refreshing ? 'Refreshing settings...' : 'Loading settings...'}</p>
            </div>
          </Card>
        ) : creatingDefaults ? (
          <Card className="bg-surface shadow">
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-2 text-text-muted">Creating default settings...</p>
            </div>
          </Card>
        ) : (
          <Card className="bg-surface shadow">
            {Array.isArray(settings) && settings.length > 0 ? (
              <dl>
                {settings
                  .filter(setting => setting && typeof setting.id === 'number')
                  .map((setting, index) => (
                  <div 
                    key={setting.id} 
                    className={`p-4 sm:grid sm:grid-cols-3 sm:gap-4 ${
                      index % 2 === 0 ? 'bg-surface-light' : 'bg-surface'
                    }`}
                  >
                    <dt className="text-sm font-medium text-text-muted">
                      <div>{setting.key}</div>
                      <div className="mt-1 text-xs font-normal text-text-dim">{setting.description}</div>
                    </dt>
                    <dd className="mt-1 text-sm text-text sm:mt-0 sm:col-span-1">
                      {renderSettingInput(setting)}
                    </dd>
                    <dd className="mt-2 text-sm text-text sm:mt-0 sm:col-span-1 flex justify-end">
                      {isEditing[setting.id.toString()] ? (
                        <>
                          <Button
                            variant="darkbackground"
                            size="small"
                            onClick={() => handleSave(setting.id)}
                            className="mr-2"
                          >
                            Save
                          </Button>
                          <Button
                            variant="lightbackground"
                            size="small"
                            onClick={() => handleCancel(setting.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => handleEdit(setting.id)}
                        >
                          Edit
                        </Button>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-muted mb-4">No settings found. Use the button below to create default settings.</p>
                <Button 
                  variant="darkbackground" 
                  onClick={handleCreateDefaultSettings}
                  disabled={creatingDefaults}
                >
                  {creatingDefaults ? 'Creating Settings...' : 'Create Default Settings'}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetToDefaults}
        title="Reset to defaults"
        message="Are you sure you want to reset all settings to their defaults? This action cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default SystemSettings;
