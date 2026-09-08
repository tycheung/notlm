export interface UserEventFormatTemplateRead {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  /** Server may return legacy values; UI ignores scope — all structures apply to singles and team events. */
  event_format_scope?: string;
  payload: Record<string, unknown>;
  is_favorite: boolean;
  is_default: boolean;
  is_system: boolean;
  source_event_id?: number | null;
  copied_from_template_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserEventFormatTemplateCreate {
  name: string;
  description?: string | null;
  payload: Record<string, unknown>;
  is_favorite?: boolean;
  is_default?: boolean;
}

export interface UserEventFormatTemplateUpdate {
  name?: string;
  description?: string | null;
  payload?: Record<string, unknown>;
  is_favorite?: boolean;
  is_default?: boolean;
}

export interface FormatTemplateMatch {
  template_id: number;
  name: string;
  description?: string | null;
  score: number;
  fingerprint?: string;
}

export interface ApplyTemplateToEventBody {
  event_id: number;
  template_id?: number | null;
  /** When true, server removes existing rounds, squads, games, and exit nodes before applying. */
  replace_existing_structure?: boolean;
}

export interface CreateTemplateFromEventBody {
  event_id: number;
  name: string;
  description?: string | null;
}
