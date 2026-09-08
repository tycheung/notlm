import React from 'react';
import Label from '../../common/Label';
import type { BracketSeedConfig, BracketSeedMode } from './bracketMatchupsUtils';
import { OPENING_ROUND_BRACKET_SEED_MODES } from './openingRoundSeeding';
import SeedSourceRoundSelect from './SeedSourceRoundSelect';

const selectCls =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text';

interface BracketSeedSettingsProps {
  methodConfig: BracketSeedConfig;
  onChange: (patch: Partial<BracketSeedConfig>) => void;
  compact?: boolean;
  /**
   * When false (opening round / no qualifying feeder), hide by-seed and keep
   * random + manual only.
   */
  allowStandingsBasedSeeding?: boolean;
  eventId?: number;
  currentRoundId?: number;
}

const SEED_OPTIONS: Array<{
  value: BracketSeedMode;
  title: string;
  detail: string;
}> = [
  {
    value: 'by_seed',
    title: 'By seed',
    detail: 'Advancement / roster order fills traditional seed slots 1…N (byes on high seeds).',
  },
  {
    value: 'random',
    title: 'Randomized',
    detail: 'Shuffle that order (stable for this round), then place on the traditional chart.',
  },
  {
    value: 'manual',
    title: 'Manual',
    detail: 'Build the bracket shells with seed ranks; assign sides yourself on Game Scoring.',
  },
];

/**
 * Bracket seeding + mode controls for Format Editor Matchups.
 */
const BracketSeedSettings: React.FC<BracketSeedSettingsProps> = ({
  methodConfig,
  onChange,
  compact = false,
  allowStandingsBasedSeeding = true,
  eventId,
  currentRoundId,
}) => {
  const isDouble = methodConfig.bracket_mode === 'double_elimination';
  const options = allowStandingsBasedSeeding
    ? SEED_OPTIONS
    : SEED_OPTIONS.filter((opt) =>
        (OPENING_ROUND_BRACKET_SEED_MODES as string[]).includes(opt.value)
      );

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text">Seeding</legend>
        {!compact && (
          <p className="text-xs text-text-muted">
            {allowStandingsBasedSeeding
              ? 'Choose how entrants land on the opening bracket chart when you generate.'
              : 'This is the first format (no qualifying feeder). Seeding from standings is unavailable — use random or manual only.'}
          </p>
        )}
        {compact && !allowStandingsBasedSeeding ? (
          <p className="text-xs text-text-muted">
            First format (no feeder): random or manual only — standings-based seeding is disabled.
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-start gap-2 text-sm text-text">
              <input
                type="radio"
                name="bracket-seed-mode"
                className="mt-1"
                checked={methodConfig.seed_mode === opt.value}
                onChange={() => onChange({ seed_mode: opt.value })}
              />
              <span>
                <span className="font-medium">{opt.title}</span>
                <span className="block text-xs text-text-muted">{opt.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {allowStandingsBasedSeeding &&
      methodConfig.seed_mode === 'by_seed' &&
      eventId != null &&
      currentRoundId != null ? (
        <SeedSourceRoundSelect
          eventId={eventId}
          currentRoundId={currentRoundId}
          value={{
            seed_source_mode: methodConfig.seed_source_mode,
            seed_source_round_id: methodConfig.seed_source_round_id,
          }}
          onChange={(patch) => onChange(patch)}
          compact={compact}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>Bracket mode</Label>
          <select
            className={selectCls}
            value={methodConfig.bracket_mode}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'single_elimination') {
                onChange({ bracket_mode: 'single_elimination', grand_final_reset: false });
              } else {
                onChange({ bracket_mode: 'double_elimination' });
              }
            }}
          >
            <option value="single_elimination">Single elimination</option>
            <option value="double_elimination">Double elimination</option>
          </select>
        </div>
      </div>

      {isDouble && (
        <label className="flex cursor-pointer items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={Boolean(methodConfig.grand_final_reset)}
            onChange={(e) => onChange({ grand_final_reset: e.target.checked })}
          />
          <span>
            <span className="font-medium">Grand final reset</span>
            <span className="block text-xs text-text-muted">
              If the losers-bracket champion wins the first grand final, add one reset match.
            </span>
          </span>
        </label>
      )}
    </div>
  );
};

export default BracketSeedSettings;
