import { TournamentRead } from './tournament';

export interface BowlingCenterBase {
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  lane_count: number;
}

export interface BowlingCenterCreate extends BowlingCenterBase {
  created_by?: number | null;
}

export interface BowlingCenterUpdate {
  name?: string;
  address1?: string;
  address2?: string | null;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  lane_count?: number;
  updated_by?: number | null;
}

export interface BowlingCenterRead extends BowlingCenterBase {
  id: number;
  created_at: string; // ISO format datetime
  updated_at?: string | null; // ISO format datetime
  is_active: boolean;
  created_by?: number | null;
  updated_by?: number | null;
}

export interface BowlingCenterWithTournaments extends BowlingCenterRead {
  tournaments: TournamentRead[];
}

export interface BowlingCenterStats {
  center_id: number;
  center_name: string;
  total_tournaments: number;
  upcoming_tournaments: number;
  tournaments_this_month: number;
  total_games_played: number;
  highest_game_ever: number;
  highest_game_user_id?: number | null;
  highest_game_user_name: string;
  most_active_tournament_id?: number | null;
  most_active_tournament_name: string;
}

export interface BowlingCenterSearch {
  id: number;
  name: string;
  city: string;
  state: string;
  postal_code: string;
  tournament_count: number;
  distance?: number | null;
  lane_count: number;
}

export interface LocationSearch {
  latitude: number;
  longitude: number;
  radius?: number;
}