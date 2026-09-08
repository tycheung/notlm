import React from 'react';
import type { RoundRealTimeStatus } from '../../api/rounds';
import { isPersistedRoundCompleted } from '../../utils/statusUtils';
import Button from '../common/Button';
import Card from '../common/Card';
import Alert from '../common/Alert';
import ConfirmDialog from '../common/ConfirmDialog';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SportsIcon from '@mui/icons-material/Sports';

interface RoundControlsProps {
  /** True when every squad in the round is locked in (round.locked_in mirrors this). */
  allSquadsLockedIn: boolean;
  /** True when at least one squad is locked in (partial scoring allowed). */
  anySquadLockedIn: boolean;
  selectedRoundId: number | null;
  eventComplete: any;
  onUnlockRound: () => void;
  isUnlocking: boolean;
  areAllParticipantsAssigned: boolean;
  unassignedCount: number;
  showUnlockConfirm: boolean;
  onShowUnlockConfirm: (show: boolean) => void;
  getRoundStatus: (roundId: number) => string | null;
  isLoadingRoundStatus?: boolean;
  totalParticipantsCount: number;
  onAddSquad?: () => void;
  addSquadDisabled?: boolean;
  addSquadButtonTitle?: string;
  roundRealtimeStatus?: RoundRealTimeStatus | null;
  onCompleteRound?: () => void;
  isCompletingRound?: boolean;
}

const RoundControls: React.FC<RoundControlsProps> = ({
  allSquadsLockedIn,
  anySquadLockedIn,
  selectedRoundId,
  eventComplete,
  onUnlockRound,
  isUnlocking,
  areAllParticipantsAssigned,
  unassignedCount,
  showUnlockConfirm,
  onShowUnlockConfirm,
  getRoundStatus,
  isLoadingRoundStatus,
  totalParticipantsCount,
  onAddSquad,
  addSquadDisabled = false,
  addSquadButtonTitle,
  roundRealtimeStatus,
  onCompleteRound,
  isCompletingRound = false,
}) => {
  const selectedRound = eventComplete?.rounds?.find(
    (r: { id: number }) => r.id === selectedRoundId
  );
  const persistedCompleted = isPersistedRoundCompleted(selectedRound?.status);
  const showCompleteRoundButton =
    Boolean(onCompleteRound) &&
    Boolean(roundRealtimeStatus?.all_scored) &&
    !persistedCompleted;

  const completionBlockedReason = (() => {
    if (!roundRealtimeStatus) return null;
    if (roundRealtimeStatus.all_scored) return null;
    if (roundRealtimeStatus.scoring_complete === false) {
      const scoredGames = Number(
        roundRealtimeStatus.scored_games ??
          roundRealtimeStatus.completed_games ??
          0
      );
      if (roundRealtimeStatus.is_match_play) {
        const totalSeries = Number(roundRealtimeStatus.total_series ?? 0);
        const completedSeries = Number(roundRealtimeStatus.completed_series ?? 0);
        // No bracket yet, or scoring has not started — do not look like a lock blocker.
        if (totalSeries <= 0 || (completedSeries <= 0 && scoredGames <= 0)) {
          return null;
        }
        return 'Finish every match series (winner declared) before this round can complete.';
      }
      const totalGames = Number(
        roundRealtimeStatus.total_games ??
          roundRealtimeStatus.total_expected_games ??
          0
      );
      // Shells missing or scoring not started — roster/lock alerts cover next steps.
      if (totalGames <= 0 || scoredGames <= 0) {
        return null;
      }
      return 'Enter scores for every game shell before this round can complete.';
    }
    if (roundRealtimeStatus.roster_gates_pass === false) {
      return 'Lock every squad that has a roster and assign all required participants before this round can complete.';
    }
    return null;
  })();

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {selectedRoundId && (
              <div className="flex items-center space-x-4">
                {(() => {
                  const selectedRound = eventComplete?.rounds?.find((r: any) => r.id === selectedRoundId);
                  return (
                    <>
                      <span className="text-sm font-medium text-text-muted">
                        Round {selectedRound?.round_number}: {selectedRound?.friendly_name || 'Unknown'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <SportsIcon className="w-5 h-5 text-text-muted" />
                        <span className="text-sm text-text-muted">
                          Status: {isLoadingRoundStatus ? 'Loading...' : (getRoundStatus(selectedRoundId) || 'Unknown')}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {!allSquadsLockedIn && onAddSquad && (
              <Button
                type="button"
                variant="darkbackground"
                onClick={onAddSquad}
                disabled={addSquadDisabled}
                title={addSquadButtonTitle}
              >
                Add Squad
              </Button>
            )}
            {anySquadLockedIn && (
              <>
                <Button
                  onClick={() => onShowUnlockConfirm(true)}
                  disabled={isUnlocking}
                  variant="darkbackground"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <LockOpenIcon className="w-4 h-4 mr-2" />
                  {isUnlocking ? 'Unlocking…' : 'Unlock all squads'}
                </Button>
              </>
            )}
            {showCompleteRoundButton && (
              <Button
                type="button"
                variant="primary"
                onClick={onCompleteRound}
                disabled={isCompletingRound}
              >
                {isCompletingRound ? 'Completing…' : 'Mark round complete'}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          {completionBlockedReason && (
            <Alert variant="warning" message={completionBlockedReason} className="mb-4" />
          )}
          {totalParticipantsCount === 0 ? (
            <Alert
              variant="warning"
              message="⚠️ No participants are available for this round."
              className="mb-4"
            />
          ) : !areAllParticipantsAssigned ? (
            <Alert
              variant="warning"
              message={`⚠️ ${unassignedCount} participant(s) or team(s) are not assigned to squads yet.`}
              className="mb-4"
            />
          ) : !allSquadsLockedIn ? (
            <Alert
              variant="success"
              message="✅ All participants are assigned to squads. Lock each squad when ready to create game shells and enter scores."
              className="mb-4"
            />
          ) : null}
        </div>

        {anySquadLockedIn && !allSquadsLockedIn && (
          <div className="mt-4">
            <Alert
              variant="info"
              message="Some squads are locked in. You can enter scores for locked squads on the Game Scoring tab; unlock a squad from the squads list to change its roster."
              className="mb-4"
            />
          </div>
        )}

        {allSquadsLockedIn && (
          <div className="mt-4">
            <Alert
              variant="info"
              message="🔒 Every squad in this round is locked in. Enter game scores on the Game Scoring tab. A round fully completes only when everyone who belongs in this round is assigned and every squad with a roster is locked in (so shells exist), and real-time status shows all recorded games scored—then advancement can run."
              className="mb-4"
            />
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={showUnlockConfirm}
        onClose={() => onShowUnlockConfirm(false)}
        onConfirm={() => {
          onUnlockRound();
          onShowUnlockConfirm(false);
        }}
        title="Unlock all squads in this round?"
        message="This deletes all game shells and scores for every squad in this round and clears advancement pool data tied to this round. Individual squad unlock is available from each squad row."
        confirmText="Unlock all squads"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default RoundControls;
