import { GameRead } from './game';
import { NotificationRead } from './notification';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum Role {
  ADMIN = 'admin',
  TD = 'tournament_director',
  SA = 'side_action_only',
  BOWLER = 'bowler',
  GUEST = 'guest'
}

export interface UserBase {
  usbc_id?: string | null;
  first_name: string;
  mi?: string | null;
  last_name: string;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: Gender | null;
  birth_date?: string | null; // ISO format date
  role: Role;
  average_lifetime_score?: number | null;
  average_365day_score?: number | null;
  average_90day_score?: number | null;
  average_50games_score?: number | null;
  is_active?: boolean;
}

export interface UserCreate extends UserBase {
  password: string;
}

export interface UserCreateMinimal {
  /** Omitted or empty: server assigns a temporary V-prefixed USBC */
  usbc_id?: string | null;
  first_name: string;
  last_name: string;
  role: Role;
}

export interface UserClaimRequest {
  usbc_id: string;
  email: string;
  password: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  gender?: Gender | null;
  birth_date?: string | null;
  claimant_notes?: string | null;
}

export interface UserClaimResponse {
  success: boolean;
  message: string;
  claim_id?: number | null;
  requires_verification: boolean;
}

export interface USBCSearchResult {
  usbc_id: string;
  first_name: string;
  last_name: string;
  user_id?: number | null;
  has_existing_profile: boolean;
  can_claim: boolean;
  existing_user?: UserRead | null;
}

export interface UserUpdate {
  usbc_id?: string;
  first_name?: string;
  mi?: string | null;
  last_name?: string;
  display_name?: string | null;
  email?: string;
  phone?: string | null;
  gender?: Gender;
  birth_date?: string;
  role?: Role;
  average_lifetime_score?: number | null;
  average_365day_score?: number | null;
  average_90day_score?: number | null;
  average_50games_score?: number | null;
  password?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface UserRead extends UserBase {
  id: number;
  created_at: string; // ISO format datetime
  updated_at?: string | null; // ISO format datetime
  is_active: boolean;
  is_verified: boolean;
  can_claim: boolean;
  billing?: {
    subscription: {
      plan: 'monthly' | 'annual' | 'side_action_monthly' | 'side_action_annual';
      status: string;
      current_period_end?: string | null;
      cancel_at_period_end?: boolean;
    } | null;
    passes: {
      tournament: number;
      side_action: number;
      large_cap_lift: number;
    };
    has_ever_subscribed?: boolean;
    can_write_director_ops?: boolean;
    director_read_only?: boolean;
  } | null;
}

export interface UserWithGames extends UserRead {
  games: GameRead[];
}

export interface UserWithNotifications extends UserRead {
  notifications: NotificationRead[];
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserWithToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserRead;
  expires_in?: number;
}

export interface HomeBaseBase {
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
}

export interface HomeBaseCreate extends HomeBaseBase {
  latitude?: number | null;
  longitude?: number | null;
}

export interface HomeBaseUpdate {
  name?: string;
  address1?: string;
  address2?: string | null;
  city?: string;
  state?: string;
  postal_code?: string;
  is_default?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface HomeBaseRead extends HomeBaseBase {
  id: number;
  user_id: number;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string; // ISO format datetime
  updated_at?: string | null; // ISO format datetime
}