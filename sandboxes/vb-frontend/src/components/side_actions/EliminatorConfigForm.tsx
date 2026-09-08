import React, { useEffect, useMemo, useState } from 'react';
import { EliminatorConfig } from '../../types/side_action';
import Input from '../common/Input';
import Label from '../common/Label';
import Button from '../common/Button';
import type { EventHandicapDefaults } from './EventSideActionsPanel';
import { SideActionEntryUnit } from './EntryUnitConfigSection';
import SideActionEntryEligibilityShell from './SideActionEntryEligibilityShell';
import { eligibilityFromConfig } from './eligibilityConfig';
import { useEligibilityConfig } from './useEligibilityConfig';
import HandicapConfigSection from './HandicapConfigSection';
import OpenPotFinancialsSection from './OpenPotFinancialsSection';
import EliminatorCutScheduleModal from './EliminatorCutScheduleModal';
import { OrderedGameNumbersPicker } from '../../features/side-actions/shared';
import { normalizeGameNumbers } from '../../features/side-actions/shared/gamePlan';
import {
  cutGamesFromStages,
  formatEliminatorDropLabel,
  syncDropAmountsByGame,
} from '../../utils/eliminatorProjection';

interface EliminatorConfigFormProps {
  config: EliminatorConfig;
  onChange: (config: Partial<EliminatorConfig>) => void;
  eventHandicap?: EventHandicapDefaults;
  eventGameCount?: number;
  allowTeamEntry?: boolean;
  entryFee?: number;
  onEntryFeeChange?: (value: number) => void;
  entryCount?: number;
  expenseType?: 'per_entry' | 'flat';
  expenseAmount?: number;
  placeAmounts?: number[];
  onExpenseTypeChange?: (type: 'per_entry' | 'flat') => void;
  onExpenseAmountChange?: (amount: number) => void;
  onPlaceAmountsChange?: (amounts: number[]) => void;
}

