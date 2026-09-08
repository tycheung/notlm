import { describe, expect, it } from 'vitest';

import { createTournamentFlow } from '../../../../../src/components/event/flow/utils/layoutUtils';

describe('layoutUtils conflict detection', () => {
  it('passes competition_method onto round flow nodes', () => {
    const rounds: any[] = [
      {
        id: 1,
        round_number: 1,
        status: 'scheduled',
        allows_reentry: false,
        game_count: 3,
        competition_method: 'stepladder',
      },
    ];
    const flow = createTournamentFlow(rounds, [], []);
    const node = flow.nodes.find((n: any) => n.data.round_id === 1);
    expect(node?.data.competition_method).toBe('stepladder');
  });

  it('labels eliminator flow nodes from their outgoing round relationships', () => {
    const rounds: any[] = [
      {
        id: 1,
        round_number: 1,
        status: 'scheduled',
        allows_reentry: false,
        game_count: 3,
        competition_method: 'eliminator',
      },
      {
        id: 2,
        round_number: 2,
        status: 'scheduled',
        allows_reentry: false,
        game_count: 3,
        competition_method: 'eliminator',
      },
    ];
    const relationships: any[] = [
      {
        id: 11,
        source_round_id: 1,
        target_round_id: 2,
        advancement_filter: 'top_n',
      },
      {
        id: 12,
        source_round_id: 2,
        target_round_id: null,
        final_node_id: 30,
        advancement_filter: 'top_n',
      },
    ];

    const flow = createTournamentFlow(rounds, relationships, []);
    const qualifier = flow.nodes.find((node: any) => node.data.round_id === 1);
    const eliminator = flow.nodes.find((node: any) => node.data.round_id === 2);

    expect(qualifier?.data.competition_method_display_label).toBe('Qualifier');
    expect(eliminator?.data.competition_method_display_label).toBe('Eliminator');
  });

  it('flags game_count mismatch between round and competition_method_config', () => {
    const rounds: any[] = [
      { id: 1, round_number: 1, status: 'completed', allows_reentry: false, game_count: 1 },
      { id: 2, round_number: 2, status: 'completed', allows_reentry: false, game_count: 1 },
      {
        id: 3,
        round_number: 3,
        status: 'scheduled',
        allows_reentry: false,
        game_count: 3,
        competition_method_config: { game_count: 1 },
      },
    ];
    const relationships: any[] = [
      {
        id: 11,
        source_round_id: 1,
        target_round_id: 3,
        advancement_filter: 'winners',
      },
      {
        id: 12,
        source_round_id: 2,
        target_round_id: 3,
        advancement_filter: 'winners',
      },
    ];
    const flow = createTournamentFlow(rounds, relationships, []);
    const target = flow.nodes.find((n: any) => n.data.round_id === 3);
    expect(target?.data.has_game_conflict).toBe(true);
  });

  it('does not flag conflict when merge mode already configured', () => {
    const rounds: any[] = [
      { id: 1, round_number: 1, status: 'completed', allows_reentry: false, game_count: 1 },
      { id: 2, round_number: 2, status: 'completed', allows_reentry: false, game_count: 1 },
      {
        id: 3,
        round_number: 3,
        status: 'scheduled',
        allows_reentry: false,
        game_count: 3,
        competition_method_config: { game_count: 1 },
        merge_resolution_mode: 'ranking_based',
      },
    ];
    const relationships: any[] = [
      {
        id: 11,
        source_round_id: 1,
        target_round_id: 3,
        advancement_filter: 'winners',
      },
      {
        id: 12,
        source_round_id: 2,
        target_round_id: 3,
        advancement_filter: 'winners',
      },
    ];
    const flow = createTournamentFlow(rounds, relationships, []);
    const target = flow.nodes.find((n: any) => n.data.round_id === 3);
    expect(target?.data.has_game_conflict).toBe(false);
  });
});
