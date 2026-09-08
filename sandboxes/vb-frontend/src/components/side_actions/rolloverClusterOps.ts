import { SideActionsAPI } from '../../api/side-actions';
import { clusterOperationKeys, type RolloverCluster } from './rolloverClusters';

export type ClusterMemberRef = { sideActionId: number; poolId: number };

export function membersForClusterOp(
  sideActionId: number,
  poolId: number,
  rolloverCluster?: RolloverCluster | null
): ClusterMemberRef[] {
  return rolloverCluster?.members ?? [{ sideActionId, poolId }];
}

export function operationKeysForClusterOp(
  sideActionId: number,
  poolId: number,
  rolloverCluster?: RolloverCluster | null
): ReadonlyArray<`${number}:${number}`> {
  if (rolloverCluster) return clusterOperationKeys(rolloverCluster);
  return [`${sideActionId}:${poolId}`];
}

export async function resetClusterPools(members: ClusterMemberRef[]): Promise<void> {
  for (const member of members) {
    await SideActionsAPI.resetSideActionPoolConfiguration(
      member.sideActionId,
      member.poolId
    );
  }
}

export async function unlockClusterPools(members: ClusterMemberRef[]): Promise<void> {
  for (const member of members) {
    await SideActionsAPI.unlockSideActionPoolEntries(member.sideActionId, member.poolId);
  }
}
