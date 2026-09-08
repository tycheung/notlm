import { SideAction } from '../../types/side_action';

export interface RolloverClusterMember {
  sideActionId: number;
  poolId: number;
  label: string;
}

export interface RolloverCluster {
  squadId: number;
  members: RolloverClusterMember[];
  leaderSideActionId: number;
  leaderPoolId: number;
}

export function formatBracketSetLabel(action: SideAction): string {
  const cfg = (action.type_config ?? {}) as { handicap_mode?: string; game_numbers?: number[] };
  const mode = cfg.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap';
  const games = (cfg.game_numbers?.length ? cfg.game_numbers : action.game_numbers ?? [])
    .slice()
    .sort((a, b) => a - b)
    .join(', ');
  return `${action.name} (${mode}${games ? ` · G${games}` : ''})`;
}

export function buildRolloverClusters(actions: SideAction[]): RolloverCluster[] {
  const clusters: RolloverCluster[] = [];
  const visited = new Set<string>();

  for (const action of actions) {
    for (const pool of action.pools.filter((candidate) => candidate.is_enabled)) {
      const component = [...(pool.rollover_cluster_side_action_ids ?? [])].sort(
        (a, b) => a - b
      );
      if (component.length < 2) {
        continue;
      }
      const key = `${pool.squad_id}:${component.join(',')}`;
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      const members: RolloverClusterMember[] = [];
      for (const sideActionId of component) {
        const memberAction = actions.find((candidate) => candidate.id === sideActionId);
        const memberPool = memberAction?.pools.find(
          (candidatePool) =>
            candidatePool.is_enabled && candidatePool.squad_id === pool.squad_id
        );
        if (!memberAction || !memberPool) {
          continue;
        }
        members.push({
          sideActionId,
          poolId: memberPool.id,
          label: formatBracketSetLabel(memberAction),
        });
      }
      if (members.length < 2) {
        continue;
      }
      const leader = members[0];
      clusters.push({
        squadId: pool.squad_id,
        members,
        leaderSideActionId: leader.sideActionId,
        leaderPoolId: leader.poolId,
      });
    }
  }

  return clusters;
}

export function findRolloverClusterForPool(
  clusters: RolloverCluster[],
  sideActionId: number,
  poolId: number
): RolloverCluster | null {
  return (
    clusters.find((cluster) =>
      cluster.members.some(
        (member) => member.sideActionId === sideActionId && member.poolId === poolId
      )
    ) ?? null
  );
}

export function isRolloverClusterLeader(
  cluster: RolloverCluster,
  sideActionId: number,
  poolId: number
): boolean {
  return cluster.leaderSideActionId === sideActionId && cluster.leaderPoolId === poolId;
}

export function clusterOperationKeys(cluster: RolloverCluster): `${number}:${number}`[] {
  return cluster.members.map(
    (member) => `${member.sideActionId}:${member.poolId}` as `${number}:${number}`
  );
}

export function clusterMemberLabels(cluster: RolloverCluster): string {
  return cluster.members.map((member) => member.label).join(' + ');
}
