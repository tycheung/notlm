import React, { useEffect, useState } from 'react';
import { HighSetConfig } from '../../types/side_action';
import Label from '../common/Label';
import type { EventHandicapDefaults } from './EventSideActionsPanel';
import { SideActionEntryUnit } from './EntryUnitConfigSection';
import SideActionEntryEligibilityShell from './SideActionEntryEligibilityShell';
import { eligibilityFromConfig } from './eligibilityConfig';
import { useEligibilityConfig } from './useEligibilityConfig';
import HandicapConfigSection from './HandicapConfigSection';
import OpenPotFinancialsSection from './OpenPotFinancialsSection';
import { OrderedGameNumbersPicker } from '../../features/side-actions/shared';
import { normalizeGameNumbers, validateBestN } from '../../features/side-actions/shared/gamePlan';

interface HighSetConfigFormProps {
  config: HighSetConfig;
  onChange: (config: Partial<HighSetConfig>) => void;
  eventHandicap?: EventHandicapDefaults;
  /** Game numbers available on the host event. */
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

const HighSetConfigForm: React.FC<HighSetConfigFormProps> = ({
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
  const gameCount = Math.max(1, eventGameCount || 3);
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
  const [gameNumbers, setGameNumbers] = useState<number[]>(() =>
    normalizeGameNumbers(config.game_numbers?.length ? config.game_numbers : [1], {
      eventGameCount: gameCount,
    })
  );
  const [seriesMode, setSeriesMode] = useState<'sum' | 'best_n'>(
    config.series_mode ?? 'sum'
  );
  const [bestN, setBestN] = useState(() =>
    Math.min(config.best_n ?? 1, gameNumbers.length)
  );
  const [entryUnit, setEntryUnit] = useState<SideActionEntryUnit>(
    config.entry_unit === 'team' ? 'team' : 'bowler'
  );
  const [places, setPlaces] = useState<number[]>(
    placeAmounts.length ? placeAmounts : [50, 30, 20]
  );

  useEffect(() => {
    setGameNumbers((prev) => {
      const inRange = prev.filter((gameNumber) => gameNumber <= gameCount);
      return normalizeGameNumbers(inRange.length ? inRange : [1], {
        eventGameCount: gameCount,
      });
    });
  }, [gameCount]);

  useEffect(() => {
    setBestN((prev) => Math.min(Math.max(1, prev), gameNumbers.length));
  }, [gameNumbers.length]);

  useEffect(() => {
    const patch: Partial<HighSetConfig> = {
      handicap_mode: handicapMode,
      game_numbers: gameNumbers,
      series_mode: seriesMode,
      best_n:
        seriesMode === 'best_n' && gameNumbers.length > 0
          ? validateBestN(gameNumbers, Math.min(bestN, gameNumbers.length))
          : undefined,
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
    seriesMode,
    bestN,
    eligibilityFields,
    entryUnit,
    eventBase,
    eventPct,
    onChange,
  ]);

  useEffect(() => {
    onPlaceAmountsChange?.(places);
  }, [places, onPlaceAmountsChange]);

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

      <div className="rounded-md border border-border bg-surface-light p-4">
        <OrderedGameNumbersPicker
          selectedGameNumbers={gameNumbers}
          eventGameCount={gameCount}
          onChange={(next) => {
            if (next.length) setGameNumbers(next);
          }}
          label="Games included in this series"
        />
      </div>

      <div className="rounded-md border border-border bg-surface-light p-4">
        <Label>Series scoring</Label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="radio"
              checked={seriesMode === 'sum'}
              onChange={() => setSeriesMode('sum')}
            />
            Sum every selected game
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="radio"
              checked={seriesMode === 'best_n'}
              onChange={() => setSeriesMode('best_n')}
            />
            Use the best N selected games
          </label>
          {seriesMode === 'best_n' && (
            <label className="block text-sm text-text">
              Best games counted
              <input
                type="number"
                min={1}
                max={gameNumbers.length}
                value={bestN}
                onChange={(event) =>
                  setBestN(
                    Math.min(
                      gameNumbers.length,
                      Math.max(1, Number(event.target.value) || 1)
                    )
                  )
                }
                className="mt-1 block w-24 rounded border border-border bg-surface px-2 py-1"
              />
            </label>
          )}
        </div>
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
        payoutMode="combined"
        gameNumbers={gameNumbers}
      />
    </div>
  );
};

export default HighSetConfigForm;
