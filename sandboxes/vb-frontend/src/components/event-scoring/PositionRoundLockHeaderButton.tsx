import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { RoundMatchSeriesAPI } from '../../api/round-match-series';
import { getErrorMessage } from '../../api/apiErrors';
import { invalidateEventLaneQueries } from '../../features/lanes';

interface PositionRoundLockHeaderButtonProps {
  roundId: number;
  gameNumber: number;
  eventId?: number | null;
  /** True when this game already has scores / series results. */
  alreadyScored?: boolean;
}

function shortErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'Could not lock position round.';
  // Avoid dumping SQLAlchemy / Postgres stack traces into the score sheet header.
  if (
    /ForeignKeyViolation|IntegrityError|sqlalchemy|asyncpg|DETAIL:/i.test(trimmed) ||
    trimmed.length > 160
  ) {
    return 'Could not lock position round. Try again or use Format → Matchups.';
  }
  return trimmed;
}

/**
 * Compact lock CTA under a scoring column header for a configured position-round game.
 * Uses format-editor lane placement (e.g. start_middle) via the backend apply endpoint.
 */
const PositionRoundLockHeaderButton: React.FC<PositionRoundLockHeaderButtonProps> = ({
  roundId,
  gameNumber,
  eventId,
  alreadyScored = false,
}) => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const title = useMemo(
    () =>
      alreadyScored
        ? `Game ${gameNumber} already has scores — position matchups are locked.`
        : `Position round: fill 1v2, 3v4… from standings and stamp lanes for game ${gameNumber}`,
    [alreadyScored, gameNumber]
  );

  const lockFromStandings = async () => {
    setBusy(true);
    setError(null);
    try {
      await RoundMatchSeriesAPI.applyPositionRound(roundId, {
        game: gameNumber,
        fill_from_standings: true,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roundMatchSeries', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['roundParticipants', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['squadGames', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['teamGames', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['eventComplete'] }),
        queryClient.invalidateQueries({ queryKey: ['event'] }),
        eventId
          ? invalidateEventLaneQueries(queryClient, eventId)
          : Promise.resolve(),
      ]);
      setDone(true);
    } catch (err) {
      setError(
        shortErrorMessage(
          getErrorMessage(err, 'Could not lock position round from standings.')
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const label = busy
    ? 'Locking…'
    : done
      ? 'Matchups locked'
      : alreadyScored
        ? 'Already locked'
        : 'Lock matchups';

  return (
    <div className="mt-1.5 flex w-full max-w-[11rem] flex-col items-stretch gap-1 normal-case tracking-normal">
      <span className="rounded bg-surface/95 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-text shadow-sm">
        Position Round
      </span>
      <button
        type="button"
        disabled={busy || alreadyScored}
        title={title}
        onClick={() => void lockFromStandings()}
        className="rounded-md border-2 border-surface bg-surface px-2 py-1.5 text-[11px] font-bold leading-tight text-text shadow-md transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-surface focus-visible:ring-offset-2 focus-visible:ring-offset-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {error ? (
        <span className="rounded bg-danger px-1.5 py-1 text-center text-[10px] font-semibold leading-tight text-white shadow-sm">
          {error}
        </span>
      ) : null}
    </div>
  );
};

export default PositionRoundLockHeaderButton;
