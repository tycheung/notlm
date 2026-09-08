import React, { useEffect, useMemo } from 'react';
import {
  availableLeagueTeamCounts,
  chooseLeagueWrapPairOffset,
} from '../../features/lanes/usbcSchedules';
import Label from '../common/Label';
import type { LaneMovementConfig, LaneMovementMode, LanePair } from '../../features/lanes/types';

const fieldClass =
  'mt-1 w-full rounded-input border border-border bg-surface-light px-3 py-2 text-sm text-text ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50';

const inlineFieldClass =
  'rounded-input border border-border bg-surface-light px-2 py-1.5 text-sm text-text ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50';

/** Team counts with embedded official USBC schedule tables. */
const LEAGUE_TEAM_COUNT_OPTIONS = availableLeagueTeamCounts();
const DEFAULT_LEAGUE_TEAM_COUNT = LEAGUE_TEAM_COUNT_OPTIONS.includes(20)
  ? 20
  : LEAGUE_TEAM_COUNT_OPTIONS[0] ?? 8;

const MOVEMENT_MODE_OPTIONS: Array<{ value: LaneMovementMode; label: string }> = [
  { value: 'move_right', label: 'Move right' },
  { value: 'move_left', label: 'Move left' },
  { value: 'expand', label: 'Left goes Left/Right goes Right' },
  { value: 'staggered', label: 'Staggered' },
  { value: 'league', label: 'League (USBC-style)' },
];

interface MovementConfigEditorProps {
  movement: LaneMovementConfig;
  onChange: (movement: LaneMovementConfig) => void;
  numPairs: number;
  lanesInPlay: number[];
  /** Current pairs in play — used for split-house boundary choices. */
  pairsInPlay?: LanePair[];
  /** Squad/event game count; staggered rows use games - 1. */
  gameCount?: number;
  disabled?: boolean;
}

function resizeStaggeredSteps(steps: number[], moveCount: number): number[] {
  if (moveCount < 1) return [];
  const next = steps.slice(0, moveCount).map((n) => Math.trunc(n));
  const fill = next.length ? next[next.length - 1] || 1 : 1;
  while (next.length < moveCount) {
    next.push(fill);
  }
  return next;
}

