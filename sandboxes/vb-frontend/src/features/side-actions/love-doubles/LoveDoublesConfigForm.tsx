import React, { useEffect, useState } from 'react';
import { LoveDoublesConfig } from '../../../types/side_action';
import type { EventHandicapDefaults } from '../../../components/side_actions/EventSideActionsPanel';
import HandicapConfigSection from '../../../components/side_actions/HandicapConfigSection';
import EligibilityConfigSection from '../../../components/side_actions/EligibilityConfigSection';
import { eligibilityFromConfig } from '../../../components/side_actions/eligibilityConfig';
import { useEligibilityConfig } from '../../../components/side_actions/useEligibilityConfig';
import OpenPotFinancialsSection from '../../../components/side_actions/OpenPotFinancialsSection';
import { OrderedGameNumbersPicker } from '../shared';
import { normalizeGameNumbers } from '../shared/gamePlan';

interface LoveDoublesConfigFormProps {
  config: LoveDoublesConfig;
  onChange: (config: Partial<LoveDoublesConfig>) => void;
  eventHandicap?: EventHandicapDefaults;
  eventGameCount?: number;
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

const LoveDoublesConfigForm: React.FC<LoveDoublesConfigFormProps> = ({
  config,
  onChange,
  eventHandicap,
  eventGameCount = 3,
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
    setAgeClasses,
    eligibilityFields,
  } = useEligibilityConfig({
    ...initialEligibility,
    divisions: { men: true, women: true },
  });

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
    const patch: Partial<LoveDoublesConfig> = {
      handicap_mode: handicapMode,
      game_numbers: gameNumbers,
      pair_score_mode: 'sum',
      entry_unit: 'bowler',
      ...eligibilityFields,
      divisions: { men: true, women: true },
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

      <div className="rounded-md border border-border bg-surface-light p-4 space-y-2">
        <OrderedGameNumbersPicker
          selectedGameNumbers={gameNumbers}
          eventGameCount={gameCount}
          onChange={(next) => {
            if (next.length) setGameNumbers(next);
          }}
          label="Games included in this pot"
        />
        <p className="text-xs text-text-muted">
          Often one game. Select multiple for a series — each bowler&apos;s scores
          on those games are summed, then every male is paired with every female
          ({handicapMode === 'scratch' ? 'scratch' : 'handicap'}). 4 men × 4 women
          = 16 unique doubles teams.
        </p>
      </div>

      <EligibilityConfigSection
        divisions={divisions}
        ageClasses={ageClasses}
        onDivisionsChange={() => undefined}
        onAgeClassesChange={setAgeClasses}
        hideGender
        genderNote="Men and women both enter. Every male is paired with every female. Signup requires male or female on the bowler profile."
      />

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
        placePrizesNote="Each place pays a doubles combo — each bowler gets 50% (e.g. 1st $100 → $50 each). One bowler can cash in more than one combo."
      />
    </div>
  );
};

export default LoveDoublesConfigForm;
