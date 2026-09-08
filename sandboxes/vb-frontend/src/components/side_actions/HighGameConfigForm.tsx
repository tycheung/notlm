import React, { useEffect, useState } from 'react';
import { HighGameConfig } from '../../types/side_action';
import Label from '../common/Label';
import type { EventHandicapDefaults } from './EventSideActionsPanel';
import { SideActionEntryUnit } from './EntryUnitConfigSection';
import SideActionEntryEligibilityShell from './SideActionEntryEligibilityShell';
import { eligibilityFromConfig } from './eligibilityConfig';
import { useEligibilityConfig } from './useEligibilityConfig';
import HandicapConfigSection from './HandicapConfigSection';
import OpenPotFinancialsSection from './OpenPotFinancialsSection';
import { OrderedGameNumbersPicker } from '../../features/side-actions/shared';
import { normalizeGameNumbers } from '../../features/side-actions/shared/gamePlan';

interface HighGameConfigFormProps {
  config: HighGameConfig;
  onChange: (config: Partial<HighGameConfig>) => void;
  eventHandicap?: EventHandicapDefaults;
  /** Game numbers available on the host event (1..N). */
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

const HighGameConfigForm: React.FC<HighGameConfigFormProps> = ({
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
    config.handicap_mode ?? 'handicap'
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
  const [payoutMode, setPayoutMode] = useState<'per_game' | 'combined'>(
    config.payout_mode ?? 'per_game'
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
    const patch: Partial<HighGameConfig> = {
      handicap_mode: handicapMode,
      game_numbers: gameNumbers.length ? gameNumbers : [1],
      payout_mode: payoutMode,
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
    payoutMode,
    entryUnit,
    eligibilityFields,
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
          label="Games this pot applies to"
        />
      </div>

      <div className="rounded-md border border-border bg-surface-light p-4">
        <Label>Payout mode</Label>
        <div className="mt-2 space-y-2">
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="radio"
              className="mt-1"
              checked={payoutMode === 'per_game'}
              onChange={() => setPayoutMode('per_game')}
            />
            <span>
              <span className="font-medium">Each game separate</span>
              <span className="block text-xs text-text-muted">
                Place list paid once per selected game.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="radio"
              className="mt-1"
              checked={payoutMode === 'combined'}
              onChange={() => setPayoutMode('combined')}
            />
            <span>
              <span className="font-medium">Combined high-game list</span>
              <span className="block text-xs text-text-muted">
                All selected game scores compete in one list (not summed). Place list
                paid once.
              </span>
            </span>
          </label>
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
        payoutMode={payoutMode}
        gameNumbers={gameNumbers}
      />
    </div>
  );
};

export default HighGameConfigForm;
