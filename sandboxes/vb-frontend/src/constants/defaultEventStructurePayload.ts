import { DEFAULT_ROUND_FORMAT_NAME } from './roundFormatDefaults';

/**
 * Mirrors backend `get_canonical_default_payload()` / CANONICAL_PAYLOAD_VERSION.
 * v2: rounds own `competition_method` + `competition_method_config`;
 * relationships own ranking/tiebreaker/carry-over routing details.
 * Keep in sync when server canonical structure changes.
 */
export const CANONICAL_PAYLOAD_VERSION = 2;

export type EventStructurePayload = {
  version: number;
  rounds: Record<string, unknown>[];
  final_nodes?: Record<string, unknown>[];
  relationships: Record<string, unknown>[];
};

export function getDefaultEventStructurePayload(): EventStructurePayload {
  return {
    version: CANONICAL_PAYLOAD_VERSION,
    rounds: [
      {
        ref: 'qualifying',
        round_number: 1,
        friendly_name: 'Qualifying',
        round_format_name: DEFAULT_ROUND_FORMAT_NAME,
        game_count: 3,
        number_of_squads: 1,
        status: 'scheduled',
        competition_method: 'eliminator',
        competition_method_config: {
          game_count: 3,
        },
        allows_reentry: false,
        notes: 'Qualifying round - all participants compete',
        squad: { max_participants: 24 },
        squads: [{ max_participants: 24 }],
      },
      {
        ref: 'final',
        round_number: 2,
        friendly_name: 'Final',
        round_format_name: DEFAULT_ROUND_FORMAT_NAME,
        game_count: 3,
        number_of_squads: 1,
        status: 'scheduled',
        competition_method: 'eliminator',
        competition_method_config: {
          game_count: 3,
        },
        allows_reentry: false,
        notes: 'Final round - top performers from qualifying',
        squad: { max_participants: 12 },
        squads: [{ max_participants: 12 }],
      },
    ],
    final_nodes: [
      {
        ref: 'championship',
        name: 'Championship',
        display_order: 0,
        include_in_standings: true,
        is_active: true,
        placement_count: 3,
      },
    ],
    relationships: [
      {
        source_ref: 'qualifying',
        target_ref: 'final',
        advancement_filter: 'top_n',
        advancement_percentage: 50,
        advancement_type: 'total_pinfall',
        tiebreaker_rule: 'highest_game',
        carry_over_enabled: false,
        delay_rounds: 0,
        description: 'Top 50% of qualifying round advance to final',
        is_active: true,
        execution_order: 1,
        duplicate_advancement_policy: 'single_and_promote',
      },
      {
        source_ref: 'final',
        target_final_ref: 'championship',
        advancement_filter: 'top_n',
        advancement_count: 3,
        advancement_type: 'total_pinfall',
        tiebreaker_rule: 'highest_game',
        carry_over_enabled: false,
        delay_rounds: 0,
        description: 'Top 3 finalists — championship exit node',
        is_active: true,
        execution_order: 2,
        duplicate_advancement_policy: 'single_and_promote',
      },
    ],
  };
}

export function cloneDefaultEventStructurePayload(): EventStructurePayload {
  return JSON.parse(JSON.stringify(getDefaultEventStructurePayload())) as EventStructurePayload;
}
