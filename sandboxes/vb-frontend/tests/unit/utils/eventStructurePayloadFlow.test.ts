import { describe, expect, it } from 'vitest';

import {
  isSupportedPayloadVersion,
  payloadToFlowViewModel,
  ensurePayloadRoundsHaveSquads,
  syncFinalNodePlacementCounts,
  syncPodsRelationshipAdvancementCounts,
  syncStructurePayloadCounts,
  syncRoundScoringFields,
  squadsListFromRoundSpec,
} from '@/utils/eventStructurePayloadFlow';
import type { EventStructurePayload } from '@/constants/defaultEventStructurePayload';

describe('eventStructurePayloadFlow', () => {
  it('supports only payload version 2', () => {
    expect(isSupportedPayloadVersion(2)).toBe(true);
    expect(isSupportedPayloadVersion(1)).toBe(false);
    expect(isSupportedPayloadVersion('2')).toBe(false);
  });

  it('repairs a legacy bracket round that still has eliminator scoring metadata', () => {
    const round: Record<string, unknown> = {
      competition_method: 'bracket',
      round_format_name: '3-game qualifying',
      game_count: 5,
    };

    syncRoundScoringFields(round);

    expect(round).toMatchObject({
      score_type: 'match_play',
      race_to_wins: 3,
      max_games: 5,
    });
    expect(round.round_format_name).toBeUndefined();
  });

  it('does not let stale max_games override RR games per match', () => {
    const round: Record<string, unknown> = {
      competition_method: 'round_robin',
      game_count: 1,
      max_games: 32,
      race_to_wins: 2,
      competition_method_config: {
        games_per_match: 1,
        game_count: 1,
        total_matches_or_games: 32,
        series_decision_mode: 'games_total',
        bonus_pins: { win: 30, tie: 15, loss: 0 },
      },
    };

    syncRoundScoringFields(round);

    expect(round).toMatchObject({
      score_type: 'match_play',
      race_to_wins: 1,
      max_games: 1,
      game_count: 1,
    });
    expect(round.competition_method_config).toMatchObject({
      games_per_match: 1,
      game_count: 1,
      total_matches_or_games: 32,
      series_decision_mode: 'games_total',
    });
  });

  it('maps relationship carry-over enabled fields into flow view model', () => {
    const payload: EventStructurePayload = {
      version: 2,
      rounds: [
        {
          ref: 'r1',
          round_number: 1,
          game_count: 3,
          number_of_squads: 1,
          competition_method: 'eliminator',
          competition_method_config: { game_count: 3 },
        },
        {
          ref: 'r2',
          round_number: 2,
          game_count: 3,
          number_of_squads: 1,
          competition_method: 'bracket',
          competition_method_config: { game_count: 1, bracket_mode: 'single_elimination' },
        },
      ],
      relationships: [
        {
          source_ref: 'r1',
          target_ref: 'r2',
          advancement_filter: 'winners',
          advancement_count: 8,
          carry_over_enabled: true,
        },
      ],
      final_nodes: [],
    };

    const vm = payloadToFlowViewModel(payload);
    expect(vm.relationships).toHaveLength(1);
    expect(vm.relationships[0].carry_over_enabled).toBe(true);

    // Round ranking/tiebreaker are no longer sourced from payload rounds.
    expect(Object.hasOwn(vm.rounds[0], 'advancement_type')).toBe(false);
    expect(Object.hasOwn(vm.rounds[0], 'tiebreaker_rule')).toBe(false);
  });

  it('syncs a final node placement count from its fixed-count relationship', () => {
    const payload: EventStructurePayload = {
      version: 2,
      rounds: [],
      final_nodes: [{ ref: 'championship', placement_count: 3 }],
      relationships: [
        {
          source_ref: 'final',
          target_final_ref: 'championship',
          advancement_count: 5,
        },
      ],
    };

    const synced = syncFinalNodePlacementCounts(payload);

    expect(synced.final_nodes?.[0].placement_count).toBe(5);
    expect(payload.final_nodes?.[0].placement_count).toBe(3);
  });

  it('sums multiple fixed-count relationships to the same final node', () => {
    const payload: EventStructurePayload = {
      version: 2,
      rounds: [],
      final_nodes: [{ ref: 'championship', placement_count: 3 }],
      relationships: [
        {
          source_ref: 'semifinal_a',
          target_final_ref: 'championship',
          advancement_count: 2,
        },
        {
          source_ref: 'semifinal_b',
          target_final_ref: 'championship',
          advancement_count: 4,
        },
      ],
    };

    const synced = syncFinalNodePlacementCounts(payload);

    expect(synced.final_nodes?.[0].placement_count).toBe(6);
  });

  it('leaves placement count unchanged for percentage-only relationships', () => {
    const payload: EventStructurePayload = {
      version: 2,
      rounds: [],
      final_nodes: [{ ref: 'championship', placement_count: 3 }],
      relationships: [
        {
          source_ref: 'final',
          target_final_ref: 'championship',
          advancement_percentage: 25,
        },
      ],
    };

    expect(syncFinalNodePlacementCounts(payload)).toBe(payload);
  });

  it('defaults an empty squads list to one named squad', () => {
    const spec = {
      round_number: 3,
      friendly_name: 'Pods 2',
      squads: [],
      number_of_squads: 0,
    };
    expect(squadsListFromRoundSpec(spec)).toEqual([
      { name: 'Round 3: Pods 2', max_participants: 24 },
    ]);
  });

  it('fills missing squads on every round before a format is saved or applied', () => {
    const payload: EventStructurePayload = {
      version: 2,
      rounds: [
        {
          ref: 'pods2',
          round_number: 3,
          friendly_name: 'Pods 2',
          squads: [],
          number_of_squads: 0,
        },
      ],
      relationships: [],
      final_nodes: [],
    };
    const next = ensurePayloadRoundsHaveSquads(payload);
    expect(next.rounds[0].number_of_squads).toBe(1);
    expect(next.rounds[0].squads).toEqual([
      { name: 'Round 3: Pods 2', max_participants: 24 },
    ]);
    expect(payload.rounds[0].number_of_squads).toBe(0);
  });

  it('syncs pods outgoing relationship advancement_count from pod membership', () => {
    const payload: EventStructurePayload = {
      version: 2,
      rounds: [
        {
          ref: 'qual',
          round_number: 1,
          competition_method: 'eliminator',
          game_count: 3,
        },
        {
          ref: 'pods',
          round_number: 2,
          competition_method: 'pods',
          game_count: 1,
          competition_method_config: {
            pod_size_min: 4,
            pod_size_max: 6,
            advance_by_size: { '5': 2 },
            pod_membership: Array.from({ length: 12 }, () => [1, 2, 3, 4, 5]),
          },
        },
        {
          ref: 'pods2',
          round_number: 3,
          competition_method: 'pods',
          game_count: 1,
        },
      ],
      relationships: [
        {
          source_ref: 'qual',
          target_ref: 'pods',
          advancement_count: 60,
        },
        {
          source_ref: 'pods',
          target_ref: 'pods2',
          advancement_count: 8,
        },
      ],
      final_nodes: [],
    };

    const synced = syncPodsRelationshipAdvancementCounts(payload);
    expect(synced.relationships?.[1].advancement_count).toBe(24);
    expect(syncStructurePayloadCounts(payload).relationships?.[1].advancement_count).toBe(24);
  });

  it('treats pods as pinfall scoring, not match-play series', () => {
    const round: Record<string, unknown> = {
      competition_method: 'pods',
      score_type: 'match_play',
      race_to_wins: 2,
      max_games: 3,
      round_format_name: '3-game qualifying',
      competition_method_config: {
        pod_size_min: 4,
        pod_size_max: 4,
        advance_by_size: { '4': 2 },
      },
    };

    syncRoundScoringFields(round);

    expect(round.score_type).toBeUndefined();
    expect(round.race_to_wins).toBeUndefined();
    expect(round.max_games).toBeUndefined();
    expect(round.round_format_name).toBe('3-game qualifying');
  });
});
