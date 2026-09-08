import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BracketEngineFinancialsReport,
  SideActionsAPI,
} from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import { sideActionQueryKeys } from '../../features/side-actions/shared';
import { getStoredBrackets, getUserDisplayNames } from '../../utils/sideActionBracketStorage';
import type { Bracket } from '../../utils/bracketEngine/types';
import type { SideActionEntrantRow } from './SideActionEntrantsModal';
import {
  effectiveByePrizeDistribution,
  effectivePrizeDistribution,
} from '../../features/side-actions/shared';
import type { RolloverCluster } from './rolloverClusters';
import {
  membersForClusterOp,
  operationKeysForClusterOp,
  resetClusterPools,
  unlockClusterPools,
} from './rolloverClusterOps';

export type BracketOperationKey = `${number}:${number}`;
export type BracketOperationKeys = ReadonlySet<BracketOperationKey>;

const operationKey = (sideActionId: number, poolId: number): BracketOperationKey =>
  `${sideActionId}:${poolId}`;

const updateOperation = (
  setter: React.Dispatch<React.SetStateAction<Set<BracketOperationKey>>>,
  key: BracketOperationKey,
  active: boolean
) => {
  setter((current) => {
    const next = new Set(current);
    if (active) next.add(key);
    else next.delete(key);
    return next;
  });
};

export interface BracketViewerState {
  name: string;
  poolId?: number;
  poolLabel?: string;
  brackets: Bracket[];
  userDisplayNames: Record<number, string>;
  /** Full-pot place prizes; used when the pot has 8 seated. */
  payouts?: { first: number; second: number; third?: number; fourth?: number };
  /** Bye-pot place prizes; used when seated < 8. */
  byePayouts?: { first: number; second: number; third?: number; fourth?: number };
  /** Stage-ordered event games [G1, G2, Final]. */
  gameNumbers?: number[];
  bracketNumberOffset?: number;
}

export interface BracketConflictsState extends BracketViewerState {
  sideActionId?: number;
}

export interface BracketFinancialsState {
  name: string;
  poolId: number;
  poolLabel: string;
  sideActionId?: number;
  report?: BracketEngineFinancialsReport;
}

export interface EntrantsViewState {
  name: string;
  sideActionId: number;
  poolId?: number;
  poolLabel?: string;
  entrants: SideActionEntrantRow[];
  entryUnit?: 'bowler' | 'team';
}

