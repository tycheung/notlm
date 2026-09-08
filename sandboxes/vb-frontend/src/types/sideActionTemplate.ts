import type { SideActionType } from './side_action';

/** Portable side-action config snapshot (no event/squad/tournament fields). */
export interface SideActionTemplatePayload {
  version?: number;
  suggested_name?: string;
  description?: string | null;
  entry_fee?: number;
  max_participants?: number;
  house_cut_percentage?: number;
  house_cut_amount?: number | null;
  house_cut_type?: 'percentage' | 'dollars_per_entry' | 'amount';
  prize_distribution?: Record<string, number>;
  prize_type?: 'percentage' | 'amount' | 'dollars_per_entry';
  game_numbers?: number[];
  type_config?: Record<string, unknown>;
}

export interface UserSideActionTemplateRead {
  id: number;
  user_id: number;
  name: string;
  side_action_type: SideActionType;
  payload: SideActionTemplatePayload;
  is_favorite: boolean;
  source_side_action_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserSideActionTemplateCreate {
  name: string;
  side_action_type: SideActionType;
  payload: SideActionTemplatePayload;
  is_favorite?: boolean;
}

export interface UserSideActionTemplateUpdate {
  name?: string;
  payload?: SideActionTemplatePayload;
  is_favorite?: boolean;
}
