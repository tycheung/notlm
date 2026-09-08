import React, { useEffect, useState } from 'react';
import { BracketConfig } from '../../types/side_action';
import Input from '../common/Input';
import Label from '../common/Label';
import type { EventHandicapDefaults } from './EventSideActionsPanel';
import SideActionEntryEligibilityShell from './SideActionEntryEligibilityShell';
import { SideActionEntryUnit } from './EntryUnitConfigSection';
import { eligibilityFromConfig } from './eligibilityConfig';
import { useEligibilityConfig } from './useEligibilityConfig';
import { OrderedGameNumbersPicker } from '../../features/side-actions/shared';
import {
  normalizeGameNumbers,
  normalizeGameOrder,
  orderedStageGames,
  type GameOrder,
} from '../../features/side-actions/shared/gamePlan';

interface BracketConfigFormProps {
  config: BracketConfig;
  onChange: (config: Partial<BracketConfig>) => void;
  eventHandicap?: EventHandicapDefaults;
  eventGameCount?: number;
  allowTeamEntry?: boolean;
}

const BracketConfigForm: React.FC<BracketConfigFormProps> = ({
  config,
  onChange,
  eventHandicap,
  eventGameCount = 3,
  allowTeamEntry = true,
}) => {
  const eventBase = eventHandicap?.base_score ?? 200;
  const eventPct = eventHandicap?.percentage ?? 90;
  const maxGame = Math.max(3, eventGameCount);
  const initialEligibility = eligibilityFromConfig(config);
  const {
    divisions,
    ageClasses,
    setDivisions,
    setAgeClasses,
    eligibilityFields,
  } = useEligibilityConfig(initialEligibility);
  const [gameNumbers, setGameNumbers] = useState<number[]>(() =>
    normalizeGameNumbers(config.game_numbers?.length ? config.game_numbers : [1, 2, 3], {
      eventGameCount: maxGame,
    })
  );
  const [gameOrder, setGameOrder] = useState<GameOrder>(() =>
    normalizeGameOrder(config.game_order)
  );
  const [entryUnit, setEntryUnit] = useState<SideActionEntryUnit>(
    config.entry_unit === 'team' ? 'team' : 'bowler'
  );

  const [byeHandling, setByeHandling] = useState<'none' | 'fill_one_bracket' | 'create_specific'>(
    config.bye_handling || 'none'
  );
  const [specificBrackets, setSpecificBrackets] = useState<number>(
    config.specific_brackets || 0
  );
  const [handicapMode, setHandicapMode] = useState<'scratch' | 'handicap'>(
    config.handicap_mode ?? 'handicap'
  );
  const [handicapSource, setHandicapSource] = useState<'event_default' | 'manual'>(
    config.handicap_source ?? 'event_default'
  );
  const [manualBase, setManualBase] = useState(
    config.handicap_base_score ?? eventBase
  );
  const [manualPct, setManualPct] = useState(
    config.handicap_percentage ?? eventPct
  );

  useEffect(() => {
    setGameNumbers((previous) => {
      const available = previous.filter((gameNumber) => gameNumber <= maxGame);
      return available.length ? available : [1, 2, 3];
    });
  }, [maxGame]);

  useEffect(() => {
    const patch: Partial<BracketConfig> = {
      game_numbers: gameNumbers,
      game_order: gameOrder,
      bye_handling: byeHandling,
      specific_brackets: byeHandling === 'create_specific' ? specificBrackets : undefined,
      tiebreaker_method: 'both_advance',
      final_tie_splits_prize: true,
      round_count: gameNumbers.length,
      handicap_mode: handicapMode,
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
    byeHandling,
    gameNumbers,
    gameOrder,
    specificBrackets,
    handicapMode,
    handicapSource,
    manualBase,
    manualPct,
    entryUnit,
    eligibilityFields,
    eventBase,
    eventPct,
    onChange,
  ]);

  const stageOrderPreview = orderedStageGames(gameNumbers, {
    gameOrder,
    eventGameCount: maxGame,
  });
  const hasExactThree = gameNumbers.length === 3;

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

      <div className="rounded-md border border-border bg-surface-light p-4 space-y-4">
        <OrderedGameNumbersPicker
          eventGameCount={maxGame}
          selectedGameNumbers={gameNumbers}
          onChange={setGameNumbers}
          label="Bracket round games (select exactly 3)"
        />
        {!hasExactThree ? (
          <p className="text-sm text-amber-200/90">
            {gameNumbers.length === 0
              ? 'Select exactly 3 games for bracket stages (G1, G2, Final).'
              : `Select exactly 3 games (${gameNumbers.length} selected).`}
          </p>
        ) : null}
        <div>
          <Label>Game order</Label>
          <div className="mt-2 space-y-2">
            <label className="flex items-start gap-2 text-sm text-text">
              <input
                type="radio"
                className="mt-1"
                checked={gameOrder === 'forward'}
                onChange={() => setGameOrder('forward')}
              />
              <span>
                <span className="font-medium">Forward</span>
                <span className="block text-xs text-text-muted">
                  Stages run low → high
                  {hasExactThree && gameOrder === 'forward'
                    ? ` (G1=${stageOrderPreview[0]}, G2=${stageOrderPreview[1]}, Final=${stageOrderPreview[2]})`
                    : ''}
                  .
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-text">
              <input
                type="radio"
                className="mt-1"
                checked={gameOrder === 'reverse'}
                onChange={() => setGameOrder('reverse')}
              />
              <span>
                <span className="font-medium">Reverse</span>
                <span className="block text-xs text-text-muted">
                  Stages run high → low
                  {hasExactThree && gameOrder === 'reverse'
                    ? ` (G1=${stageOrderPreview[0]}, G2=${stageOrderPreview[1]}, Final=${stageOrderPreview[2]})`
                    : ''}
                  .
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>
      <div className="mb-4 rounded-md border border-border bg-surface-light p-4">
        <Label>Scoring</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center">
            <input
              id="bracket-scratch"
              name="handicapMode"
              type="radio"
              checked={handicapMode === 'scratch'}
              onChange={() => setHandicapMode('scratch')}
              className="h-4 w-4 text-primary focus:ring-primary border-border"
            />
            <label htmlFor="bracket-scratch" className="ml-2 block text-sm text-text">
              Scratch (no handicap)
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="bracket-handicap"
              name="handicapMode"
              type="radio"
              checked={handicapMode === 'handicap'}
              onChange={() => setHandicapMode('handicap')}
              className="h-4 w-4 text-primary focus:ring-primary border-border"
            />
            <label htmlFor="bracket-handicap" className="ml-2 block text-sm text-text">
              Handicap
            </label>
          </div>
        </div>

        {handicapMode === 'handicap' && (
          <div className="mt-4 ml-2 space-y-3 border-l-2 border-border pl-4">
            <div className="flex items-center">
              <input
                id="handicap-event-default"
                name="handicapSource"
                type="radio"
                checked={handicapSource === 'event_default'}
                onChange={() => setHandicapSource('event_default')}
                className="h-4 w-4 text-primary focus:ring-primary border-border"
              />
              <label htmlFor="handicap-event-default" className="ml-2 block text-sm text-text">
                Default to event handicap ({eventBase} base, {eventPct}%)
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="handicap-manual"
                name="handicapSource"
                type="radio"
                checked={handicapSource === 'manual'}
                onChange={() => setHandicapSource('manual')}
                className="h-4 w-4 text-primary focus:ring-primary border-border"
              />
              <label htmlFor="handicap-manual" className="ml-2 block text-sm text-text">
                Manual handicap
              </label>
            </div>
            {handicapSource === 'manual' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Input
                  label="Handicap base score"
                  name="handicapBase"
                  type="number"
                  value={manualBase}
                  onChange={(e) => setManualBase(parseInt(e.target.value, 10) || 0)}
                  min={0}
                  fullWidth
                />
                <Input
                  label="Handicap percentage"
                  name="handicapPct"
                  type="number"
                  value={manualPct}
                  onChange={(e) => setManualPct(parseInt(e.target.value, 10) || 0)}
                  min={0}
                  max={100}
                  fullWidth
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4">
        <Label>Bye Handling</Label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              id="none"
              name="byeHandling"
              type="radio"
              checked={byeHandling === 'none'}
              onChange={() => setByeHandling('none')}
              className="h-4 w-4 text-primary focus:ring-primary border-border"
            />
            <label htmlFor="none" className="ml-2 block text-sm text-text">
              Zero Byes (No extra participants)
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="fill_one_bracket"
              name="byeHandling"
              type="radio"
              checked={byeHandling === 'fill_one_bracket'}
              onChange={() => setByeHandling('fill_one_bracket')}
              className="h-4 w-4 text-primary focus:ring-primary border-border"
            />
            <label htmlFor="fill_one_bracket" className="ml-2 block text-sm text-text">
              Fill one extra bracket (Add enough to complete one more)
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="create_specific"
              name="byeHandling"
              type="radio"
              checked={byeHandling === 'create_specific'}
              onChange={() => setByeHandling('create_specific')}
              className="h-4 w-4 text-primary focus:ring-primary border-border"
            />
            <label htmlFor="create_specific" className="ml-2 block text-sm text-text">
              Add byes to create specific number of brackets
            </label>
          </div>
        </div>
      </div>

      {byeHandling === 'create_specific' && (
        <div className="ml-6 mb-4">
          <Input
            label="Number of Brackets"
            name="specificBrackets"
            type="number"
            value={specificBrackets}
            onChange={(e) => setSpecificBrackets(parseInt(e.target.value, 10) || 0)}
            min={1}
            fullWidth
          />
          <p className="text-sm text-text-muted mt-1">
            This will determine how many total brackets to create by adding byes as needed.
          </p>
        </div>
      )}

      <div className="mb-4 rounded-md border border-border bg-surface-light p-4">
        <Label>Tie rules (all brackets)</Label>
        <ul className="mt-2 space-y-2 text-sm text-text">
          <li className="flex gap-2">
            <span className="text-primary font-semibold shrink-0">G1 / G2:</span>
            <span>
              If both bowlers tie, both advance to the next round (no win/loss credited).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-semibold shrink-0">Final:</span>
            <span>
              If both finalists tie, the prize is split equally between 1st and 2nd place.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BracketConfigForm;
