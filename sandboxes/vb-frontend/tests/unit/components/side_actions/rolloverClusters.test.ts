import { describe, expect, it } from 'vitest';
import { SideAction, SideActionStatus, SideActionType } from '../../../../src/types/side_action';
import {
  buildRolloverClusters,
  findRolloverClusterForPool,
  isRolloverClusterLeader,
} from '../../../../src/components/side_actions/rolloverClusters';

function bracketAction(
  id: number,
  name: string,
  squadId: number,
  poolId: number,
  clusterIds: number[] = []
): SideAction {
  return {
    id,
    name,
    tournament_id: 1,
    event_id: 1,
    side_action_type: SideActionType.BRACKET,
    entry_fee: 5,
    max_participants: 100,
    game_numbers: [1, 2, 3],
    is_active: true,
    type_config: {},
    pools: [
      {
        id: poolId,
        side_action_id: id,
        squad_id: squadId,
        squad_name: 'Squad A',
        is_enabled: true,
        game_numbers: [1, 2, 3],
        status: SideActionStatus.REGISTRATION_OPEN,
        override_config: {},
        entry_fee: 5,
        rollover_cluster_side_action_ids: clusterIds,
      },
    ],
  } as SideAction;
}

describe('rolloverClusters', () => {
  it('groups linked bracket sets on the same squad', () => {
    const scratch = bracketAction(1, 'Scratch', 10, 101, [1, 2]);
    const handicap = bracketAction(2, 'Handicap', 10, 102, [1, 2]);
    const clusters = buildRolloverClusters([scratch, handicap]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members).toHaveLength(2);
    expect(findRolloverClusterForPool(clusters, 1, 101)).not.toBeNull();
    expect(isRolloverClusterLeader(clusters[0], 1, 101)).toBe(true);
    expect(isRolloverClusterLeader(clusters[0], 2, 102)).toBe(false);
  });

  it('keeps unlinked sets out of clusters', () => {
    const solo = bracketAction(3, 'Solo', 10, 103);
    expect(buildRolloverClusters([solo])).toHaveLength(0);
  });
});
