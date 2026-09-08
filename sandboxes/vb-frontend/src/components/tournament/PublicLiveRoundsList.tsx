import React, { useMemo } from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useRoundRealtimeStatuses } from '../../hooks/useRoundRealtimeStatuses';
import { RoundRead } from '../../types/round';
import {
  displayLabelForPersistedRoundStatus,
  displayLabelForRealtimeRoundStatus,
} from '../../utils/statusUtils';
import Loading from '../common/Loading';

interface PublicLiveRoundsListProps {
  eventId: number;
  rounds: RoundRead[];
  onRoundSelect: (roundId: number) => void;
}

function roundStatusLabel(
  round: RoundRead,
  realtimeStatus: string | undefined
): string {
  if (realtimeStatus) {
    return displayLabelForRealtimeRoundStatus(realtimeStatus);
  }
  return displayLabelForPersistedRoundStatus(round.status);
}

function roundStatusBadgeClass(label: string): string {
  const normalized = label.trim().toLowerCase();
  if (normalized === 'completed') {
    return 'bg-success/15 text-success border-success/30';
  }
  if (normalized === 'in progress') {
    return 'bg-pending/15 text-pending border-pending/30';
  }
  if (normalized === 'cancelled') {
    return 'bg-danger/15 text-danger border-danger/30';
  }
  return 'bg-surface-light text-text-muted border-border';
}

const PublicLiveRoundsList: React.FC<PublicLiveRoundsListProps> = ({
  eventId,
  rounds,
  onRoundSelect,
}) => {
  const orderedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.round_number - b.round_number),
    [rounds]
  );

  const { data: realtimeByRound, isLoading } = useRoundRealtimeStatuses(eventId, rounds);

  if (!orderedRounds.length) {
    return <p className="text-sm text-text-muted">No rounds yet.</p>;
  }

  if (isLoading && !realtimeByRound) {
    return <Loading size="small" />;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {orderedRounds.map((round) => {
        const rt = realtimeByRound?.[round.id];
        const statusLabel = roundStatusLabel(round, rt?.status);
        const title = round.friendly_name?.trim() || `Round ${round.round_number}`;

        return (
          <li key={round.id}>
            <button
              type="button"
              onClick={() => onRoundSelect(round.id)}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-11 text-left bg-surface hover:bg-surface-light transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text truncate">{title}</p>
                {round.round_name?.trim() && round.round_name.trim() !== title ? (
                  <p className="text-xs text-text-muted truncate">{round.round_name}</p>
                ) : null}
              </div>
              <span
                className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${roundStatusBadgeClass(statusLabel)}`}
              >
                {statusLabel}
              </span>
              <ChevronRightIcon
                className="shrink-0 text-text-muted"
                fontSize="small"
                aria-hidden
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default PublicLiveRoundsList;
