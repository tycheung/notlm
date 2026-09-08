import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RoundsAPI } from '../../../api/rounds';
import Label from '../../common/Label';
import {
  SEED_SOURCE_MODE_OPTIONS,
  ancestorRoundsForSeeding,
  normalizeSeedSourceMode,
  normalizeSeedSourceRoundId,
  roundSeedSourceLabel,
  type SeedSourceConfig,
  type SeedSourceMode,
} from './seedSourceRound';

const selectCls =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text';

interface SeedSourceRoundSelectProps {
  eventId: number;
  currentRoundId: number;
  value: SeedSourceConfig;
  onChange: (patch: SeedSourceConfig) => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Choose feeder, a specific round, or event cumulative totals for seed 1…N among advancers.
 */
const SeedSourceRoundSelect: React.FC<SeedSourceRoundSelectProps> = ({
  eventId,
  currentRoundId,
  value,
  onChange,
  disabled = false,
  compact = false,
}) => {
  const enabled = Number.isFinite(eventId) && eventId > 0;
  const roundsQuery = useQuery({
    queryKey: ['eventRounds', eventId],
    queryFn: () => RoundsAPI.getEventRounds(eventId),
    enabled,
    staleTime: 30_000,
  });
  const options = ancestorRoundsForSeeding(roundsQuery.data, currentRoundId);
  const mode = normalizeSeedSourceMode(value.seed_source_mode, value.seed_source_round_id);
  const selectedRound = normalizeSeedSourceRoundId(value.seed_source_round_id);

  const setMode = (nextMode: SeedSourceMode) => {
    if (nextMode === 'feeder') {
      onChange({ seed_source_mode: 'feeder', seed_source_round_id: null });
      return;
    }
    if (nextMode === 'all_rounds') {
      onChange({ seed_source_mode: 'all_rounds', seed_source_round_id: null });
      return;
    }
    onChange({
      seed_source_mode: 'round',
      seed_source_round_id: selectedRound ?? options[0]?.id ?? null,
    });
  };

  const activeHint = SEED_SOURCE_MODE_OPTIONS.find((o) => o.value === mode)?.hint;

  return (
    <div>
      <Label htmlFor={`seed-source-mode-${currentRoundId}`}>Seed order from</Label>
      <p className="mb-1 text-xs text-text-muted">
        {compact
          ? 'Who is seed 1 among people who already advanced. Does not change the cut. Generate after changing.'
          : 'Who is seed 1 among people who already advanced. Does not change who made the cut. Regenerate matchups after changing.'}
      </p>
      <select
        id={`seed-source-mode-${currentRoundId}`}
        className={`${selectCls} mb-2`}
        disabled={disabled || roundsQuery.isLoading}
        value={mode}
        onChange={(e) => setMode(e.target.value as SeedSourceMode)}
      >
        {SEED_SOURCE_MODE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {mode === 'round' ? (
        <select
          id={`seed-source-round-${currentRoundId}`}
          className={selectCls}
          disabled={disabled || roundsQuery.isLoading || options.length === 0}
          value={selectedRound == null ? '' : String(selectedRound)}
          onChange={(e) => {
            const raw = e.target.value.trim();
            onChange({
              seed_source_mode: 'round',
              seed_source_round_id: raw ? Number(raw) : null,
            });
          }}
        >
          <option value="" disabled>
            Choose round…
          </option>
          {options.map((row) => (
            <option key={row.id} value={row.id}>
              {roundSeedSourceLabel(row)}
            </option>
          ))}
        </select>
      ) : null}
      {activeHint ? <p className="mt-1 text-xs text-text-muted">{activeHint}</p> : null}
    </div>
  );
};

export default SeedSourceRoundSelect;
