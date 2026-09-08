import React, { useMemo } from 'react';
import Button from '../common/Button';
import { SideAction, SideActionStatus } from '../../types/side_action';
import { getStoredBrackets, getUserDisplayNames } from '../../utils/sideActionBracketStorage';
import type { BracketConflictsState } from './useBracketActions';
import {
  getEffectivePools,
} from '../../features/side-actions/shared';
import type { BracketOperationKeys } from './useBracketActions';
import {
  buildRolloverClusters,
  clusterMemberLabels,
  findRolloverClusterForPool,
  isRolloverClusterLeader,
  clusterOperationKeys,
  type RolloverCluster,
} from './rolloverClusters';
import {
  buildBracketPoolLines,
  roundLabelForSquad,
  type DeskScopeRound,
  type DeskScopeSelection,
} from './sideActionDeskScope';

interface BracketSideActionsTableProps {
  bracketActions: SideAction[];
  rounds?: DeskScopeRound[];
  deskScope?: DeskScopeSelection;
  rolloverClusters?: RolloverCluster[];
  isAuthorizedForManagement: boolean;
  detailsLoadingIds: BracketOperationKeys;
  generatingIds: BracketOperationKeys;
  syncingScoresIds: BracketOperationKeys;
  loadingFinancialsIds: BracketOperationKeys;
  unlockingIds: BracketOperationKeys;
  onEdit: (sideActionId: number) => void;
  onViewDetails: (sideActionId: number, name: string, poolId: number, poolLabel: string) => void;
  onLockAndGenerate: (
    sideActionId: number,
    poolId: number,
    poolLabel: string,
    hasBrackets: boolean
  ) => void;
  onUnlockEntries: (
    sideActionId: number,
    poolId: number,
    poolLabel: string
  ) => void;
  onViewSideAction: (
    sideActionId: number,
    name: string,
    poolId: number,
    poolLabel: string
  ) => void;
  onFinancials: (
    sideActionId: number,
    name: string,
    poolId: number,
    poolLabel: string
  ) => void;
  onConflicts: (state: BracketConflictsState) => void;
  onReports: (sideActionId: number, name: string) => void;
  onCopy: (sideAction: SideAction, defaultSquadId?: number) => void;
  onDelete: (sideActionId: number, name: string) => void;
}

function poolStatusLabel(status: SideActionStatus): string {
  if (status === SideActionStatus.COMPLETED) return 'Completed';
  if (status === SideActionStatus.CANCELED) return 'Canceled';
  if (
    status === SideActionStatus.REGISTRATION_CLOSED ||
    status === SideActionStatus.IN_PROGRESS
  ) {
    return 'Locked for scores';
  }
  return 'Entries open';
}