const EliminatorConfigForm: React.FC<EliminatorConfigFormProps> = ({
  config,
  onChange,
  eventHandicap,
  eventGameCount = 3,
  allowTeamEntry = true,
  entryFee = 0,
  onEntryFeeChange,
  entryCount = 0,
  expenseType = 'per_entry',
  expenseAmount = 0,
  placeAmounts = [50, 30, 20],
  onExpenseTypeChange,
  onExpenseAmountChange,
  onPlaceAmountsChange,
}) => {
  const eventBase = eventHandicap?.base_score ?? 200;
  const eventPct = eventHandicap?.percentage ?? 90;
  const maxGame = Math.max(1, eventGameCount || 3);
  const initialEligibility = eligibilityFromConfig(config);
  const {
    divisions,
    ageClasses,
    setDivisions,
    setAgeClasses,
    eligibilityFields,
  } = useEligibilityConfig(initialEligibility);

  const [handicapMode, setHandicapMode] = useState<'scratch' | 'handicap'>(
    config.handicap_mode ?? 'scratch'
  );
  const [handicapSource, setHandicapSource] = useState<'event_default' | 'manual'>(
    config.handicap_source ?? 'event_default'
  );
  const [manualBase, setManualBase] = useState(config.handicap_base_score ?? eventBase);
  const [manualPct, setManualPct] = useState(config.handicap_percentage ?? eventPct);
  const [gameNumbers, setGameNumbers] = useState<number[]>(() => {
    if (config.game_numbers?.length) {
      return normalizeGameNumbers(config.game_numbers, {
        eventGameCount: maxGame,
      });
    }
    return Array.from(
      { length: Math.min(3, maxGame) },
      (_, index) => index + 1
    );
  });
  const [dropMode, setDropMode] = useState<'percentage' | 'flat'>(
    config.drop_mode === 'flat' ? 'flat' : 'percentage'
  );
  const [dropAmount, setDropAmount] = useState(
    config.drop_amount ?? (config.drop_mode === 'flat' ? 1 : 50)
  );
  const [dropSchedule, setDropSchedule] = useState<'uniform' | 'varied'>(
    config.drop_schedule === 'varied' ? 'varied' : 'uniform'
  );
  const [dropAmountsByGame, setDropAmountsByGame] = useState<Record<string, number>>(
    () =>
      syncDropAmountsByGame(
        cutGamesFromStages(
          config.game_numbers?.length
            ? normalizeGameNumbers(config.game_numbers, { eventGameCount: maxGame })
            : Array.from({ length: Math.min(3, maxGame) }, (_, i) => i + 1)
        ),
        config.drop_amounts_by_game,
        config.drop_amount ?? (config.drop_mode === 'flat' ? 1 : 50)
      )
  );
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [roundMode, setRoundMode] = useState<'up' | 'down'>(
    config.round_mode === 'up' ? 'up' : 'down'
  );
  const [places, setPlaces] = useState<number[]>(
    placeAmounts.length ? placeAmounts : [50, 30, 20]
  );
  const [entryUnit, setEntryUnit] = useState<SideActionEntryUnit>(
    config.entry_unit === 'team' ? 'team' : 'bowler'
  );

  const cutGames = useMemo(() => cutGamesFromStages(gameNumbers), [gameNumbers]);

  useEffect(() => {
    setGameNumbers((previous) => {
      const available = previous.filter((gameNumber) => gameNumber <= maxGame);
      return available.length ? available : [1];
    });
  }, [maxGame]);

  useEffect(() => {
    setDropAmountsByGame((previous) => {
      const next = syncDropAmountsByGame(cutGames, previous, dropAmount);
      const prevKeys = Object.keys(previous);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => previous[key] === next[key])
      ) {
        return previous;
      }
      return next;
    });
  }, [cutGames, dropAmount]);

  useEffect(() => {
    const patch: Partial<EliminatorConfig> = {
      handicap_mode: handicapMode,
      game_numbers: gameNumbers,
      drop_mode: dropMode,
      drop_amount: dropAmount,
      drop_schedule: dropSchedule,
      drop_amounts_by_game:
        dropSchedule === 'varied'
          ? syncDropAmountsByGame(cutGames, dropAmountsByGame, dropAmount)
          : dropAmountsByGame,
      round_mode: dropMode === 'percentage' ? roundMode : undefined,
      entry_unit: entryUnit,
      ...eligibilityFields,
    };
    if (handicapMode === 'scratch') {
      patch.handicap_source = undefined;
      patch.handicap_base_score = undefined;
      patch.handicap_percentage = undefined;
    } else {
      patch.handicap_source = handicapSource;
      if (handicapSource === 'event_default') {
        patch.handicap_base_score = eventBase;
        patch.handicap_percentage = eventPct;
      } else {
        patch.handicap_base_score = manualBase;
        patch.handicap_percentage = manualPct;
      }
    }
    onChange(patch);
  }, [
    handicapMode,
    handicapSource,
    manualBase,
    manualPct,
    gameNumbers,
    dropMode,
    dropAmount,
    dropSchedule,
    dropAmountsByGame,
    cutGames,
    roundMode,
    entryUnit,
    eligibilityFields,
    eventBase,
    eventPct,
    onChange,
  ]);

  useEffect(() => {
    onPlaceAmountsChange?.(places);
  }, [places, onPlaceAmountsChange]);

  const payoutGame = gameNumbers[gameNumbers.length - 1];
  const scheduleSummary = formatEliminatorDropLabel({
    dropMode,
    dropAmount,
    dropSchedule,
    roundMode,
  });

  return (
    <div className="space-y-4">
      <SideActionEntryEligibilityShell
        entryUnit={entryUnit}
        onEntryUnitChange={setEntryUnit}
        allowTeamEntry={allowTeamEntry}
        divisions={divisions}
        ageClasses={ageClasses}
        onDivisionsChange={setDivisions}
        onAgeClassesChange={setAgeClasses}
      />

      <HandicapConfigSection
        handicapMode={handicapMode}
        onHandicapModeChange={setHandicapMode}
        handicapSource={handicapSource}
        onHandicapSourceChange={setHandicapSource}
        manualBase={manualBase}
        onManualBaseChange={setManualBase}
        manualPct={manualPct}
        onManualPctChange={setManualPct}
        eventBase={eventBase}
        eventPct={eventPct}
      />

      <div className="rounded-md border border-border bg-surface-light p-4 space-y-3">
        <Label>Eliminator games</Label>
        <p className="text-xs text-text-muted">
          Selected games are the stage sequence. Cuts apply after each selected game
          except the last (payout game).
        </p>
        <OrderedGameNumbersPicker
          eventGameCount={maxGame}
          selectedGameNumbers={gameNumbers}
          onChange={setGameNumbers}
          label="Stage games"
        />
        <p className="text-sm text-text">
          Final / payout: Game {payoutGame}
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface-light p-4 space-y-3">
        <Label>Drops each cut game</Label>
        <p className="text-xs text-text-muted">
          Percentage is of total entries, not of who is still alive — e.g. 30 entries at 33%
          (round up) drops 10 every cut game when the schedule is uniform.
        </p>
        <div className="mt-1 space-y-2">
          <label className="flex items-center text-sm text-text">
            <input
              type="radio"
              className="mr-2"
              checked={dropMode === 'percentage'}
              onChange={() => {
                setDropMode('percentage');
                if (dropAmount > 100) setDropAmount(50);
              }}
            />
            Percentage of entered bowlers
          </label>
          <label className="flex items-center text-sm text-text">
            <input
              type="radio"
              className="mr-2"
              checked={dropMode === 'flat'}
              onChange={() => {
                setDropMode('flat');
                if (dropAmount > 50) setDropAmount(1);
              }}
            />
            Flat number of bowlers
          </label>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs">Cut schedule</Label>
          <label className="flex items-center text-sm text-text">
            <input
              type="radio"
              className="mr-2"
              checked={dropSchedule === 'uniform'}
              onChange={() => setDropSchedule('uniform')}
            />
            Same amount each cut
          </label>
          <label className="flex items-center text-sm text-text">
            <input
              type="radio"
              className="mr-2"
              checked={dropSchedule === 'varied'}
              onChange={() => {
                setDropAmountsByGame(
                  syncDropAmountsByGame(cutGames, dropAmountsByGame, dropAmount)
                );
                setDropSchedule('varied');
              }}
            />
            Varied by game
          </label>
        </div>

        {dropSchedule === 'uniform' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <Input
              label={dropMode === 'percentage' ? 'Drop %' : 'Drop count'}
              type="number"
              min={0}
              max={dropMode === 'percentage' ? 100 : 999}
              step={1}
              value={dropAmount}
              onChange={(e) => setDropAmount(Number(e.target.value) || 0)}
            />
            {dropMode === 'percentage' && (
              <div>
                <Label className="text-xs">Round fractional drops</Label>
                <div className="mt-1 space-y-1">
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      className="mr-2"
                      checked={roundMode === 'down'}
                      onChange={() => setRoundMode('down')}
                    />
                    Round down
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      className="mr-2"
                      checked={roundMode === 'up'}
                      onChange={() => setRoundMode('up')}
                    />
                    Round up
                  </label>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {dropMode === 'percentage' && (
              <div>
                <Label className="text-xs">Round fractional drops</Label>
                <div className="mt-1 space-y-1">
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      className="mr-2"
                      checked={roundMode === 'down'}
                      onChange={() => setRoundMode('down')}
                    />
                    Round down
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      className="mr-2"
                      checked={roundMode === 'up'}
                      onChange={() => setRoundMode('up')}
                    />
                    Round up
                  </label>
                </div>
              </div>
            )}
            <p className="text-sm text-text">{scheduleSummary}</p>
            <p className="text-xs text-text-muted">
              {cutGames.length} cut game{cutGames.length === 1 ? '' : 's'}
              {cutGames.length
                ? `: ${cutGames.map((g) => `G${g}=${dropAmountsByGame[String(g)] ?? dropAmount}${dropMode === 'percentage' ? '%' : ''}`).join(', ')}`
                : ''}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={cutGames.length === 0}
              onClick={() => setScheduleOpen(true)}
            >
              Edit cut schedule…
            </Button>
          </div>
        )}
      </div>

      <OpenPotFinancialsSection
        entryFee={entryFee}
        onEntryFeeChange={onEntryFeeChange}
        entryCount={entryCount}
        expenseType={expenseType}
        expenseAmount={expenseAmount}
        onExpenseTypeChange={onExpenseTypeChange}
        onExpenseAmountChange={onExpenseAmountChange}
        places={places}
        onPlacesChange={setPlaces}
      />

      <EliminatorCutScheduleModal
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSave={setDropAmountsByGame}
        gameNumbers={gameNumbers}
        dropMode={dropMode}
        roundMode={roundMode}
        defaultAmount={dropAmount}
        amountsByGame={dropAmountsByGame}
        entryCount={entryCount}
      />
    </div>
  );
};

export default EliminatorConfigForm;
