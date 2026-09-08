import React, { useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ConfirmDialog from '../common/ConfirmDialog';
import { gameCountsAsScoredForRoundCompletion } from '../../utils/gameCompletion';

type GameRow = {
  game_number?: number | null;
  score?: number | null;
  verified?: boolean;
  status?: string | null;
};

interface RoundGameCountControlsProps {
  gameCount: number;
  canAdjust: boolean;
  isPending?: boolean;
  games?: GameRow[];
  onIncrement: () => void;
  onDecrement: (confirmDeleteScored: boolean) => void;
}

/** Matches team expand/collapse controls in TeamScoring header (half size). */
const controlButtonClass =
  'inline-flex shrink-0 items-center justify-center w-3.5 h-3.5 text-text bg-surface/25 hover:bg-surface/40 border border-border/60 rounded-md transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface/25';

const RoundGameCountControls: React.FC<RoundGameCountControlsProps> = ({
  gameCount,
  canAdjust,
  isPending = false,
  games = [],
  onIncrement,
  onDecrement,
}) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const lastGameHasScores = useMemo(() => {
    const lastGames = games.filter((g) => g.game_number === gameCount);
    return lastGames.some((g) => gameCountsAsScoredForRoundCompletion(g));
  }, [games, gameCount]);

  const handleRemoveClick = () => {
    setShowRemoveConfirm(true);
  };

  const handleConfirmRemove = () => {
    onDecrement(lastGameHasScores);
    setShowRemoveConfirm(false);
  };

  if (!canAdjust) {
    return null;
  }

  return (
    <>
      <div className="inline-flex flex-col items-center justify-center gap-0.5">
        <button
          type="button"
          title={`Add Game ${gameCount + 1}`}
          disabled={isPending}
          onClick={onIncrement}
          className={controlButtonClass}
          aria-label="Add game"
        >
          <AddIcon className="w-3 h-3" aria-hidden />
        </button>
        <button
          type="button"
          title={gameCount <= 1 ? 'At least one game is required' : `Remove Game ${gameCount}`}
          disabled={isPending || gameCount <= 1}
          onClick={handleRemoveClick}
          className={controlButtonClass}
          aria-label={`Remove game ${gameCount}`}
        >
          <RemoveIcon className="w-3 h-3" aria-hidden />
        </button>
      </div>

      <ConfirmDialog
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={handleConfirmRemove}
        title={`Remove Game ${gameCount}?`}
        message={
          lastGameHasScores
            ? `Removing Game ${gameCount} will permanently delete all scores and game shells for that game across the round. This cannot be undone.`
            : `Removing Game ${gameCount} will delete all empty game shells for that game across the round.`
        }
        confirmText={lastGameHasScores ? 'Delete scores and remove game' : 'Remove game'}
        confirmVariant="danger"
      />
    </>
  );
};

export default RoundGameCountControls;
