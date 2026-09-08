export type SettingType = 'text' | 'number' | 'boolean' | 'select';

export interface SystemSettingBase {
  key: string;
  value: string | null;
  setting_type: SettingType;
  description: string | null;
  options: string | null;  // JSON string of options for select type
}

export interface SystemSettingCreate extends SystemSettingBase {}

export interface SystemSettingUpdate {
  key?: string;
  value?: string | null;
  setting_type?: SettingType;
  description?: string | null;
  options?: string | null;
  is_active?: boolean;
}

export interface SystemSettingRead extends SystemSettingBase {
  id: number;
  is_active: boolean;
  created_at: string;  // ISO datetime string
  updated_at: string | null;  // ISO datetime string
}

// Helper functions to parse and serialize options
export const parseOptions = (optionsStr: string | null): string[] => {
  if (!optionsStr) return [];
  try {
    return JSON.parse(optionsStr);
  } catch (e) {
    console.error('Error parsing options:', e);
    return [];
  }
};

export const serializeOptions = (options: string[]): string => {
  return JSON.stringify(options);
}; 