const MovementConfigEditor: React.FC<MovementConfigEditorProps> = ({
  movement,
  onChange,
  numPairs,
  pairsInPlay = [],
  gameCount = 3,
  disabled = false,
}) => {
  const squadGameCount = Math.max(1, Math.trunc(gameCount) || 3);
  const staggeredMoveCount = Math.max(0, squadGameCount - 1);

  const isLeagueMode = movement.mode === 'league';
  const isStaggeredMode = movement.mode === 'staggered';
  const selectedMode = movement.mode === 'stay' ? 'move_right' : movement.mode;
  const leaguePairCount =
    movement.league_team_count != null ? Math.floor(movement.league_team_count / 2) : 0;

  const splitPairOptions = useMemo(() => {
    // Need a non-empty high half, so the final pair cannot be the split boundary.
    if (pairsInPlay.length < 2) return [];
    return pairsInPlay.slice(0, -1);
  }, [pairsInPlay]);

  const canSplitHouse = !isLeagueMode && splitPairOptions.length > 0;

  useEffect(() => {
    if (!isStaggeredMode) return;
    if (movement.staggered_steps.length === staggeredMoveCount) return;
    onChange({
      ...movement,
      staggered_steps: resizeStaggeredSteps(movement.staggered_steps, staggeredMoveCount),
    });
  }, [isStaggeredMode, staggeredMoveCount, movement, onChange]);

  useEffect(() => {
    if (!isLeagueMode || leaguePairCount < 1) return;
    const offset = movement.league_wrap_pair_offset;
    if (offset != null && offset >= 1 && offset <= leaguePairCount) return;
    onChange({
      ...movement,
      league_wrap_pair_offset: chooseLeagueWrapPairOffset(leaguePairCount),
    });
  }, [
    isLeagueMode,
    leaguePairCount,
    movement.league_wrap_pair_offset,
    movement,
    onChange,
  ]);

  useEffect(() => {
    if (!movement.split_house) return;
    if (!canSplitHouse) {
      if (movement.split_house || movement.split_after_pair_low != null) {
        onChange({
          ...movement,
          split_house: false,
          split_after_pair_low: null,
        });
      }
      return;
    }
    const validLows = new Set(splitPairOptions.map((pair) => pair[0]));
    if (
      movement.split_after_pair_low != null &&
      validLows.has(movement.split_after_pair_low)
    ) {
      return;
    }
    const mid = splitPairOptions[Math.floor((splitPairOptions.length - 1) / 2)];
    onChange({
      ...movement,
      split_after_pair_low: mid?.[0] ?? null,
    });
  }, [
    canSplitHouse,
    movement,
    onChange,
    splitPairOptions,
  ]);

  const update = (patch: Partial<LaneMovementConfig>) => {
    onChange({ ...movement, ...patch });
  };

  const updateStaggeredStep = (index: number, pairs: number, direction: 'right' | 'left') => {
    const steps = resizeStaggeredSteps(movement.staggered_steps, staggeredMoveCount);
    const magnitude = Math.max(0, Math.min(48, Math.trunc(pairs) || 0));
    steps[index] = direction === 'left' ? -magnitude : magnitude;
    update({ staggered_steps: steps });
  };

  return (
    <div className="space-y-4 rounded-input border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-text">Lane movement</h4>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={movement.enabled}
            disabled={disabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              update({
                enabled,
                ...(enabled && movement.mode === 'stay'
                  ? { mode: 'move_right' as LaneMovementMode }
                  : {}),
              });
            }}
            className="rounded border-border"
          />
          Enable movement
        </label>
      </div>

      {movement.enabled ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="movement-mode">Mode</Label>
              <select
                id="movement-mode"
                className={fieldClass}
                disabled={disabled}
                value={selectedMode}
                onChange={(e) => {
                  const mode = e.target.value as LaneMovementMode;
                  const patch: Partial<LaneMovementConfig> = { mode };
                  if (
                    mode === 'league' &&
                    (movement.league_team_count == null ||
                      !LEAGUE_TEAM_COUNT_OPTIONS.includes(movement.league_team_count))
                  ) {
                    patch.league_team_count = DEFAULT_LEAGUE_TEAM_COUNT;
                    patch.league_wrap_pair_offset = chooseLeagueWrapPairOffset(
                      DEFAULT_LEAGUE_TEAM_COUNT / 2
                    );
                  } else if (mode === 'league' && movement.league_team_count != null) {
                    const pairs = movement.league_team_count / 2;
                    if (
                      movement.league_wrap_pair_offset == null ||
                      movement.league_wrap_pair_offset < 1 ||
                      movement.league_wrap_pair_offset > pairs
                    ) {
                      patch.league_wrap_pair_offset = chooseLeagueWrapPairOffset(pairs);
                    }
                  } else if (mode !== 'league') {
                    patch.league_wrap_pair_offset = null;
                  }
                  if (mode === 'league') {
                    patch.split_house = false;
                    patch.split_after_pair_low = null;
                  }
                  if (mode === 'staggered') {
                    patch.staggered_steps = resizeStaggeredSteps(
                      movement.staggered_steps,
                      staggeredMoveCount
                    );
                  }
                  update(patch);
                }}
              >
                {MOVEMENT_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="interval-games">Every N games</Label>
              <input
                id="interval-games"
                type="number"
                min={1}
                max={4}
                className={fieldClass}
                disabled={disabled || isStaggeredMode}
                value={movement.interval_games}
                onChange={(e) =>
                  update({ interval_games: Math.max(1, Number(e.target.value) || 1) })
                }
              />
              {isLeagueMode ? (
                <p className="mt-1 text-xs text-text-muted">
                  Stay on each scheduled pair for N games before the next schedule step.
                </p>
              ) : null}
              {isStaggeredMode ? (
                <p className="mt-1 text-xs text-text-muted">Set per game below.</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="step-pairs">Pairs</Label>
              <input
                id="step-pairs"
                type="number"
                min={1}
                className={fieldClass}
                disabled={disabled || isLeagueMode || isStaggeredMode}
                value={movement.step_pairs}
                onChange={(e) => update({ step_pairs: Math.max(1, Number(e.target.value) || 1) })}
              />
              {isLeagueMode ? (
                <p className="mt-1 text-xs text-text-muted">Set by the league schedule.</p>
              ) : null}
              {isStaggeredMode ? (
                <p className="mt-1 text-xs text-text-muted">Set per game below.</p>
              ) : null}
            </div>
            {movement.mode === 'league' ? (
              <div>
                <Label htmlFor="league-team-count">League team count</Label>
                <select
                  id="league-team-count"
                  className={fieldClass}
                  disabled={disabled}
                  value={
                    movement.league_team_count != null &&
                    LEAGUE_TEAM_COUNT_OPTIONS.includes(movement.league_team_count)
                      ? movement.league_team_count
                      : DEFAULT_LEAGUE_TEAM_COUNT
                  }
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    update({
                      league_team_count: count,
                      league_wrap_pair_offset: chooseLeagueWrapPairOffset(count / 2),
                    });
                  }}
                >
                  {LEAGUE_TEAM_COUNT_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count} teams ({count / 2} pairs)
                    </option>
                  ))}
                </select>
                {movement.league_wrap_pair_offset != null ? (
                  <p className="mt-1 text-xs text-text-muted">
                    After the schedule repeats, pairs shift by +
                    {movement.league_wrap_pair_offset} (random 1–
                    {movement.league_team_count ? movement.league_team_count / 2 : '?'}
                    ).{' '}
                    <button
                      type="button"
                      className="underline hover:text-text disabled:opacity-50"
                      disabled={disabled || !movement.league_team_count}
                      onClick={() =>
                        update({
                          league_wrap_pair_offset: chooseLeagueWrapPairOffset(
                            (movement.league_team_count || 2) / 2
                          ),
                        })
                      }
                    >
                      Reroll
                    </button>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {canSplitHouse ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="split-house">Split the house</Label>
                <select
                  id="split-house"
                  className={fieldClass}
                  disabled={disabled}
                  value={movement.split_house ? 'yes' : 'no'}
                  onChange={(e) => {
                    const enabled = e.target.value === 'yes';
                    if (!enabled) {
                      update({ split_house: false, split_after_pair_low: null });
                      return;
                    }
                    const mid =
                      splitPairOptions[Math.floor((splitPairOptions.length - 1) / 2)];
                    update({
                      split_house: true,
                      split_after_pair_low:
                        movement.split_after_pair_low ?? mid?.[0] ?? null,
                    });
                  }}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
                <p className="mt-1 text-xs text-text-muted">
                  Wrap within each half instead of across the full pair set.
                </p>
              </div>
              {movement.split_house ? (
                <div>
                  <Label htmlFor="split-after-pair">Last pair before split</Label>
                  <select
                    id="split-after-pair"
                    className={fieldClass}
                    disabled={disabled}
                    value={movement.split_after_pair_low ?? ''}
                    onChange={(e) =>
                      update({
                        split_after_pair_low: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  >
                    {splitPairOptions.map((pair) => (
                      <option key={`${pair[0]}-${pair[1]}`} value={pair[0]}>
                        {pair[0]}-{pair[1]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-text-muted">
                    Low half wraps through this pair; high half wraps from the next
                    pair to the end.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {isStaggeredMode ? (
            <div className="space-y-2">
              <Label>Staggered moves</Label>
              <p className="text-xs text-text-muted">
                Define each move after a game ({squadGameCount} games → {staggeredMoveCount}{' '}
                moves). No move after the last game.
              </p>
              {staggeredMoveCount < 1 ? (
                <p className="text-sm text-text-muted">
                  Squad needs at least 2 games for staggered movement.
                </p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-input border border-border/70 p-3">
                  {Array.from({ length: staggeredMoveCount }, (_, index) => {
                    const raw = movement.staggered_steps[index] ?? 1;
                    const pairs = Math.abs(Math.trunc(raw));
                    const direction: 'right' | 'left' = raw < 0 ? 'left' : 'right';
                    return (
                      <div
                        key={`stagger-${index}`}
                        className="flex flex-nowrap items-center gap-2 text-sm text-text whitespace-nowrap"
                      >
                        <span>After game {index + 1}, move</span>
                        <input
                          type="number"
                          min={0}
                          max={48}
                          className={`${inlineFieldClass} w-16`}
                          disabled={disabled}
                          value={pairs}
                          aria-label={`Pairs to move after game ${index + 1}`}
                          onChange={(e) =>
                            updateStaggeredStep(
                              index,
                              Number(e.target.value),
                              direction
                            )
                          }
                        />
                        <span>pairs</span>
                        <select
                          className={`${inlineFieldClass} w-24`}
                          disabled={disabled}
                          value={direction}
                          aria-label={`Direction after game ${index + 1}`}
                          onChange={(e) =>
                            updateStaggeredStep(
                              index,
                              pairs,
                              e.target.value as 'right' | 'left'
                            )
                          }
                        >
                          <option value="right">right</option>
                          <option value="left">left</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <p className="text-sm text-text-muted">
            Use the movement schedule PDF above to preview lane changes across games.
          </p>
        </>
      ) : (
        <p className="text-sm text-text-muted">
          Movement is off — bowlers stay on their assigned pair for every game.
        </p>
      )}
    </div>
  );
};

export default MovementConfigEditor;