export function useBracketActions() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<BracketOperationKey>>(() => new Set());
  const [detailsLoadingIds, setDetailsLoadingIds] = useState<Set<BracketOperationKey>>(
    () => new Set()
  );
  const [syncingScoresIds, setSyncingScoresIds] = useState<Set<BracketOperationKey>>(
    () => new Set()
  );
  const [viewingBrackets, setViewingBrackets] = useState<BracketViewerState | null>(null);
  const [conflictsView, setConflictsView] = useState<BracketConflictsState | null>(null);
  const [financialsView, setFinancialsView] = useState<BracketFinancialsState | null>(null);
  const [loadingFinancialsIds, setLoadingFinancialsIds] = useState<Set<BracketOperationKey>>(
    () => new Set()
  );
  const [unlockingIds, setUnlockingIds] = useState<Set<BracketOperationKey>>(() => new Set());
  const [entrantsView, setEntrantsView] = useState<EntrantsViewState | null>(null);
  const [reportsMenu, setReportsMenu] = useState<{
    id: number;
    name: string;
    sideActionType?: string;
  } | null>(null);
  const [lockingId, setLockingId] = useState<number | null>(null);
  const financialRequestRef = useRef(0);
  const entrantsRequestRef = useRef(0);
  const bracketViewRequestRef = useRef(0);
  const generateRequestRef = useRef(new Map<BracketOperationKey, number>());
  const conflictsViewRef = useRef<BracketConflictsState | null>(null);
  useEffect(() => {
    conflictsViewRef.current = conflictsView;
  }, [conflictsView]);
  const closeEntrantsView = useCallback(() => {
    entrantsRequestRef.current += 1;
    setEntrantsView(null);
  }, []);
  const closeFinancialsView = useCallback(() => {
    financialRequestRef.current += 1;
    setFinancialsView(null);
  }, []);
  const closeBracketView = useCallback(() => {
    bracketViewRequestRef.current += 1;
    setViewingBrackets(null);
  }, []);

  const invalidateSideActions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
  }, [queryClient]);

  const openFinancials = useCallback(
    async (
      sideActionId: number,
      name: string,
      poolId: number,
      poolLabel: string,
      report?: BracketEngineFinancialsReport
    ) => {
      const requestVersion = ++financialRequestRef.current;
      setActionError(null);
      if (report) {
        setFinancialsView({ name, sideActionId, poolId, poolLabel, report });
        return;
      }
      const key = operationKey(sideActionId, poolId);
      updateOperation(setLoadingFinancialsIds, key, true);
      setFinancialsView({ name, sideActionId, poolId, poolLabel });
      try {
        const fetched = await SideActionsAPI.getBracketEngineFinancials(sideActionId, poolId);
        if (requestVersion !== financialRequestRef.current) return;
        setFinancialsView({ name, sideActionId, poolId, poolLabel, report: fetched });
      } catch (err) {
        if (requestVersion !== financialRequestRef.current) return;
        setFinancialsView(null);
        setActionError(getErrorMessage(err, 'Failed to load financial report.'));
      } finally {
        updateOperation(setLoadingFinancialsIds, key, false);
      }
    },
    []
  );

  const handleViewDetails = useCallback(async (
    sideActionId: number,
    name: string,
    poolId?: number,
    poolLabel?: string
  ) => {
    const requestVersion = ++entrantsRequestRef.current;
    setActionError(null);
    const key = operationKey(sideActionId, poolId ?? 0);
    updateOperation(setDetailsLoadingIds, key, true);
    try {
      const [entrants, sideAction] = await Promise.all([
        SideActionsAPI.getEntrants(sideActionId, poolId),
        SideActionsAPI.getSideAction(sideActionId),
      ]);
      if (requestVersion !== entrantsRequestRef.current) return;
      setEntrantsView({
        sideActionId,
        name,
        poolId,
        poolLabel,
        entrants,
        entryUnit: sideAction.type_config?.entry_unit === 'team' ? 'team' : 'bowler',
      });
    } catch (err) {
      if (requestVersion !== entrantsRequestRef.current) return;
      setActionError(getErrorMessage(err, 'Failed to load entrants.'));
    } finally {
      updateOperation(setDetailsLoadingIds, key, false);
    }
  }, []);

  const handleViewSideAction = useCallback(
    async (sideActionId: number, name: string, poolId: number, poolLabel: string) => {
      const requestVersion = ++bracketViewRequestRef.current;
      setActionError(null);
      const key = operationKey(sideActionId, poolId);
      updateOperation(setSyncingScoresIds, key, true);
      try {
        await SideActionsAPI.syncBracketScores(sideActionId, poolId);
        invalidateSideActions();
        const refreshed = await SideActionsAPI.getSideAction(sideActionId);
        if (requestVersion !== bracketViewRequestRef.current) return;
        const pool = refreshed.pools.find((candidate) => candidate.id === poolId);
        if (!pool?.bracket_engine) {
          throw new Error('This squad pool has no generated brackets.');
        }
        const dist = effectivePrizeDistribution(refreshed, poolId);
        const byeDist = effectiveByePrizeDistribution(refreshed, poolId);
        setViewingBrackets({
          name,
          poolId,
          poolLabel,
          brackets: getStoredBrackets({ bracket_engine: pool.bracket_engine }),
          userDisplayNames: getUserDisplayNames({ bracket_engine: pool.bracket_engine }),
          payouts: {
            first: Number(dist['1'] ?? dist.first ?? 0),
            second: Number(dist['2'] ?? dist.second ?? 0),
            third: Number(dist['3'] ?? dist.third ?? 0),
            fourth: Number(dist['4'] ?? dist.fourth ?? 0),
          },
          byePayouts: {
            first: Number(byeDist['1'] ?? byeDist.first ?? dist['1'] ?? dist.first ?? 0),
            second: Number(byeDist['2'] ?? byeDist.second ?? dist['2'] ?? dist.second ?? 0),
            third: Number(byeDist['3'] ?? byeDist.third ?? dist['3'] ?? dist.third ?? 0),
            fourth: Number(byeDist['4'] ?? byeDist.fourth ?? dist['4'] ?? dist.fourth ?? 0),
          },
          gameNumbers: pool.game_numbers ?? [],
          bracketNumberOffset: pool.bracket_number_offset ?? 0,
        });
      } catch (err) {
        if (requestVersion !== bracketViewRequestRef.current) return;
        setActionError(getErrorMessage(err, 'Failed to sync bracket scores.'));
      } finally {
        updateOperation(setSyncingScoresIds, key, false);
      }
    },
    [invalidateSideActions]
  );

  const handleGenerate = useCallback(
    async (
      sideActionId: number,
      poolId: number,
      poolLabel: string,
      resetFirst = false,
      rolloverCluster?: RolloverCluster | null
    ) => {
      const operationKeys = operationKeysForClusterOp(sideActionId, poolId, rolloverCluster);
      const key = operationKey(sideActionId, poolId);
      const requestVersion = (generateRequestRef.current.get(key) ?? 0) + 1;
      generateRequestRef.current.set(key, requestVersion);
      setActionError(null);
      for (const operation of operationKeys) {
        updateOperation(setGeneratingIds, operation, true);
      }
      try {
        if (resetFirst) {
          await resetClusterPools(membersForClusterOp(sideActionId, poolId, rolloverCluster));
        }
        await SideActionsAPI.generateBracketPots(sideActionId, poolId);
        invalidateSideActions();
        if (requestVersion !== generateRequestRef.current.get(key)) return;
        const currentConflictsView = conflictsViewRef.current;
        if (
          currentConflictsView?.sideActionId === sideActionId &&
          currentConflictsView.poolId === poolId
        ) {
          const refreshed = await SideActionsAPI.getSideAction(sideActionId);
          if (
            requestVersion !== generateRequestRef.current.get(key) ||
            conflictsViewRef.current !== currentConflictsView
          ) {
            return;
          }
          const pool = refreshed.pools.find((candidate) => candidate.id === poolId);
          setConflictsView({
            name: refreshed.name,
            poolId,
            poolLabel,
            brackets: getStoredBrackets({ bracket_engine: pool?.bracket_engine }),
            userDisplayNames: getUserDisplayNames({ bracket_engine: pool?.bracket_engine }),
            sideActionId,
          });
        }
      } catch (err) {
        if (requestVersion !== generateRequestRef.current.get(key)) return;
        setActionError(getErrorMessage(err, 'Failed to generate brackets.'));
      } finally {
        if (requestVersion === generateRequestRef.current.get(key)) {
          for (const operation of operationKeys) {
            updateOperation(setGeneratingIds, operation, false);
          }
        }
      }
    },
    [invalidateSideActions]
  );

  const closeConflictsView = useCallback(() => {
    const current = conflictsViewRef.current;
    if (current?.sideActionId != null && current.poolId != null) {
      const key = operationKey(current.sideActionId, current.poolId);
      generateRequestRef.current.set(
        key,
        (generateRequestRef.current.get(key) ?? 0) + 1
      );
      updateOperation(setGeneratingIds, key, false);
    }
    conflictsViewRef.current = null;
    setConflictsView(null);
  }, []);

  const handleLockOneEntries = useCallback(
    async (sideActionId: number) => {
      setActionError(null);
      setLockingId(sideActionId);
      try {
        await SideActionsAPI.lockSideActionEntries(sideActionId);
        invalidateSideActions();
      } catch (err) {
        setActionError(getErrorMessage(err, 'Failed to lock entries.'));
      } finally {
        setLockingId(null);
      }
    },
    [invalidateSideActions]
  );

  const handleUnlockEntries = useCallback(
    async (
      sideActionId: number,
      poolId: number,
      rolloverCluster?: RolloverCluster | null
    ) => {
      const operationKeys = operationKeysForClusterOp(sideActionId, poolId, rolloverCluster);
      setActionError(null);
      for (const operation of operationKeys) {
        updateOperation(setUnlockingIds, operation, true);
      }
      try {
        await unlockClusterPools(membersForClusterOp(sideActionId, poolId, rolloverCluster));
        invalidateSideActions();
      } catch (err) {
        setActionError(getErrorMessage(err, 'Failed to unlock entries.'));
      } finally {
        for (const operation of operationKeys) {
          updateOperation(setUnlockingIds, operation, false);
        }
      }
    },
    [invalidateSideActions]
  );

  return {
    actionError,
    setActionError,
    generatingIds,
    detailsLoadingIds,
    syncingScoresIds,
    viewingBrackets,
    setViewingBrackets: closeBracketView,
    conflictsView,
    setConflictsView,
    closeConflictsView,
    financialsView,
    setFinancialsView: closeFinancialsView,
    loadingFinancialsIds,
    unlockingIds,
    entrantsView,
    setEntrantsView: closeEntrantsView,
    reportsMenu,
    setReportsMenu,
    lockingId,
    openFinancials,
    handleViewDetails,
    handleViewSideAction,
    handleGenerate,
    handleLockOneEntries,
    handleUnlockEntries,
  };
}
