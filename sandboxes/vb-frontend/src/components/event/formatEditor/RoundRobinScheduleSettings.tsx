import React from 'react';
import Input from '../../common/Input';
import Label from '../../common/Label';
import SeedSourceRoundSelect from './SeedSourceRoundSelect';

const selectCls =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text';

export type RoundRobinScheduleConfig = {
  schedule_mode?: string;
  scheduled_games?: number;
  total_matches_or_games?: number;
  position_round_game?: number | null;
  position_round_lane_placement?: string;
  seed_source_round_id?: number | null;
};

interface RoundRobinScheduleSettingsProps {
  methodConfig: RoundRobinScheduleConfig;
  onChange: (patch: Partial<RoundRobinScheduleConfig>) => void;
  /** Compact layout for embedding above a matchup grid. */
  compact?: boolean;
  eventId?: number;
  currentRoundId?: number;
  showSeedSource?: boolean;
}

/**
 * RR schedule source, week count, and position-round setup.
 * Shared by Format Editor Matchups and (optionally) the round settings modal.
 */
const RoundRobinScheduleSettings: React.FC<RoundRobinScheduleSettingsProps> = ({
  methodConfig,
  onChange,
  compact = false,
  eventId,
  currentRoundId,
  showSeedSource = false,
}) => {
  const scheduleMode = String(methodConfig.schedule_mode ?? 'league');
  const isLeague = scheduleMode === 'league';
  const scheduled = Math.max(
    1,
    Number(methodConfig.scheduled_games ?? methodConfig.total_matches_or_games ?? 1) || 1
  );
  const hasPosition =
    methodConfig.position_round_game != null &&
    Number(methodConfig.position_round_game) >= 1;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-3'}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-text">Schedule source</legend>
        {!compact && (
          <p className="text-xs text-text-muted">
            League uses the same USBC week tables as lane movement. Manual lets you generate a
            pairwise shell set and rearrange matchups yourself.
          </p>
        )}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="radio"
              name="rr-schedule-source"
              className="mt-1"
              checked={isLeague}
              onChange={() => onChange({ schedule_mode: 'league' })}
            />
            <span>
              <span className="font-medium">USBC league weeks</span>
              <span className="block text-xs text-text-muted">
                Matchups follow the league schedule table.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="radio"
              name="rr-schedule-source"
              className="mt-1"
              checked={!isLeague}
              onChange={() => onChange({ schedule_mode: 'pairwise' })}
            />
            <span>
              <span className="font-medium">Assign manually</span>
              <span className="block text-xs text-text-muted">
                Pairwise shells (legacy all-vs-all); edit pairings after generate.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          label={isLeague ? 'Scheduled games (league weeks)' : 'Matches or games (cap)'}
          type="number"
          min={1}
          value={String(
            methodConfig.scheduled_games ?? methodConfig.total_matches_or_games ?? ''
          )}
          onChange={(e) => {
            const raw = e.target.value.trim();
            const n = raw ? Math.max(1, parseInt(raw, 10) || 1) : undefined;
            onChange({
              scheduled_games: n,
              total_matches_or_games: n,
            });
          }}
          fullWidth
        />
      </div>

      {isLeague && (
        <div className="space-y-3 rounded border border-border bg-surface-light/40 p-3">
          <div>
            <Label>Position round</Label>
            <p className="text-xs text-text-muted mb-1">
              Replaces that scheduled league week with standings pairings 1v2, 3v4, 5v6…
              (setup preferred; mid-event OK if that game is still unscored). Lane placement
              is applied when you lock matchups from standings.
            </p>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={hasPosition}
                onChange={(e) => {
                  if (!e.target.checked) {
                    onChange({ position_round_game: null });
                    return;
                  }
                  onChange({ position_round_game: scheduled });
                }}
              />
              Insert position round
            </label>
          </div>
          {hasPosition && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                label="Position round game #"
                type="number"
                min={1}
                value={String(methodConfig.position_round_game ?? '')}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (!raw) {
                    onChange({ position_round_game: null });
                    return;
                  }
                  const g = Math.max(1, Math.min(scheduled, parseInt(raw, 10) || 1));
                  onChange({ position_round_game: g });
                }}
                fullWidth
              />
              <div>
                <Label>Position round lanes</Label>
                <select
                  className={selectCls}
                  value={String(methodConfig.position_round_lane_placement ?? 'start_low')}
                  onChange={(e) =>
                    onChange({ position_round_lane_placement: e.target.value })
                  }
                >
                  <option value="start_low">Start low end</option>
                  <option value="start_high">Start high end</option>
                  <option value="start_middle">Start middle</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {showSeedSource && eventId != null && currentRoundId != null ? (
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
    </div>
  );
};

export default RoundRobinScheduleSettings;
