import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '../../common/Alert';
import Button from '../../common/Button';
import ConfirmDialog from '../../common/ConfirmDialog';
import EventRoundWorkspace from '../EventRoundWorkspace';
import type { EventRoundWorkspaceProps } from '../EventRoundWorkspace';
import { SideActionsAPI } from '../../../api/side-actions';
import { getErrorMessage } from '../../../api/apiErrors';
import { sideActionQueryKeys } from '../../../features/side-actions/shared';

interface GameScoringTabProps {
  eventId: number;
  eventComplete: EventRoundWorkspaceProps['eventComplete'];
  isAuthorizedForManagement: boolean;
  scoringUnlocked: boolean;
  /** True when event start_date is still in the future. */
  scoringBlockedUntilStart?: boolean;
  onAfterSuccessfulSave?: () => void;
  isSaOnly?: boolean;
}

const GameScoringTab: React.FC<GameScoringTabProps> = ({
  eventId,
  eventComplete,
  isAuthorizedForManagement,
  scoringUnlocked,
  scoringBlockedUntilStart = false,
  onAfterSuccessfulSave,
  isSaOnly = false,
}) => {
  const queryClient = useQueryClient();
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const {
    data: lockStatus,
    isError: isLockStatusError,
    error: lockStatusError,
  } = useQuery({
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
      setLockError(null);
    },
    onError: (err) =>
      setLockError(getErrorMessage(err, 'Failed to lock side action entries.')),
  });
  const hasLockGatedSideActions = (lockStatus?.active_count ?? 0) > 0;
  const allEntriesLocked =
    !hasLockGatedSideActions || lockStatus?.all_locked === true;

  return (
    <div className="space-y-4">
      {isSaOnly && (
        <Alert
          variant="info"
          message="Pinfall on this tab is for side actions only. These games do not feed averages or event standings until you upgrade to a full tournament."
        />
      )}
      {isAuthorizedForManagement && hasLockGatedSideActions && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted">
            Side action entries must be locked for this event before scores can be saved.
          </p>
          <Button
            variant="darkbackground"
            size="small"
            onClick={() => setLockConfirmOpen(true)}
            disabled={lockAllMutation.isPending || allEntriesLocked}
          >
            {lockAllMutation.isPending
              ? 'Locking…'
              : allEntriesLocked
                ? 'All entries locked'
                : 'Lock event entries'}
          </Button>
        </div>
      )}
      {scoringBlockedUntilStart && (
        <Alert
          variant="warning"
          message="Scoring opens at the event start date and time. You can finish setup, but scores cannot be entered yet."
        />
      )}
      {!scoringUnlocked && !scoringBlockedUntilStart && (
        <Alert
          variant="warning"
          message="Lock at least one squad on the Squads tab to enter scores."
        />
      )}
      {scoringUnlocked && hasLockGatedSideActions && !allEntriesLocked && (
        <Alert
          variant="warning"
          message={`Lock side action entries before scoring. Still open: ${
            lockStatus?.unlocked_names.join(', ') ||
            `${lockStatus?.unlocked_count ?? 0} side action(s)`
          }. Score saves will be rejected until this event is locked.`}
        />
      )}
      {scoringUnlocked && isLockStatusError && (
        <Alert
          variant="warning"
          message={getErrorMessage(
            lockStatusError,
            'Could not verify whether side action entries are locked. Score saves may be rejected.'
          )}
        />
      )}
      {lockError && (
        <Alert variant="error" message={lockError} onDismiss={() => setLockError(null)} />
      )}
      <EventRoundWorkspace
        eventId={eventId}
        eventComplete={eventComplete}
        isAuthorizedForManagement={isAuthorizedForManagement}
        surfaceMode="scoring"
        onAfterSuccessfulSave={onAfterSuccessfulSave}
        forceHideRoundSelector={isSaOnly}
      />
      <ConfirmDialog
        isOpen={lockConfirmOpen}
        onClose={() => setLockConfirmOpen(false)}
        title="Lock this event's side action entries?"
        message="This freezes entries on active lock-gated side actions in this event only so scoring can begin."
        confirmText="Lock event entries"
        onConfirm={() => {
          setLockConfirmOpen(false);
          lockAllMutation.mutate();
        }}
      />
    </div>
  );
};

export default GameScoringTab;
