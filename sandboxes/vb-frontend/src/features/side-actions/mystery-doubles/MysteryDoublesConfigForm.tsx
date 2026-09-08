import React, { useEffect, useState } from 'react';
import { MysteryDoublesConfig } from '../../../types/side_action';
import Label from '../../../components/common/Label';
import Alert from '../../../components/common/Alert';
import type { EventHandicapDefaults } from '../../../components/side_actions/EventSideActionsPanel';
import HandicapConfigSection from '../../../components/side_actions/HandicapConfigSection';
import EligibilityConfigSection from '../../../components/side_actions/EligibilityConfigSection';
import { eligibilityFromConfig } from '../../../components/side_actions/eligibilityConfig';
import { useEligibilityConfig } from '../../../components/side_actions/useEligibilityConfig';
import OpenPotFinancialsSection from '../../../components/side_actions/OpenPotFinancialsSection';

interface MysteryDoublesConfigFormProps {
  config: MysteryDoublesConfig;
  onChange: (config: Partial<MysteryDoublesConfig>) => void;
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

const MysteryDoublesConfigForm: React.FC<MysteryDoublesConfigFormProps> = ({
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
  const [gameNumber, setGameNumber] = useState<number>(() => {
    const fromConfig = config.game_numbers?.[0];
    return fromConfig && fromConfig >= 1 && fromConfig <= gameCount ? fromConfig : 1;
  });
  const [oddPolicy, setOddPolicy] = useState<'block_until_even' | 'refund_random'>(
    config.odd_entrant_policy ?? 'block_until_even'
  );
  const [places, setPlaces] = useState<number[]>(
    placeAmounts.length ? placeAmounts : [50, 30, 20]
  );

  useEffect(() => {
    if (gameNumber > gameCount) setGameNumber(1);
  }, [gameCount, gameNumber]);

  useEffect(() => {
    const patch: Partial<MysteryDoublesConfig> = {
      handicap_mode: handicapMode,
      game_numbers: [gameNumber],
      odd_entrant_policy: oddPolicy,
      pair_score_mode: 'sum',
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
    gameNumber,
    oddPolicy,
    eligibilityFields,
    eventBase,
    eventPct,
    onChange,
  ]);

  useEffect(() => {
    onPlaceAmountsChange?.(places);
  }, [places, onPlaceAmountsChange]);

  const oddWarning =
    entryCount > 0 && entryCount % 2 === 1
      ? `Odd number of entrants (${entryCount}). Add one more, or one random entrant will need to be refunded when pairs are drawn.`
      : null;

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

      <div className="rounded-md border border-border bg-surface-light p-4">
        <Label htmlFor="md-game">Game for this pot</Label>
        <select
          id="md-game"
          className="mt-2 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text"
          value={gameNumber}
          onChange={(e) => setGameNumber(Number(e.target.value))}
        >
          {Array.from({ length: gameCount }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              Game {n}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-text-muted">
          Entrants are randomly paired. Team score = sum of both bowlers&apos; scores
          for this game ({handicapMode === 'scratch' ? 'scratch' : 'handicap'}).
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface-light p-4 space-y-3">
        <Label>Odd number of entrants</Label>
        {oddWarning && <Alert variant="warning" message={oddWarning} isDismissible={false} />}
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            className="mt-1"
            checked={oddPolicy === 'block_until_even'}
            onChange={() => setOddPolicy('block_until_even')}
          />
          <span>
            <span className="font-medium">Require even field</span>
            <span className="block text-xs text-text-muted">
              Block drawing pairs until one more entrant is added.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            className="mt-1"
            checked={oddPolicy === 'refund_random'}
            onChange={() => setOddPolicy('refund_random')}
          />
          <span>
            <span className="font-medium">Refund one random entrant</span>
            <span className="block text-xs text-text-muted">
              When pairs are drawn, one entrant is randomly left out and should be refunded.
            </span>
          </span>
        </label>
      </div>

      <EligibilityConfigSection
        divisions={divisions}
        ageClasses={ageClasses}
        onDivisionsChange={setDivisions}
        onAgeClassesChange={setAgeClasses}
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
        placePrizesNote="Each place pays a doubles team — each bowler gets 50% (e.g. 1st $100 → $50 each)."
      />
    </div>
  );
};

export default MysteryDoublesConfigForm;
