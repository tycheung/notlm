import axiosInstance from '../api/axios';
import { 
  SystemSettingRead,
  SystemSettingCreate,
  SystemSettingUpdate
} from '../types/system_settings';

const SYSTEM_SETTINGS_ENDPOINTS = {
  SETTINGS: '/system-settings',
  SETTING: (id: number) => `/system-settings/${id}`,
  SETTING_BY_KEY: (key: string) => `/system-settings/by-key/${key}`,
  CREATE_DEFAULTS: '/system-settings/create-defaults',
};

/**
 * System Settings API service
 */
export const SystemSettingsAPI = {
  /**
   * Get a list of system settings with optional filtering
   * @param params Optional filter parameters
   * @returns Promise with array of settings
   */
  getSettings: async (params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<SystemSettingRead[]> => {
    const response = await axiosInstance.get<SystemSettingRead[]>(SYSTEM_SETTINGS_ENDPOINTS.SETTINGS, { params });
    return response.data;
  },

  /**
   * Create a new system setting
   * @param data Setting data
   * @returns Promise with created setting
   */
  createSetting: async (data: SystemSettingCreate): Promise<SystemSettingRead> => {
    const response = await axiosInstance.post<SystemSettingRead>(SYSTEM_SETTINGS_ENDPOINTS.SETTINGS, data);
    return response.data;
  },

  /**
   * Get a specific system setting by ID
   * @param id Setting ID
   * @returns Promise with the setting data
   */
  getSetting: async (id: number): Promise<SystemSettingRead> => {
    const response = await axiosInstance.get<SystemSettingRead>(SYSTEM_SETTINGS_ENDPOINTS.SETTING(id));
    return response.data;
  },

  /**
   * Get a specific system setting by key
   * @param key Setting key
   * @returns Promise with the setting data
   */
  getSettingByKey: async (key: string): Promise<SystemSettingRead> => {
    const response = await axiosInstance.get<SystemSettingRead>(SYSTEM_SETTINGS_ENDPOINTS.SETTING_BY_KEY(key));
    return response.data;
  },

  /**
   * Update a system setting
   * @param id Setting ID
   * @param data Updated setting data
   * @returns Promise with the updated setting data
   */
  updateSetting: async (id: number, data: SystemSettingUpdate): Promise<SystemSettingRead> => {
    const response = await axiosInstance.put<SystemSettingRead>(SYSTEM_SETTINGS_ENDPOINTS.SETTING(id), data);
    return response.data;
  },

  /**
   * Delete a system setting
   * @param id Setting ID
   * @returns Promise with void result
   */
  deleteSetting: async (id: number): Promise<void> => {
    await axiosInstance.delete(SYSTEM_SETTINGS_ENDPOINTS.SETTING(id));
  },

  /**
   * Create default system settings if they don't exist
   * @returns Promise with array of created settings
   */
  createDefaults: async (): Promise<SystemSettingRead[]> => {
    const response = await axiosInstance.post<SystemSettingRead[]>(SYSTEM_SETTINGS_ENDPOINTS.CREATE_DEFAULTS);
    return response.data;
  },
}; 