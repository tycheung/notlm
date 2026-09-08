import React, { useEffect, useState } from 'react';
import { MysteryGameConfig } from '../../../types/side_action';
import Label from '../../../components/common/Label';
import type { EventHandicapDefaults } from '../../../components/side_actions/EventSideActionsPanel';
import { SideActionEntryUnit } from '../../../components/side_actions/EntryUnitConfigSection';
import SideActionEntryEligibilityShell from '../../../components/side_actions/SideActionEntryEligibilityShell';
import HandicapConfigSection from '../../../components/side_actions/HandicapConfigSection';
import { eligibilityFromConfig } from '../../../components/side_actions/eligibilityConfig';
import { useEligibilityConfig } from '../../../components/side_actions/useEligibilityConfig';
import OpenPotFinancialsSection from '../../../components/side_actions/OpenPotFinancialsSection';
import { OrderedGameNumbersPicker } from '../shared';

interface MysteryGameConfigFormProps {
  config: MysteryGameConfig;
  onChange: (config: Partial<MysteryGameConfig>) => void;
  eventHandicap?: EventHandicapDefaults;
  eventGameCount?: number;
  allowTeamEntry?: boolean;
  /** Baker team events default to one entry per team. */
  preferTeamEntry?: boolean;
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

const MysteryGameConfigForm: React.FC<MysteryGameConfigFormProps> = ({
  config,
  onChange,
  eventHandicap,
  eventGameCount = 3,
  allowTeamEntry = true,
  preferTeamEntry = false,
  entryFee = 0,
  onEntryFeeChange,
  entryCount = 0,
  expenseType = 'per_entry',
  expenseAmount = 0,
  placeAmounts = [100],
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
  const [gameScope, setGameScope] = useState<'single' | 'all_games_pool'>(
    config.game_scope ?? 'single'
  );
  const [gameNumbers, setGameNumbers] = useState<number[]>(() => {
    const fromConfig = config.game_numbers;
    if (Array.isArray(fromConfig) && fromConfig.length) {
      return fromConfig.filter((n) => n >= 1 && n <= gameCount);
    }
    return [1];
  });
  const [minScore, setMinScore] = useState(config.min_mystery_score ?? 0);
  const [maxScore, setMaxScore] = useState(config.max_mystery_score ?? 300);
  const [noMatchPolicy, setNoMatchPolicy] = useState<'closest' | 'respin'>(
    config.no_match_policy ?? 'closest'
  );
  const [entryUnit, setEntryUnit] = useState<SideActionEntryUnit>(() => {
    if (config.entry_unit === 'team') return 'team';
    if (config.entry_unit === 'bowler') return 'bowler';
    if (allowTeamEntry && preferTeamEntry) return 'team';
    return 'bowler';
  });
  const [places, setPlaces] = useState<number[]>(
    placeAmounts.length ? placeAmounts : [100]
  );

  useEffect(() => {
    if (gameScope === 'single' && gameNumbers.length !== 1) {
      setGameNumbers([gameNumbers[0] ?? 1]);
    }
  }, [gameScope, gameNumbers]);

  useEffect(() => {
    if (!allowTeamEntry && entryUnit === 'team') {
      setEntryUnit('bowler');
    }
  }, [allowTeamEntry, entryUnit]);

  useEffect(() => {
    const patch: Partial<MysteryGameConfig> = {
      handicap_mode: handicapMode,
      game_scope: gameScope,
      game_numbers: gameScope === 'single' ? [gameNumbers[0] ?? 1] : gameNumbers,
      min_mystery_score: minScore,
      max_mystery_score: maxScore,
      no_match_policy: noMatchPolicy,
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
    gameScope,
    gameNumbers,
    minScore,
    maxScore,
    noMatchPolicy,
    entryUnit,
    eligibilityFields,
    eventBase,
    eventPct,
    onChange,
  ]);

  useEffect(() => {
    onPlaceAmountsChange?.(places);
  }, [places, onPlaceAmountsChange]);

  const poolSubject = entryUnit === 'team' ? 'team' : 'bowler';

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
        <Label>Score pool</Label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            className="mt-1"
            checked={gameScope === 'single'}
            onChange={() => setGameScope('single')}
          />
          <span>
            <span className="font-medium">Single game</span>
            <span className="block text-xs text-text-muted">
              Mystery number is matched against scores from one selected game.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            className="mt-1"
            checked={gameScope === 'all_games_pool'}
            onChange={() => setGameScope('all_games_pool')}
          />
          <span>
            <span className="font-medium">All selected games</span>
            <span className="block text-xs text-text-muted">
              Every {poolSubject}&apos;s score on each selected game enters one shared pool.
            </span>
          </span>
        </label>
        {gameScope === 'single' ? (
          <div>
            <Label htmlFor="mg-game">Game</Label>
            <select
              id="mg-game"
              className="mt-2 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text"
              value={gameNumbers[0] ?? 1}
              onChange={(e) => setGameNumbers([Number(e.target.value)])}
            >
              {Array.from({ length: gameCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Game {n}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <OrderedGameNumbersPicker
            eventGameCount={gameCount}
            selectedGameNumbers={gameNumbers}
            onChange={setGameNumbers}
            label="Games in the mystery pool"
          />
        )}
      </div>

      <div className="rounded-md border border-border bg-surface-light p-4 space-y-3">
        <Label>Mystery number range</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="mg-min">Min Mystery Game</Label>
            <input
              id="mg-min"
              type="number"
              min={0}
              max={300}
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="mg-max">Max Mystery Game</Label>
            <input
              id="mg-max"
              type="number"
              min={0}
              max={300}
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
            />
          </div>
        </div>
        <p className="text-xs text-text-muted">
          After all scores are in, Generate spins a random integer in this inclusive range.
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface-light p-4 space-y-3">
        <Label>When no exact match</Label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            className="mt-1"
            checked={noMatchPolicy === 'closest'}
            onChange={() => setNoMatchPolicy('closest')}
          />
          <span>
            <span className="font-medium">Closest score wins</span>
            <span className="block text-xs text-text-muted">
              Ties for closest split the pot.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            className="mt-1"
            checked={noMatchPolicy === 'respin'}
            onChange={() => setNoMatchPolicy('respin')}
          />
          <span>
            <span className="font-medium">Re-spin</span>
            <span className="block text-xs text-text-muted">
              No winner until an exact match is spun (re-spin from Generate).
            </span>
          </span>
        </label>
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
        placePrizesNote="Mystery Game pays one place (exact match or closest). Ties split the prize fund."
      />
    </div>
  );
};

export default MysteryGameConfigForm;
