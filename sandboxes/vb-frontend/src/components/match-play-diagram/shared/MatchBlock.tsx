import React from 'react';
import ParticipantRow, { type ParticipantRowProps } from './ParticipantRow';
import SeriesStatusPill from './SeriesStatusPill';
import { MATCH_BLOCK_HEIGHT } from './constants';

export interface MatchBlockParticipant extends Omit<ParticipantRowProps, 'trailing'> {
  side: 0 | 1;
}

export interface MatchBlockProps {
  label?: string | null;
  status?: string;
  winsLabel?: string | null;
  participants: [MatchBlockParticipant, MatchBlockParticipant];
  height?: number;
  headerExtra?: React.ReactNode;
  /** When series totals are tied with no winner, pick a side. */
  onResolveWinner?: (side: 0 | 1) => void;
  resolveWinnerPending?: boolean;
  showResolveWinner?: boolean;
}

const MatchBlock: React.FC<MatchBlockProps> = ({
  label,
  status,
  winsLabel,
  participants,
  height = MATCH_BLOCK_HEIGHT,
  headerExtra,
  onResolveWinner,
  resolveWinnerPending = false,
  showResolveWinner = false,
}) => {
  const showPicker = Boolean(showResolveWinner && onResolveWinner);

  return (
    <div className="flex flex-col overflow-hidden" style={{ height, minHeight: height }}>
      <div className="mb-1 flex h-5 shrink-0 items-center gap-1.5">
        {label ? (
          <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </span>
        ) : null}
        {showPicker ? (
          <span
            className="shrink-0 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning"
            data-testid="manual-winner-panel"
          >
            Tied — pick winner
          </span>
        ) : status ? (
          <SeriesStatusPill status={status} />
        ) : null}
        {winsLabel ? (
          <span className="rounded-full border border-border bg-surface-light px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
            {winsLabel}
          </span>
        ) : null}
        {headerExtra}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1">
        {participants.map((participant, index) => (
          <div key={participant.side} className="flex min-h-0 items-stretch gap-1">
            {showPicker ? (
              <button
                type="button"
                data-testid={`win-toggle-${participant.side}`}
                disabled={resolveWinnerPending}
                className="w-9 shrink-0 self-stretch rounded-md border border-warning/50 bg-warning/10 text-[10px] font-semibold uppercase tracking-wide text-warning disabled:opacity-50"
                onClick={() => onResolveWinner?.(index === 0 ? 0 : 1)}
                aria-label={`Advance ${participant.name || (index === 0 ? 'side A' : 'side B')}`}
              >
                Win
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <ParticipantRow {...participant} dense />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchBlock;
