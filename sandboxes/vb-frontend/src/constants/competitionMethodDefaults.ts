import {
  AdvancementMethod,
  type AdvancementMethodConfig,
} from '../types/roundRelationship';

/** Default `competition_method_config` per method (aligned with template wizard + backend). */
export const DEFAULT_COMPETITION_METHOD_CONFIGS: Record<
  AdvancementMethod,
  AdvancementMethodConfig
> = {
  [AdvancementMethod.ELIMINATOR]: {
    game_count: 1,
    game_style: 'standard',
    dylg_enabled: false,
  },
  [AdvancementMethod.STEPLADDER]: {
    game_count: 2,
    series_decision_mode: 'games_total',
    game_style: 'standard',
    dylg_enabled: false,
  },
  [AdvancementMethod.BRACKET]: {
    game_count: 1,
    series_decision_mode: 'race_to_wins',
    race_to_wins: 2,
    bracket_mode: 'single_elimination',
    seed_mode: 'by_seed',
    placement_resolution_mode: 'stats',
    game_style: 'standard',
    dylg_enabled: false,
  },
  [AdvancementMethod.ROUND_ROBIN]: {
    game_count: 1,
    schedule_mode: 'league',
    scheduled_games: 8,
    total_matches_or_games: 8,
    games_per_match: 1,
    series_decision_mode: 'games_total',
    position_round_game: null,
    position_round_lane_placement: 'start_low',
    placement_resolution_mode: 'stats',
    game_style: 'standard',
    dylg_enabled: false,
  },
  [AdvancementMethod.PODS]: {
    game_count: 1,
    series_decision_mode: 'games_total',
    pod_size: 4,
    pod_size_min: 4,
    pod_size_max: 4,
    advance_by_size: { '4': 2 },
    balance_mode: 'by_seed',
    remainder_mode: 'even',
    placement_resolution_mode: 'stats',
    game_style: 'standard',
    dylg_enabled: false,
  },
};