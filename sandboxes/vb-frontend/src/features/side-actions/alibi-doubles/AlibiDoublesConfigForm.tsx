import React, { useEffect, useState } from 'react';
import { AlibiDoublesConfig } from '../../../types/side_action';
import type { EventHandicapDefaults } from '../../../components/side_actions/EventSideActionsPanel';
import HandicapConfigSection from '../../../components/side_actions/HandicapConfigSection';
import EligibilityConfigSection from '../../../components/side_actions/EligibilityConfigSection';
import { eligibilityFromConfig } from '../../../components/side_actions/eligibilityConfig';
import { useEligibilityConfig } from '../../../components/side_actions/useEligibilityConfig';
import OpenPotFinancialsSection from '../../../components/side_actions/OpenPotFinancialsSection';
import { OrderedGameNumbersPicker } from '../shared';
import { normalizeGameNumbers } from '../shared/gamePlan';

interface AlibiDoublesConfigFormProps {
  config: AlibiDoublesConfig;
  onChange: (config: Partial<AlibiDoublesConfig>) => void;
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

const AlibiDoublesConfigForm: React.FC<AlibiDoublesConfigFormProps> = ({
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
  const { divisions, ageClasses, setDivisions, setAgeClasses, eligibilityFields } =
    useEligibilityConfig(initialEligibility);

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
  const [maxPairs, setMaxPairs] = useState<string>(
    config.max_pairs_per_bowler ? String(config.max_pairs_per_bowler) : ''
  );
  const [allowCrossSquad, setAllowCrossSquad] = useState(
    Boolean(config.allow_cross_squad)
  );
  const [requireMixed, setRequireMixed] = useState(
    Boolean(config.pair_require_mixed_gender)
  );
  const [requireOverUnder, setRequireOverUnder] = useState(
    Boolean(config.pair_require_over_under)
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
    const parsedLimit = maxPairs.trim() === '' ? null : Number(maxPairs);
    const patch: Partial<AlibiDoublesConfig> = {
      handicap_mode: handicapMode,
      game_numbers: gameNumbers,
      pair_score_mode: 'sum',
      entry_unit: 'bowler',
      max_pairs_per_bowler:
        parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0
          ? parsedLimit
          : null,
      allow_cross_squad: allowCrossSquad,
      pair_require_mixed_gender: requireMixed,
      pair_require_over_under: requireOverUnder,
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
    eligibilityFields,
    eventBase,
    eventPct,
    maxPairs,
    allowCrossSquad,
    requireMixed,
    requireOverUnder,
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
          on those games are summed, then the pair total is ranked (
          {handicapMode === 'scratch' ? 'scratch' : 'handicap'}). One pair = one
          entry fee, listed under the signer.
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface-light p-4 space-y-3">
        <label className="block text-sm font-medium text-text">
          Entry limit per bowler
          <input
            type="number"
            min={1}
            className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            placeholder="Unlimited"
            value={maxPairs}
            onChange={(e) => setMaxPairs(e.target.value)}
          />
        </label>
        <p className="text-xs text-text-muted">
          Caps how many pairs a bowler can be on as signer or partner. Leave blank
          for unlimited.
        </p>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="mt-1"
            checked={allowCrossSquad}
            onChange={(e) => setAllowCrossSquad(e.target.checked)}
          />
          <span>
            Allow partners from other squads that have not started scoring. The
            partner must already be on the event roster. Default is same squad
            only. Once a squad has started, those bowlers cannot be added as
            partners from any squad.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="mt-1"
            checked={requireMixed}
            onChange={(e) => setRequireMixed(e.target.checked)}
          />
          <span>Force mixed doubles (one male, one female)</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="mt-1"
            checked={requireOverUnder}
            onChange={(e) => setRequireOverUnder(e.target.checked)}
          />
          <span>Force over/under doubles (one senior, one non-senior)</span>
        </label>
      </div>

      <EligibilityConfigSection
        divisions={divisions}
        ageClasses={ageClasses}
        onDivisionsChange={setDivisions}
        onAgeClassesChange={setAgeClasses}
        genderNote="Gender and age filters restrict who can enter. Force mixed / over-under above if each side of the pair must be a specific type."
      />

      <OpenPotFinancialsSection
        entryFee={entryFee}
        onEntryFeeChange={onEntryFeeChange}
        entryCount={entryCount}
        entryCountLabel="pair tickets"
        expenseType={expenseType}
        expenseAmount={expenseAmount}
        onExpenseTypeChange={onExpenseTypeChange}
        onExpenseAmountChange={onExpenseAmountChange}
        places={places}
        onPlacesChange={setPlaces}
        placePrizesNote="Prize fund is pair tickets × fee. Each place pays the combo — each bowler gets 50% (e.g. 1st $100 → $50 each). A bowler on two cashed pairs gets both halves."
      />
    </div>
  );
};

export default AlibiDoublesConfigForm;
