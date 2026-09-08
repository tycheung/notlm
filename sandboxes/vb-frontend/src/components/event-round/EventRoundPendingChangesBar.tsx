import React from 'react';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Button from '../common/Button';
import Loading from '../common/Loading';

export interface EventRoundPendingChangesBarProps {
  hasGamePending: boolean;
  hasAssignmentPending: boolean;
  isCreatingGames?: boolean;
  /** Disable discard/save while mutations run */
  isBusy: boolean;
  /** Button loading spinner state */
  isLoading?: boolean;
  /** Label when busy (default "Saving...") */
  savingLabel?: string;
  onDiscard: () => void;
  onSave: () => void;
}

function pendingMessage(hasGamePending: boolean, hasAssignmentPending: boolean): string {
  if (hasGamePending && hasAssignmentPending) {
    return 'You have unsaved game score and participant assignment changes.';
  }
  if (hasGamePending) {
    return 'You have unsaved game score changes.';
  }
  return 'You have unsaved participant assignment changes.';
}

/**
 * Shared save/discard banner for squads and scoring surfaces.
 */
const EventRoundPendingChangesBar: React.FC<EventRoundPendingChangesBarProps> = ({
  hasGamePending,
  hasAssignmentPending,
  isCreatingGames = false,
  isBusy,
  isLoading = false,
  savingLabel = 'Saving...',
  onDiscard,
  onSave,
}) => {
  return (
    <div className="bg-surface-light border border-border border-l-4 border-l-primary rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <PersonAddIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-text">Changes Pending</h3>
            <p className="text-sm text-text-muted">
              {pendingMessage(hasGamePending, hasAssignmentPending)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {isCreatingGames && (
            <div className="flex items-center gap-2 text-sm text-text-muted mr-2">
              <Loading size="small" variant="spinner" />
              <span>Creating games...</span>
            </div>
          )}
          <Button variant="lightbackground" onClick={onDiscard} disabled={isBusy}>
            Discard Changes
          </Button>
          <Button
            variant="darkbackground"
            onClick={onSave}
            disabled={isBusy}
            isLoading={isLoading}
          >
            {isBusy ? savingLabel : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventRoundPendingChangesBar;
