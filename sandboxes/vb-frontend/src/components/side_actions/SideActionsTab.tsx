import React, { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageSectionHeading from '../common/PageSectionHeading';
import Button from '../common/Button';
import Loading from '../common/Loading';
import Alert from '../common/Alert';
import Card from '../common/Card';
import ConfirmDialog from '../common/ConfirmDialog';
import CreateSideActionModal from './CreateSideActionModal';
import EditSideActionModal from './EditSideActionModal';
import SideActionBracketViewerModal from './SideActionBracketViewerModal';
import BracketConflictsReportModal from './BracketConflictsReportModal';
import BracketFinancialsReportModal from './BracketFinancialsReportModal';
import BracketSideActionsTable from './BracketSideActionsTable';
import HighGameSideActionsTable from './HighGameSideActionsTable';
import HighSetSideActionsTable from './HighSetSideActionsTable';
import EliminatorSideActionsTable from './EliminatorSideActionsTable';
import MysteryDoublesSideActionsTable from '../../features/side-actions/mystery-doubles/MysteryDoublesSideActionsTable';
import MysteryGameSideActionsTable from '../../features/side-actions/mystery-game/MysteryGameSideActionsTable';
import SideActionEntrantsModal from './SideActionEntrantsModal';
import SideActionReportsMenuModal from './SideActionReportsMenuModal';
import HighGameStandingsModal from './HighGameStandingsModal';
import HighSetStandingsModal from './HighSetStandingsModal';
import EliminatorStandingsModal from './EliminatorStandingsModal';
import MysteryDoublesStandingsModal from '../../features/side-actions/mystery-doubles/MysteryDoublesStandingsModal';
import MysteryGameSpinModal from '../../features/side-actions/mystery-game/MysteryGameSpinModal';
import LoveDoublesSideActionsTable from '../../features/side-actions/love-doubles/LoveDoublesSideActionsTable';
import LoveDoublesStandingsModal from '../../features/side-actions/love-doubles/LoveDoublesStandingsModal';
import AlibiDoublesSideActionsTable from '../../features/side-actions/alibi-doubles/AlibiDoublesSideActionsTable';
import AlibiDoublesStandingsModal from '../../features/side-actions/alibi-doubles/AlibiDoublesStandingsModal';
import AlibiDoublesPairsModal from '../../features/side-actions/alibi-doubles/AlibiDoublesPairsModal';
import { useBracketActions } from './useBracketActions';
import { SideActionsAPI } from '../../api/side-actions';
import { SideActionType, type SideAction } from '../../types/side_action';
import { getErrorMessage } from '../../api/apiErrors';
import { EVENT_SIDE_ACTION_TYPE_CHOICES } from './sideActionTypeChoices';
import type { EventHandicapDefaults } from './EventSideActionsPanel';
import { sideActionQueryKeys } from '../../features/side-actions/shared';
import { useGuideModal } from '../../features/director-guide';
import {
  buildRolloverClusters,
  clusterMemberLabels,
  findRolloverClusterForPool,
} from './rolloverClusters';
import SideActionDeskToolbar from './SideActionDeskToolbar';
import CopySideActionsModal, {
  type CopySideActionRequestState,
} from './CopySideActionsModal';
import {
  deskScopeIsFiltered,
  filterSideActionsByDeskScope,
  type DeskScopeRound,
  type DeskScopeSelection,
} from './sideActionDeskScope';

interface SideActionsTabProps {
  tournamentId: number;
  eventId: number;
  eventName?: string;
  eventGameCount?: number;
  eventHandicap?: EventHandicapDefaults;
  isAuthorizedForManagement: boolean;
  allowTeamEntry?: boolean;
  rounds?: DeskScopeRound[];
}

const SideActionsTab: React.FC<SideActionsTabProps> = ({
  tournamentId,
  eventId,
  eventName,
  eventGameCount = 3,
  eventHandicap,
  isAuthorizedForManagement,
  allowTeamEntry = true,
  rounds = [],
}) => {
  const queryClient = useQueryClient();
  const [deskScope, setDeskScope] = useState<DeskScopeSelection>({
    roundId: null,
    squadId: null,
  });
  const [copyRequest, setCopyRequest] = useState<CopySideActionRequestState | null>(
    null
  );
  const [copyAllOpen, setCopyAllOpen] = useState(false);
  const [createType, setCreateType] = useState<SideActionType | null>(null);
  const openCreateSideAction = useCallback(() => {
    const first = EVENT_SIDE_ACTION_TYPE_CHOICES[0]?.type;
    if (first) setCreateType(first);
  }, [setCreateType]);
  useGuideModal('createSideAction', openCreateSideAction);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [lockAllConfirmOpen, setLockAllConfirmOpen] = useState(false);
  const [regenerateConfirm, setRegenerateConfirm] = useState<{
    sideActionId: number;
    poolId: number;
    poolLabel: string;
    cluster: ReturnType<typeof findRolloverClusterForPool>;
  } | null>(null);
  const [unlockEntriesConfirm, setUnlockEntriesConfirm] = useState<{
    sideActionId: number;
    poolId: number;
    poolLabel: string;
    cluster: ReturnType<typeof findRolloverClusterForPool>;
  } | null>(null);
  const [highGameStandingsId, setHighGameStandingsId] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [highSetStandingsId, setHighSetStandingsId] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [eliminatorStandingsId, setEliminatorStandingsId] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [mysteryDoublesStandingsId, setMysteryDoublesStandingsId] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [mysteryGameSpinId, setMysteryGameSpinId] = useState<{
    id: number;
    name: string;
    autoStartSpin?: boolean;
  } | null>(null);
  const [loveDoublesStandingsId, setLoveDoublesStandingsId] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [alibiDoublesStandingsId, setAlibiDoublesStandingsId] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [alibiDoublesPairsId, setAlibiDoublesPairsId] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const {
    actionError,
    setActionError,
    generatingIds,
    detailsLoadingIds,
    syncingScoresIds,
    viewingBrackets,
    setViewingBrackets,
    conflictsView,
    setConflictsView,
    closeConflictsView,
    financialsView,
    setFinancialsView,
    loadingFinancialsIds,
    entrantsView,
    setEntrantsView,
    reportsMenu,
    setReportsMenu,
    unlockingIds,
    openFinancials,
    handleViewDetails,
    handleViewSideAction,
    handleGenerate,
    handleUnlockEntries,
  } = useBracketActions();

  const {
    data: sideActions,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: sideActionQueryKeys.list(tournamentId, eventId),
    queryFn: () =>
      SideActionsAPI.getSideActions({
        tournament_id: tournamentId,
        event_id: eventId,
        active_only: false,
      }),
    enabled: tournamentId > 0,
  });
  const { data: lockStatus } = useQuery({
    queryKey: sideActionQueryKeys.eventLockStatus(eventId),
    queryFn: () => SideActionsAPI.getEventLockStatus(eventId),
    enabled: eventId > 0 && isAuthorizedForManagement,
  });
  const lockAllMutation = useMutation({
    mutationFn: () => SideActionsAPI.lockAllEventEntries(eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: sideActionQueryKeys.eventLockStatus(eventId),
      });
      void queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
      setActionError(null);
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, 'Failed to lock side action entries.')),
  });
  const deleteMutation = useMutation({
    mutationFn: (sideActionId: number) => SideActionsAPI.deleteSideAction(sideActionId),
    onSuccess: () => {
      setDeleteConfirm(null);
      void queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: sideActionQueryKeys.eventLockStatus(eventId),
      });
      setActionError(null);
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, 'Failed to delete side action.')),
  });

  const activeSideActions = (sideActions ?? []).filter(
    (action) => action.is_active !== false && action.event_id === eventId
  );
  const scopedSideActions = filterSideActionsByDeskScope(
    activeSideActions,
    rounds,
    deskScope
  );
  const bracketActions = scopedSideActions.filter(
    (action) => action.side_action_type === SideActionType.BRACKET
  );
  const rolloverClusters = buildRolloverClusters(
    activeSideActions.filter(
      (action) => action.side_action_type === SideActionType.BRACKET
    )
  );
  const highGameActions = scopedSideActions.filter(
    (action) => action.side_action_type === SideActionType.HIGH_GAME
  );
  const highSetActions = scopedSideActions.filter(
    (action) => action.side_action_type === SideActionType.HIGH_SET
  );
  const eliminatorActions = scopedSideActions.filter(
    (action) => action.side_action_type === SideActionType.ELIMINATOR
  );
  const mysteryDoublesActions = scopedSideActions.filter(
    (action) => action.side_action_type === SideActionType.MYSTERY_DOUBLES
  );
  const mysteryGameActions = scopedSideActions.filter(
    (action) => action.side_action_type === SideActionType.MYSTERY_GAME
  );
  const loveDoublesActions = scopedSideActions.filter(
    (action) => action.side_action_type === SideActionType.LOVE_DOUBLES
  );
  const alibiDoublesActions = scopedSideActions.filter(
    (action) => action.side_action_type === SideActionType.ALIBI_DOUBLES
  );

  const handleCreateSuccess = () => {
    setCreateType(null);
    queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
  };

  const openCopySideAction = (
    action: SideAction,
    defaultSquadId?: number
  ) => {
    const fallbackSquadId =
      defaultSquadId ??
      action.pools.find((pool) => pool.is_enabled)?.squad_id ??
      null;
    setCopyRequest({ action, defaultSquadId: fallbackSquadId });
  };

  const handleEditSuccess = () => {
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
  };

  const handleLockAndGenerate = (
    sideActionId: number,
    poolId: number,
    poolLabel: string,
    hasBrackets: boolean
  ) => {
    const cluster = findRolloverClusterForPool(rolloverClusters, sideActionId, poolId);
    if (hasBrackets) {
      setRegenerateConfirm({ sideActionId, poolId, poolLabel, cluster });
      return;
    }
    void handleGenerate(sideActionId, poolId, poolLabel, false, cluster);
  };

  const activeChoice = EVENT_SIDE_ACTION_TYPE_CHOICES.find((c) => c.type === createType);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageSectionHeading>Director setup</PageSectionHeading>
          <p className="mt-1 text-sm text-text-muted">
            Configure brackets, high-game / high-series pots, eliminators, mystery
            doubles, mystery game, love doubles, and alibi doubles for this event.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAuthorizedForManagement && (lockStatus?.active_count ?? 0) > 0 && (
            <Button
              variant="darkbackground"
              size="small"
              onClick={() => setLockAllConfirmOpen(true)}
              disabled={lockAllMutation.isPending || lockStatus?.all_locked === true}
              data-guide-id="guide-lock-sa-entries"
            >
              {lockAllMutation.isPending
                ? 'Locking…'
                : lockStatus?.all_locked
                  ? 'All entries locked'
                  : 'Lock event entries'}
            </Button>
          )}
        </div>
      </div>

      {isError && (
        <Alert
          variant="error"
          message={getErrorMessage(error, 'Failed to load side actions.')}
        />
      )}
      {actionError && (
        <Alert variant="error" message={actionError} onDismiss={() => setActionError(null)} />
      )}
      {lockStatus && lockStatus.active_count > 0 && !lockStatus.all_locked && (
        <Alert
          variant="warning"
          message={`Entries remain open for ${lockStatus.unlocked_names.join(', ') || `${lockStatus.unlocked_count} side action(s)`}. Lock this event's entries before scoring.`}
        />
      )}

      {isAuthorizedForManagement && (
        <Card title="Create new" className="shadow-sm">
          <p className="text-sm text-text-muted mb-4">
            Choose a side action type to set up for this event.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EVENT_SIDE_ACTION_TYPE_CHOICES.map((choice) => (
              <div
                key={choice.type}
                className="rounded-lg border border-border bg-surface-light p-4 flex flex-col"
              >
                <h3 className="text-base font-semibold text-primary">{choice.label}</h3>
                <p className="text-sm text-text-muted mt-2 flex-1">{choice.description}</p>
                <div className="mt-4">
                  <Button
                    variant="darkbackground"
                    size="small"
                    onClick={() => setCreateType(choice.type)}
                    data-guide-id={
                      choice === EVENT_SIDE_ACTION_TYPE_CHOICES[0]
                        ? 'guide-create-side-action'
                        : undefined
                    }
                  >
                    Create new
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <SideActionDeskToolbar
        rounds={rounds}
        deskScope={deskScope}
        onDeskScopeChange={setDeskScope}
        isAuthorizedForManagement={isAuthorizedForManagement}
        activeSideActions={activeSideActions}
        scopedSideActions={scopedSideActions}
        onCopyAll={() => setCopyAllOpen(true)}
      />

      <Card title="Brackets" className="shadow-sm">
        {isLoading ? (
          <Loading />
        ) : (
          <BracketSideActionsTable
            bracketActions={bracketActions}
            rounds={rounds}
            deskScope={deskScope}
            rolloverClusters={rolloverClusters}
            isAuthorizedForManagement={isAuthorizedForManagement}
            detailsLoadingIds={detailsLoadingIds}
            generatingIds={generatingIds}
            syncingScoresIds={syncingScoresIds}
            loadingFinancialsIds={loadingFinancialsIds}
            unlockingIds={unlockingIds}
            onEdit={setEditingId}
            onViewDetails={handleViewDetails}
            onLockAndGenerate={handleLockAndGenerate}
            onUnlockEntries={(sideActionId, poolId, poolLabel) =>
              setUnlockEntriesConfirm({
                sideActionId,
                poolId,
                poolLabel,
                cluster: findRolloverClusterForPool(rolloverClusters, sideActionId, poolId),
              })
            }
            onViewSideAction={handleViewSideAction}
            onFinancials={openFinancials}
            onConflicts={setConflictsView}
            onReports={(id, name) =>
              setReportsMenu({ id, name, sideActionType: SideActionType.BRACKET })
            }
            onCopy={openCopySideAction}
            onDelete={(id, name) => setDeleteConfirm({ id, name })}
          />
        )}
      </Card>

      <Card title="High Games" className="shadow-sm">
        {isLoading ? (
          <Loading />
        ) : (
          <HighGameSideActionsTable
            highGameActions={highGameActions}
            isAuthorizedForManagement={isAuthorizedForManagement}
            onEdit={setEditingId}
            onViewDetails={handleViewDetails}
            onView={(id, name) => setHighGameStandingsId({ id, name })}
            onReports={(id, name) =>
              setReportsMenu({ id, name, sideActionType: SideActionType.HIGH_GAME })
            }
            onCopy={openCopySideAction}
            onDelete={(id, name) => setDeleteConfirm({ id, name })}
          />
        )}
      </Card>

      <Card title="High Series" className="shadow-sm">
        {isLoading ? (
          <Loading />
        ) : (
          <HighSetSideActionsTable
            highSetActions={highSetActions}
            isAuthorizedForManagement={isAuthorizedForManagement}
            onEdit={setEditingId}
            onViewDetails={handleViewDetails}
            onView={(id, name) => setHighSetStandingsId({ id, name })}
            onReports={(id, name) =>
              setReportsMenu({ id, name, sideActionType: SideActionType.HIGH_SET })
            }
            onCopy={openCopySideAction}
            onDelete={(id, name) => setDeleteConfirm({ id, name })}
          />
        )}
      </Card>

      <Card title="Eliminators" className="shadow-sm">
        {isLoading ? (
          <Loading />
        ) : (
          <EliminatorSideActionsTable
            eliminatorActions={eliminatorActions}
            isAuthorizedForManagement={isAuthorizedForManagement}
            onEdit={setEditingId}
            onViewDetails={handleViewDetails}
            onView={(id, name) => setEliminatorStandingsId({ id, name })}
            onReports={(id, name) =>
              setReportsMenu({ id, name, sideActionType: SideActionType.ELIMINATOR })
            }
            onCopy={openCopySideAction}
            onDelete={(id, name) => setDeleteConfirm({ id, name })}
          />
        )}
      </Card>

      <Card title="Mystery Doubles" className="shadow-sm">
        {isLoading ? (
          <Loading />
        ) : (
          <MysteryDoublesSideActionsTable
            actions={mysteryDoublesActions}
            isAuthorizedForManagement={isAuthorizedForManagement}
            onEdit={setEditingId}
            onViewDetails={handleViewDetails}
            onView={(id, name) => setMysteryDoublesStandingsId({ id, name })}
            onDrawPairs={(id, name) => setMysteryDoublesStandingsId({ id, name })}
            onReports={(id, name) =>
              setReportsMenu({
                id,
                name,
                sideActionType: SideActionType.MYSTERY_DOUBLES,
              })
            }
            onCopy={openCopySideAction}
            onDelete={(id, name) => setDeleteConfirm({ id, name })}
          />
        )}
      </Card>

      <Card title="Mystery Game" className="shadow-sm">
        {isLoading ? (
          <Loading />
        ) : (
          <MysteryGameSideActionsTable
            actions={mysteryGameActions}
            isAuthorizedForManagement={isAuthorizedForManagement}
            onEdit={setEditingId}
            onViewDetails={handleViewDetails}
            onGenerate={(id, name) =>
              setMysteryGameSpinId({ id, name, autoStartSpin: true })
            }
            onView={(id, name) =>
              setMysteryGameSpinId({ id, name, autoStartSpin: false })
            }
            onReports={(id, name) =>
              setReportsMenu({
                id,
                name,
                sideActionType: SideActionType.MYSTERY_GAME,
              })
            }
            onCopy={openCopySideAction}
            onDelete={(id, name) => setDeleteConfirm({ id, name })}
          />
        )}
      </Card>

      <Card title="Love Doubles" className="shadow-sm">
        {isLoading ? (
          <Loading />
        ) : (
          <LoveDoublesSideActionsTable
            actions={loveDoublesActions}
            isAuthorizedForManagement={isAuthorizedForManagement}
            onEdit={setEditingId}
            onViewDetails={handleViewDetails}
            onView={(id, name) => setLoveDoublesStandingsId({ id, name })}
            onReports={(id, name) =>
              setReportsMenu({
                id,
                name,
                sideActionType: SideActionType.LOVE_DOUBLES,
              })
            }
            onCopy={openCopySideAction}
            onDelete={(id, name) => setDeleteConfirm({ id, name })}
          />
        )}
      </Card>

      <Card title="Alibi Doubles" className="shadow-sm">
        {isLoading ? (
          <Loading />
        ) : (
          <AlibiDoublesSideActionsTable
            actions={alibiDoublesActions}
            isAuthorizedForManagement={isAuthorizedForManagement}
            onEdit={setEditingId}
            onViewDetails={handleViewDetails}
            onPairs={(id, name) => setAlibiDoublesPairsId({ id, name })}
            onView={(id, name) => setAlibiDoublesStandingsId({ id, name })}
            onReports={(id, name) =>
              setReportsMenu({
                id,
                name,
                sideActionType: SideActionType.ALIBI_DOUBLES,
              })
            }
            onCopy={openCopySideAction}
            onDelete={(id, name) => setDeleteConfirm({ id, name })}
          />
        )}
      </Card>

      {viewingBrackets && (
        <SideActionBracketViewerModal
          isOpen={viewingBrackets != null}
          onClose={setViewingBrackets}
          sideActionName={`${viewingBrackets.name} · ${viewingBrackets.poolLabel}`}
          brackets={viewingBrackets.brackets}
          userDisplayNames={viewingBrackets.userDisplayNames}
          payouts={viewingBrackets.payouts}
          byePayouts={viewingBrackets.byePayouts}
          gameNumbers={viewingBrackets.gameNumbers}
          bracketNumberOffset={viewingBrackets.bracketNumberOffset}
        />
      )}

      {conflictsView && (
        <BracketConflictsReportModal
          isOpen={conflictsView != null}
          onClose={closeConflictsView}
          sideActionName={`${conflictsView.name} · ${conflictsView.poolLabel}`}
          brackets={conflictsView.brackets}
          userDisplayNames={conflictsView.userDisplayNames}
          onRegenerate={
            conflictsView.sideActionId != null
              ? () =>
                  setRegenerateConfirm({
                    sideActionId: conflictsView.sideActionId!,
                    poolId: conflictsView.poolId!,
                    poolLabel: conflictsView.poolLabel!,
                  })
              : undefined
          }
          isRegenerating={
            conflictsView.sideActionId != null &&
            generatingIds.has(`${conflictsView.sideActionId}:${conflictsView.poolId}`)
          }
        />
      )}

      {financialsView && (
        <BracketFinancialsReportModal
          isOpen={financialsView != null}
          onClose={setFinancialsView}
          sideActionName={`${financialsView.name} · ${financialsView.poolLabel}`}
          report={financialsView.report ?? null}
          isLoading={
            loadingFinancialsIds.has(
              `${financialsView.sideActionId}:${financialsView.poolId}`
            ) &&
            !financialsView.report
          }
        />
      )}

      {entrantsView && (
        <SideActionEntrantsModal
          isOpen
          onClose={setEntrantsView}
          sideActionName={
            entrantsView.poolLabel
              ? `${entrantsView.name} · ${entrantsView.poolLabel}`
              : entrantsView.name
          }
          entrants={entrantsView.entrants}
          entryUnit={entrantsView.entryUnit}
        />
      )}

      {reportsMenu && (
        <SideActionReportsMenuModal
          isOpen
          onClose={() => setReportsMenu(null)}
          sideActionId={reportsMenu.id}
          sideActionName={reportsMenu.name}
          sideActionType={
            (reportsMenu.sideActionType as SideActionType) || SideActionType.BRACKET
          }
          tournamentId={tournamentId}
          eventId={eventId}
        />
      )}

      {highGameStandingsId && (
        <HighGameStandingsModal
          isOpen
          onClose={() => setHighGameStandingsId(null)}
          sideActionId={highGameStandingsId.id}
          sideActionName={highGameStandingsId.name}
        />
      )}

      {highSetStandingsId && (
        <HighSetStandingsModal
          isOpen
          onClose={() => setHighSetStandingsId(null)}
          sideActionId={highSetStandingsId.id}
          sideActionName={highSetStandingsId.name}
        />
      )}

      {eliminatorStandingsId && (
        <EliminatorStandingsModal
          isOpen
          onClose={() => setEliminatorStandingsId(null)}
          sideActionId={eliminatorStandingsId.id}
          sideActionName={eliminatorStandingsId.name}
        />
      )}

      {mysteryDoublesStandingsId && (
        <MysteryDoublesStandingsModal
          isOpen
          onClose={() => setMysteryDoublesStandingsId(null)}
          sideActionId={mysteryDoublesStandingsId.id}
          sideActionName={mysteryDoublesStandingsId.name}
          allowDrawPairs={isAuthorizedForManagement}
        />
      )}

      {mysteryGameSpinId && (
        <MysteryGameSpinModal
          isOpen
          onClose={() => setMysteryGameSpinId(null)}
          sideActionId={mysteryGameSpinId.id}
          sideActionName={mysteryGameSpinId.name}
          allowSpin={isAuthorizedForManagement}
          autoStartSpin={Boolean(mysteryGameSpinId.autoStartSpin)}
        />
      )}

      {loveDoublesStandingsId && (
        <LoveDoublesStandingsModal
          isOpen
          onClose={() => setLoveDoublesStandingsId(null)}
          sideActionId={loveDoublesStandingsId.id}
          sideActionName={loveDoublesStandingsId.name}
        />
      )}

      {alibiDoublesStandingsId && (
        <AlibiDoublesStandingsModal
          isOpen
          onClose={() => setAlibiDoublesStandingsId(null)}
          sideActionId={alibiDoublesStandingsId.id}
          sideActionName={alibiDoublesStandingsId.name}
        />
      )}

      {alibiDoublesPairsId && (
        <AlibiDoublesPairsModal
          isOpen
          onClose={() => setAlibiDoublesPairsId(null)}
          sideActionId={alibiDoublesPairsId.id}
          sideActionName={alibiDoublesPairsId.name}
          eventId={eventId}
        />
      )}

      <ConfirmDialog
        isOpen={regenerateConfirm != null}
        onClose={() => setRegenerateConfirm(null)}
        title={
          regenerateConfirm?.cluster
            ? 'Reset and regenerate linked bracket sets?'
            : 'Reset and regenerate brackets?'
        }
        message={
          regenerateConfirm?.cluster
            ? `Previous brackets for ${clusterMemberLabels(regenerateConfirm.cluster)} will be LOST. All linked rollover sets for this squad will be reset and regenerated together.`
            : 'Previous brackets for this squad pool will be LOST. The pool will be explicitly reset before a new randomized bracket run is generated.'
        }
        confirmText="Reset and regenerate"
        confirmVariant="danger"
        onConfirm={() => {
          const target = regenerateConfirm;
          setRegenerateConfirm(null);
          if (target) {
            void handleGenerate(
              target.sideActionId,
              target.poolId,
              target.poolLabel,
              true,
              target.cluster
            );
          }
        }}
      />
      <ConfirmDialog
        isOpen={unlockEntriesConfirm != null}
        onClose={() => setUnlockEntriesConfirm(null)}
        title={
          unlockEntriesConfirm?.cluster
            ? 'Unlock linked bracket sets?'
            : 'Unlock entries for this pool?'
        }
        message={
          unlockEntriesConfirm?.cluster
            ? `This removes generated brackets for ${clusterMemberLabels(unlockEntriesConfirm.cluster)} and reopens entries for all linked sets in this squad.`
            : 'This removes the generated brackets for this squad pool and reopens entries.'
        }
        confirmText="Unlock entries"
        onConfirm={() => {
          const target = unlockEntriesConfirm;
          setUnlockEntriesConfirm(null);
          if (target) {
            void handleUnlockEntries(
              target.sideActionId,
              target.poolId,
              target.cluster
            );
          }
        }}
      />
      <ConfirmDialog
        isOpen={lockAllConfirmOpen}
        onClose={() => setLockAllConfirmOpen(false)}
        title="Lock this event's side action entries?"
        message="This freezes entries on active lock-gated side actions in this event only. It does not affect other events in the tournament."
        confirmText="Lock event entries"
        onConfirm={() => {
          setLockAllConfirmOpen(false);
          lockAllMutation.mutate();
        }}
      />
      <ConfirmDialog
        isOpen={deleteConfirm != null}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteConfirm(null);
        }}
        title="Delete this side action?"
        message={
          deleteConfirm
            ? `"${deleteConfirm.name}" will be removed from this event. Existing entries and results will no longer be available in director setup.`
            : ''
        }
        confirmText={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteConfirm && !deleteMutation.isPending) {
            deleteMutation.mutate(deleteConfirm.id);
          }
        }}
      />

      <CopySideActionsModal
        mode="single"
        isOpen={copyRequest != null}
        onClose={() => setCopyRequest(null)}
        onSuccess={() => {
          setCopyRequest(null);
          void queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
        }}
        request={copyRequest}
        rounds={rounds}
      />

      <CopySideActionsModal
        mode="all"
        isOpen={copyAllOpen}
        onClose={() => setCopyAllOpen(false)}
        onSuccess={() => {
          setCopyAllOpen(false);
          void queryClient.invalidateQueries({ queryKey: sideActionQueryKeys.all });
        }}
        actions={
          deskScopeIsFiltered(deskScope) ? scopedSideActions : activeSideActions
        }
        rounds={rounds}
        defaultSquadId={deskScope.squadId}
      />

      {createType && activeChoice && (
        <CreateSideActionModal
          isOpen={!!createType}
          onClose={() => setCreateType(null)}
          onSuccess={handleCreateSuccess}
          tournamentId={tournamentId}
          eventId={eventId}
          eventGameCount={eventGameCount || 3}
          fixedSideActionType={createType}
          modalTitle={`Create ${
            createType === SideActionType.HIGH_SET
              ? 'High Series'
              : createType === SideActionType.MYSTERY_DOUBLES
                ? 'Mystery Doubles'
                : createType === SideActionType.MYSTERY_GAME
                  ? 'Mystery Game'
                  : createType === SideActionType.LOVE_DOUBLES
                    ? 'Love Doubles'
                    : createType === SideActionType.ALIBI_DOUBLES
                      ? 'Alibi Doubles'
                      : activeChoice.label.replace(/s$/, '')
          } Side Action`}
          initialData={{
            side_action_type: createType,
            event_id: eventId,
            name: eventName
              ? `${eventName} ${
                  createType === SideActionType.HIGH_GAME
                    ? 'High Game'
                    : createType === SideActionType.HIGH_SET
                      ? 'High Series'
                      : createType === SideActionType.ELIMINATOR
                        ? 'Eliminator'
                        : createType === SideActionType.MYSTERY_DOUBLES
                          ? 'Mystery Doubles'
                          : createType === SideActionType.MYSTERY_GAME
                            ? 'Mystery Game'
                            : createType === SideActionType.LOVE_DOUBLES
                              ? 'Love Doubles'
                              : createType === SideActionType.ALIBI_DOUBLES
                                ? 'Alibi Doubles'
                                : 'Bracket'
                }`
              : '',
          }}
          eventHandicap={eventHandicap}
          allowTeamEntry={allowTeamEntry}
        />
      )}

      {editingId != null && (
        <EditSideActionModal
          isOpen={editingId != null}
          onClose={() => setEditingId(null)}
          onSuccess={handleEditSuccess}
          sideActionId={editingId}
          eventId={eventId}
          eventGameCount={eventGameCount || 3}
          eventHandicap={eventHandicap}
          allowTeamEntry={allowTeamEntry}
        />
      )}
    </div>
  );
};

export default SideActionsTab;
