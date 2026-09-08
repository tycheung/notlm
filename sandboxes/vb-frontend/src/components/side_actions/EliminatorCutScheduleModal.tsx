import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';
import {
  cutGamesFromStages,
  eliminatorProjectionWarning,
  projectCutSchedule,
  syncDropAmountsByGame,
  type EliminatorDropMode,
  type EliminatorRoundMode,
} from '../../utils/eliminatorProjection';

interface EliminatorCutScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amountsByGame: Record<string, number>) => void;
  gameNumbers: number[];
  dropMode: EliminatorDropMode;
  roundMode: EliminatorRoundMode;
  defaultAmount: number;
  amountsByGame: Record<string, number>;
  /** Optional entry count for live projection; 0 hides survivor math. */
  entryCount?: number;
}

const EliminatorCutScheduleModal: React.FC<EliminatorCutScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  gameNumbers,
  dropMode,
  roundMode,
  defaultAmount,
  amountsByGame,
  entryCount = 0,
}) => {
  const cutGames = useMemo(() => cutGamesFromStages(gameNumbers), [gameNumbers]);
  const payoutGame = gameNumbers[gameNumbers.length - 1];
  const [draft, setDraft] = useState<Record<string, number>>(() =>
    syncDropAmountsByGame(cutGames, amountsByGame, defaultAmount)
  );
  const [fillAll, setFillAll] = useState(defaultAmount);

  // Reset draft when opened / stage list changes.
  React.useEffect(() => {
    if (!isOpen) return;
    setDraft(syncDropAmountsByGame(cutGames, amountsByGame, defaultAmount));
    setFillAll(defaultAmount);
  }, [isOpen, cutGames, amountsByGame, defaultAmount]);

  const projection = useMemo(
    () =>
      projectCutSchedule({
        entryCount: Math.max(0, entryCount),
        gameNumbers,
        dropMode,
        dropAmount: defaultAmount,
        roundMode,
        dropSchedule: 'varied',
        dropAmountsByGame: draft,
      }),
    [entryCount, gameNumbers, dropMode, defaultAmount, roundMode, draft]
  );
  const warning = eliminatorProjectionWarning(projection);

  const amountLabel = dropMode === 'percentage' ? 'Drop %' : 'Drop count';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cut schedule by game"
      size="large"
      closeOnOutsideClick
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(syncDropAmountsByGame(cutGames, draft, defaultAmount));
              onClose();
            }}
          >
            Save schedule
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Set a drop for each cut game. The last stage (Game {payoutGame}) is the
          payout game and has no drop. Mode stays{' '}
          {dropMode === 'percentage' ? 'percentage of entries' : 'flat count'} for
          every cut.
        </p>

        <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface-light p-3">
          <div className="min-w-[8rem]">
            <Input
              label={`Fill all (${amountLabel})`}
              type="number"
              min={0}
              max={dropMode === 'percentage' ? 100 : 999}
              step={1}
              value={fillAll}
              onChange={(e) => setFillAll(Number(e.target.value) || 0)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              const next: Record<string, number> = {};
              for (const game of cutGames) next[String(game)] = fillAll;
              setDraft(next);
            }}
          >
            Apply to all cuts
          </Button>
        </div>

        {cutGames.length === 0 ? (
          <p className="text-sm text-text-muted">
            Select at least two eliminator games to configure cuts.
          </p>
        ) : (
          <div className="max-h-[min(55vh,28rem)] overflow-y-auto rounded-md border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="sticky top-0 bg-surface-light">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-text">Cut</th>
                  <th className="px-3 py-2 text-left font-semibold text-text">Game</th>
                  <th className="px-3 py-2 text-right font-semibold text-text">{amountLabel}</th>
                  {entryCount > 0 ? (
                    <th className="px-3 py-2 text-right font-semibold text-text">
                      After cut
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cutGames.map((game, index) => {
                  const step = projection.steps.find(
                    (s) => s.game_number === game && s.role === 'cut'
                  );
                  return (
                    <tr key={game}>
                      <td className="px-3 py-2 text-text-muted">Cut {index + 1}</td>
                      <td className="px-3 py-2 font-medium text-text">Game {game}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={dropMode === 'percentage' ? 100 : 999}
                          step={1}
                          aria-label={`Drop for game ${game}`}
                          className="ml-auto block w-24 rounded border border-border bg-surface px-2 py-1.5 text-right text-text"
                          value={draft[String(game)] ?? defaultAmount}
                          onChange={(e) => {
                            const value = Number(e.target.value) || 0;
                            setDraft((prev) => ({ ...prev, [String(game)]: value }));
                          }}
                        />
                      </td>
                      {entryCount > 0 ? (
                        <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                          {step
                            ? `${step.surviving} (−${step.dropped})`
                            : '—'}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
                <tr className="bg-surface-light/60">
                  <td className="px-3 py-2 text-text-muted">Final</td>
                  <td className="px-3 py-2 font-medium text-text">Game {payoutGame}</td>
                  <td className="px-3 py-2 text-right text-text-muted">Payout</td>
                  {entryCount > 0 ? (
                    <td className="px-3 py-2 text-right tabular-nums text-text">
                      {projection.final_alive} alive
                    </td>
                  ) : null}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {warning ? (
          <p className="text-sm text-amber-600" role="status">
            {warning}
          </p>
        ) : null}

        {entryCount <= 0 ? (
          <p className="text-xs text-text-muted">
            Survivor preview appears once entries are known; amounts still save now.
          </p>
        ) : (
          <Label className="text-xs text-text-muted">
            Preview uses {entryCount} entered bowler{entryCount === 1 ? '' : 's'}.
          </Label>
        )}
      </div>
    </Modal>
  );
};

export default EliminatorCutScheduleModal;