const BracketSideActionsTable: React.FC<BracketSideActionsTableProps> = ({
  bracketActions,
  rounds = [],
  deskScope = { roundId: null, squadId: null },
  rolloverClusters = buildRolloverClusters(bracketActions),
  isAuthorizedForManagement,
  detailsLoadingIds,
  generatingIds,
  syncingScoresIds,
  loadingFinancialsIds,
  unlockingIds,
  onEdit,
  onViewDetails,
  onLockAndGenerate,
  onUnlockEntries,
  onViewSideAction,
  onFinancials,
  onConflicts,
  onReports,
  onCopy,
  onDelete,
}) => {
  const lines = useMemo(
    () => buildBracketPoolLines(bracketActions, rounds, deskScope),
    [bracketActions, rounds, deskScope]
  );

  if (bracketActions.length === 0) {
    return (
      <p className="text-sm text-text-muted py-4 text-center">
        {isAuthorizedForManagement
          ? 'No bracket side actions yet. Use Create new above to add one.'
          : 'No bracket side actions have been set up for this tournament.'}
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <p className="text-sm text-text-muted py-4 text-center">
        No bracket squad pools match the current round/squad filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border" aria-label="Bracket side actions">
        <thead className="bg-primary">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
              Round
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
              Squad
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
              Entry fee
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
              Games
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
              Max entries
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
              Handicap
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
              Total created
            </th>
            {isAuthorizedForManagement && (
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map(({ action, pool }, rowIdx) => {
            const effective = getEffectivePools(action).find((p) => p.pool.id === pool.id);
            const games = effective?.games ?? pool.game_numbers;
            const entryFee = effective?.entryFee ?? pool.entry_fee;
            const typeConfig = effective?.typeConfig ?? action.type_config ?? {};
            const handicapLabel =
              typeConfig.handicap_mode === 'scratch' ? 'Scratch' : 'Handicap';
            const poolConfig = { bracket_engine: pool.bracket_engine };
            const storedBrackets = getStoredBrackets(poolConfig);
            const hasBrackets = storedBrackets.length > 0;
            const totalCreated = storedBrackets.length;
            const opKey = `${action.id}:${pool.id}` as const;
            const rolloverCluster = findRolloverClusterForPool(
              rolloverClusters,
              action.id,
              pool.id
            );
            const isLinkedBatch = rolloverCluster != null;
            const isBatchLeader =
              rolloverCluster != null &&
              isRolloverClusterLeader(rolloverCluster, action.id, pool.id);
            const linkedLabel = rolloverCluster
              ? clusterMemberLabels(rolloverCluster)
              : '';
            const clusterKeys = rolloverCluster
              ? clusterOperationKeys(rolloverCluster)
              : [opKey];
            const clusterBusy = clusterKeys.some((key) => generatingIds.has(key));
            const clusterUnlocking = clusterKeys.some((key) => unlockingIds.has(key));
            const leaderMember = rolloverCluster?.members[0];

            return (
              <tr
                key={`${action.id}:${pool.id}`}
                className={rowIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-light'}
              >
                <td className="px-4 py-3 text-sm font-medium text-text">
                  {action.name}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {roundLabelForSquad(rounds, pool.squad_id)}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {pool.squad_name}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  ${entryFee.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {games.length === 1
                    ? `Game ${games[0]}`
                    : `Games ${games.join(' → ')}`}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {action.max_participants}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{handicapLabel}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {poolStatusLabel(pool.status)}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{totalCreated}</td>
                {isAuthorizedForManagement && (
                  <td className="px-4 py-3 text-sm">
                    <div className="space-y-2">
                      {isLinkedBatch && (
                        <p className="text-xs text-text-muted">
                          Rollover linked with {linkedLabel}. Generate and reset run
                          together for this squad.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => onEdit(action.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => onCopy(action, pool.squad_id)}
                          aria-label={`Copy — ${action.name}, ${pool.squad_name}`}
                        >
                          Copy
                        </Button>
                        <Button
                          variant="darkbackground"
                          size="small"
                          onClick={() =>
                            onViewDetails(
                              action.id,
                              action.name,
                              pool.id,
                              pool.squad_name
                            )
                          }
                          aria-label={`View entrants — ${action.name}, ${pool.squad_name}`}
                          disabled={detailsLoadingIds.has(opKey)}
                        >
                          View entrants
                        </Button>
                        {hasBrackets ? (
                          <>
                            {!isLinkedBatch || isBatchLeader ? (
                              <Button
                                variant="lightbackground"
                                size="small"
                                onClick={() =>
                                  onUnlockEntries(action.id, pool.id, pool.squad_name)
                                }
                                aria-label={`Unlock entries — ${action.name}, ${pool.squad_name}`}
                                disabled={clusterUnlocking}
                              >
                                {clusterUnlocking
                                  ? 'Unlocking…'
                                  : isLinkedBatch
                                    ? 'Unlock linked sets'
                                    : 'Unlock entries'}
                              </Button>
                            ) : null}
                            {!isLinkedBatch || isBatchLeader ? (
                              <Button
                                variant="danger"
                                size="small"
                                onClick={() =>
                                  onLockAndGenerate(
                                    action.id,
                                    pool.id,
                                    pool.squad_name,
                                    true
                                  )
                                }
                                aria-label={`Regenerate — ${action.name}, ${pool.squad_name}`}
                                disabled={clusterBusy}
                              >
                                {clusterBusy
                                  ? 'Regenerating…'
                                  : isLinkedBatch
                                    ? 'Regenerate linked sets'
                                    : 'Regenerate'}
                              </Button>
                            ) : null}
                          </>
                        ) : !isLinkedBatch || isBatchLeader ? (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() =>
                              onLockAndGenerate(
                                action.id,
                                pool.id,
                                pool.squad_name,
                                false
                              )
                            }
                            aria-label={`Lock & Generate — ${action.name}, ${pool.squad_name}`}
                            disabled={clusterBusy}
                          >
                            {clusterBusy
                              ? 'Generating…'
                              : isLinkedBatch
                                ? 'Lock & Generate linked sets'
                                : 'Lock & Generate'}
                          </Button>
                        ) : (
                          <p className="text-xs text-text-muted self-center">
                            Use Lock &amp; Generate linked sets on{' '}
                            {leaderMember?.label ?? 'the linked set above'}.
                          </p>
                        )}
                        {hasBrackets && (
                          <>
                            <Button
                              variant="lightbackground"
                              size="small"
                              onClick={() =>
                                onViewSideAction(
                                  action.id,
                                  action.name,
                                  pool.id,
                                  pool.squad_name
                                )
                              }
                              aria-label={`View Side Action — ${action.name}, ${pool.squad_name}`}
                              disabled={syncingScoresIds.has(opKey)}
                            >
                              {syncingScoresIds.has(opKey) ? 'Syncing…' : 'View Side Action'}
                            </Button>
                            <Button
                              variant="lightbackground"
                              size="small"
                              onClick={() =>
                                onFinancials(
                                  action.id,
                                  action.name,
                                  pool.id,
                                  pool.squad_name
                                )
                              }
                              aria-label={`Financials — ${action.name}, ${pool.squad_name}`}
                              disabled={loadingFinancialsIds.has(opKey)}
                            >
                              {loadingFinancialsIds.has(opKey) ? 'Loading…' : 'Financials'}
                            </Button>
                            <Button
                              variant="lightbackground"
                              size="small"
                              onClick={() =>
                                onConflicts({
                                  name: action.name,
                                  poolId: pool.id,
                                  poolLabel: pool.squad_name,
                                  brackets: storedBrackets,
                                  userDisplayNames: getUserDisplayNames(poolConfig),
                                  sideActionId: action.id,
                                })
                              }
                            >
                              Conflicts report
                            </Button>
                          </>
                        )}
                        <Button
                          variant="lightbackground"
                          size="small"
                          onClick={() => onReports(action.id, action.name)}
                        >
                          Reports
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => onDelete(action.id, action.name)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BracketSideActionsTable;
