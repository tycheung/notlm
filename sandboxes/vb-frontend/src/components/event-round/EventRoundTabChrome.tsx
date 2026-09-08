import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Alert from '../common/Alert';

export interface EventRoundTabChromeProps {
  eventId: number;
  title: string;
  subtitle: string;
  successMessage: string | null;
  onDismissSuccess: () => void;
  assignmentError: string | null;
  onDismissAssignmentError: () => void;
  roundsForSelector: Array<{ id: number; round_number: number; friendly_name?: string | null }>;
  selectedRoundId: number | null;
  onRoundChange: (value: string) => void;
  getRoundStatus: (roundId: number) => string | null;
  isLoadingRoundStatus: boolean;
  /** When false, round dropdown is omitted (single round or no rounds). */
  showRoundSelector: boolean;
}

/**
 * Shared header, alerts, and round selector for event squads and scoring tabs.
 */
const EventRoundTabChrome: React.FC<EventRoundTabChromeProps> = ({
  eventId,
  title,
  subtitle,
  successMessage,
  onDismissSuccess,
  assignmentError,
  onDismissAssignmentError,
  roundsForSelector,
  selectedRoundId,
  onRoundChange,
  getRoundStatus,
  isLoadingRoundStatus,
  showRoundSelector,
}) => {
  const queryClient = useQueryClient();

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-primary">{title}</h2>
          <div className="flex items-center space-x-3 mt-1">
            <p className="text-primary">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {showRoundSelector && (
            <div className="flex items-center space-x-2">
              <select
                aria-label="Event round"
                value={selectedRoundId ?? ''}
                onChange={(e) => onRoundChange(e.target.value)}
                className="block px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                {!selectedRoundId && (
                  <option value="" disabled>
                    Select round
                  </option>
                )}
                {roundsForSelector.map((round) => {
                  const roundStatus = getRoundStatus(round.id);
                  const statusText = roundStatus
                    ? ` (${roundStatus})`
                    : isLoadingRoundStatus
                      ? ' (Loading...)'
                      : '';
                  return (
                    <option key={round.id} value={round.id}>
                      Round {round.round_number}: {round.friendly_name}
                      {statusText}
                    </option>
                  );
                })}
              </select>
              <div className="flex items-center space-x-2">
                {isLoadingRoundStatus && (
                  <div className="flex items-center space-x-1">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    <span className="text-xs text-text-muted">Updating status...</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    queryClient.invalidateQueries({ queryKey: ['roundRealTimeStatus', eventId] })
                  }
                  className="p-1 text-text-dim hover:text-text-muted transition-colors"
                  title="Refresh round status"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {successMessage && (
        <Alert variant="success" message={successMessage} onDismiss={onDismissSuccess} />
      )}

      {assignmentError && (
        <Alert variant="error" message={assignmentError} onDismiss={onDismissAssignmentError} />
      )}
    </>
  );
};

export default EventRoundTabChrome;
