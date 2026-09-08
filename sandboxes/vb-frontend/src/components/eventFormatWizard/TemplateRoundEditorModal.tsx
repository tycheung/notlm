import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';
import { AdvancementMethod } from '../../types/roundRelationship';
import { DEFAULT_COMPETITION_METHOD_CONFIGS } from '../../constants/competitionMethodDefaults';
import { getCompetitionMethodDisplayLabel } from '../../utils/competitionMethodDisplay';
import { syncRoundScoringFields } from '../../utils/eventStructurePayloadFlow';
import {
  pickRoundGameScoring,
  stripDylgUnlessEliminator,
  type RoundGameStyle,
} from '../../utils/roundGameScoring';
import RoundRobinScheduleSettings from '../event/formatEditor/RoundRobinScheduleSettings';
import PodsSizeAdvanceSettings from '../event/formatEditor/PodsSizeAdvanceSettings';
import {
  podsConfigFromRound,
  podsConfigToPatch,
} from '../event/formatEditor/podsMatchupsUtils';
import {
  allowsStandingsBasedSeeding,
  coerceBracketSeedModeForOpening,
  coercePodsBalanceModeForOpening,
  roundHasIncomingFeeder,
  roundRefHasIncomingFeeder,
} from '../event/formatEditor/openingRoundSeeding';
import DylgRoundConfigSection from './DylgRoundConfigSection';

export interface TemplateRoundEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Round spec from payload (mutated copy on save). */
  draft: Record<string, unknown> | null;
  relationships?: Record<string, unknown>[];
  isNew: boolean;
  onSave: (next: Record<string, unknown>) => void;
  onDelete?: () => void;
  /** When false, hide team DYLG scope (singles events). Default: show both. */
  isTeamEvent?: boolean;
  /** Override modal title (e.g. event-scoped edit). */
  title?: string;
  saveLabel?: string;
  saveDisabled?: boolean;
  /**
   * When true, hide RR schedule source / scheduled games / position round
   * (those live on Format Editor → Matchups).
   */
  hideRoundRobinSchedule?: boolean;
  /**
   * @deprecated Pods min/max + advance-by-size always show in this modal now.
   */
  hidePodsSizeSettings?: boolean;
}

const TemplateRoundEditorModal: React.FC<TemplateRoundEditorModalProps> = ({
  isOpen,
  onClose,
  draft,
  relationships = [],
  isNew,
  onSave,
  onDelete,
  isTeamEvent = true,
  title,
  saveLabel = 'Save',
  saveDisabled = false,
  hideRoundRobinSchedule = false,
  hidePodsSizeSettings = false,
}) => {
  const [local, setLocal] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!isOpen || !draft) {
      setLocal(null);
      return;
    }
    const copy = JSON.parse(JSON.stringify(draft)) as Record<string, unknown>;
    const cm = String(copy.competition_method || AdvancementMethod.ELIMINATOR);
    const method = (Object.values(AdvancementMethod) as string[]).includes(cm)
      ? (cm as AdvancementMethod)
      : AdvancementMethod.ELIMINATOR;
    copy.competition_method = method;
    const cfg = (copy.competition_method_config as Record<string, unknown> | undefined) || {};
    const scoring = pickRoundGameScoring(cfg);
    // RR: games-per-match is independent of "Matches or games" (schedule length).
    // Prefer games_per_match so a polluted round game_count/max_games (e.g. 32) does not win.
    const inferredGames =
      method === AdvancementMethod.ROUND_ROBIN
        ? Number(cfg.games_per_match ?? cfg.game_count ?? 1)
        : Number(copy.game_count ?? cfg.game_count ?? 1);
    const seriesMode =
      cfg.series_decision_mode ??
      DEFAULT_COMPETITION_METHOD_CONFIGS[method].series_decision_mode ??
      (method === AdvancementMethod.ROUND_ROBIN ? 'games_total' : 'race_to_wins');
    copy.competition_method_config = {
      ...DEFAULT_COMPETITION_METHOD_CONFIGS[method],
      ...cfg,
      series_decision_mode: seriesMode,
      game_count: inferredGames,
      ...(method === AdvancementMethod.ROUND_ROBIN
        ? { games_per_match: inferredGames }
        : {}),
      ...scoring,
    };
    // Clear derived max_games before sync so it cannot override the series length.
    if (method === AdvancementMethod.ROUND_ROBIN) {
      delete copy.max_games;
      copy.game_count = inferredGames;
    }
    syncRoundScoringFields(copy);
    setLocal(copy);
  }, [isOpen, draft]);

  if (!local) return null;

  const method = (String(local.competition_method) as AdvancementMethod) || AdvancementMethod.ELIMINATOR;
  const methodConfig = (local.competition_method_config as Record<string, unknown>) || {};
  const scoring = pickRoundGameScoring(methodConfig);
  const draftRoundId = Number(local.id);
  const allowStandingsSeeding = allowsStandingsBasedSeeding({
    hasIncomingFeeder:
      roundHasIncomingFeeder(
        Number.isFinite(draftRoundId) && draftRoundId > 0 ? draftRoundId : null,
        relationships
      ) || roundRefHasIncomingFeeder(String(local.ref ?? ''), relationships),
  });
  const eliminatorLabel = getCompetitionMethodDisplayLabel(AdvancementMethod.ELIMINATOR, {
    roundRef: String(local.ref ?? ''),
    relationships,
  });
  const usesSeriesDecision =
    method === AdvancementMethod.STEPLADDER ||
    method === AdvancementMethod.BRACKET ||
    method === AdvancementMethod.PODS ||
    method === AdvancementMethod.ROUND_ROBIN;
  const usesExplicitGameCount =
    method === AdvancementMethod.ELIMINATOR || usesSeriesDecision;
  const seriesDecisionMode = String(
    methodConfig.series_decision_mode ||
      (method === AdvancementMethod.ROUND_ROBIN ? 'games_total' : 'race_to_wins')
  );
  const isGamesTotal = seriesDecisionMode === 'games_total';
  const dylgGameCountRaw = Number(
    local.game_count ?? methodConfig.game_count ?? methodConfig.games_per_match ?? 1
  );
  const dylgGameCount =
    Number.isFinite(dylgGameCountRaw) && dylgGameCountRaw >= 1
      ? Math.floor(dylgGameCountRaw)
      : 1;
  const dylgMaxDrop = Math.max(1, dylgGameCount - 1);

  const clampPositiveInt = (raw: unknown, fallback = 1): number => {
    const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
  };

  const applyGameCount = (raw: string, sync: boolean) => {
    setLocal((prev) => {
      if (!prev) return prev;
      const methodNow = String(prev.competition_method || '') as AdvancementMethod;
      if (raw.trim() === '') {
        const cfg = {
          ...((prev.competition_method_config as Record<string, unknown>) || {}),
        };
        delete cfg.game_count;
        if (methodNow === AdvancementMethod.ROUND_ROBIN) {
          delete cfg.games_per_match;
        }
        return {
          ...prev,
          game_count: '',
          competition_method_config: cfg,
        };
      }
      const parsed = parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return prev;
      const cfgPatch: Record<string, unknown> = { game_count: parsed };
      if (methodNow === AdvancementMethod.ROUND_ROBIN) {
        cfgPatch.games_per_match = parsed;
      }
      const next = {
        ...prev,
        game_count: parsed,
        max_games: parsed,
        competition_method_config: {
          ...((prev.competition_method_config as Record<string, unknown>) || {}),
          ...cfgPatch,
        },
      };
      if (sync) syncRoundScoringFields(next);
      return next;
    });
  };

  const commitGameCount = () => {
    setLocal((prev) => {
      if (!prev) return prev;
      const methodNow = String(prev.competition_method || '') as AdvancementMethod;
      const cfg = (prev.competition_method_config as Record<string, unknown>) || {};
      const g = clampPositiveInt(
        methodNow === AdvancementMethod.ROUND_ROBIN
          ? prev.game_count ?? cfg.games_per_match ?? cfg.game_count
          : prev.game_count ?? cfg.game_count,
        1
      );
      const cfgPatch: Record<string, unknown> = { ...cfg, game_count: g };
      if (methodNow === AdvancementMethod.ROUND_ROBIN) {
        cfgPatch.games_per_match = g;
      }
      const next = {
        ...prev,
        game_count: g,
        // Drop stale derived max so sync cannot re-inflate from it.
        max_games: g,
        competition_method_config: cfgPatch,
      };
      syncRoundScoringFields(next);
      return next;
    });
  };

  const updateMethodConfig = (patch: Record<string, unknown>) => {
    setLocal((prev) => {
      if (!prev) return prev;
      const prevCfg = (prev.competition_method_config as Record<string, unknown>) || {};
      return {
        ...prev,
        competition_method_config: { ...prevCfg, ...patch },
      };
    });
  };

  const setGameStyle = (game_style: RoundGameStyle) => {
    const prevCfg = (local?.competition_method_config as Record<string, unknown>) || {};
    const prev = pickRoundGameScoring({ ...prevCfg, game_style });
    updateMethodConfig({
      game_style,
      ...(prev.dylg_enabled
        ? { dylg_scope: prev.dylg_scope, dylg_drop_count: prev.dylg_drop_count }
        : {}),
    });
  };

  const handleSave = () => {
    const games = usesExplicitGameCount
      ? clampPositiveInt(
          local.game_count ?? methodConfig.game_count ?? methodConfig.games_per_match,
          1
        )
      : clampPositiveInt(
          methodConfig.game_count ?? methodConfig.games_per_match ?? local.game_count,
          1
        );
    let nextConfig: Record<string, unknown> = {
      ...methodConfig,
      game_count: games,
      ...pickRoundGameScoring({ ...methodConfig, game_count: games }),
    };
    if (usesSeriesDecision) {
      nextConfig.series_decision_mode = isGamesTotal ? 'games_total' : 'race_to_wins';
      if (!isGamesTotal) {
        nextConfig.race_to_wins = clampPositiveInt(
          methodConfig.race_to_wins ?? local.race_to_wins,
          2
        );
      }
      if (method === AdvancementMethod.ROUND_ROBIN) {
        nextConfig.games_per_match = games;
      }
    }
    nextConfig = stripDylgUnlessEliminator(method, nextConfig);
    const nextRound = {
      ...local,
      game_count: games,
      competition_method_config: nextConfig,
    };
    if (usesSeriesDecision && !isGamesTotal) {
      nextRound.race_to_wins = nextConfig.race_to_wins;
    }
    nextRound.competition_method_config = nextConfig;
    syncRoundScoringFields(nextRound);
    onSave(nextRound);
    onClose();
  };

  const selectCls =
    'mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm min-w-0 max-w-full';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        title ??
        (isNew ? 'Add round (template)' : 'Edit round (template)')
      }
      size="large"
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            {!isNew && onDelete && (
              <Button type="button" variant="danger" onClick={onDelete}>
                Remove round
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="lightbackground" onClick={onClose} disabled={saveDisabled}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="darkbackground"
              onClick={handleSave}
              disabled={saveDisabled}
            >
              {saveLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Input
          label="Name"
          value={String(local.friendly_name ?? '')}
          onChange={(e) => setLocal({ ...local, friendly_name: e.target.value })}
          fullWidth
        />

        {usesExplicitGameCount && (
          <Input
            label={
              usesSeriesDecision
                ? isGamesTotal
                  ? 'Games per match (total pinfall)'
                  : 'Max games per match (best of / race-to)'
                : 'Games in this round'
            }
            type="number"
            min={1}
            value={
              local.game_count === '' || local.game_count == null
                ? ''
                : String(local.game_count)
            }
            onChange={(e) => applyGameCount(e.target.value, false)}
            onBlur={commitGameCount}
            fullWidth
            data-guide-id="guide-format-round-games"
          />
        )}

        {usesSeriesDecision && (
          <div className="space-y-3">
            <div>
              <Label>Match decision</Label>
              <p className="text-xs text-text-muted mb-1">
                {method === AdvancementMethod.STEPLADDER
                  ? 'Classic stepladder opens with the lowest seeds (e.g. 5 vs 4), winners climb to seed 1. Choose how each ladder match is decided.'
                  : method === AdvancementMethod.ROUND_ROBIN
                    ? 'Usually one game per matchup. You can also use a multi-game series (fixed total or best-of) for each pairing.'
                    : 'Choose how each head-to-head match is decided for this format.'}
              </p>
              <select
                className={selectCls}
                value={seriesDecisionMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  setLocal((prev) => {
                    if (!prev) return prev;
                    const next = {
                      ...prev,
                      competition_method_config: {
                        ...((prev.competition_method_config as Record<string, unknown>) || {}),
                        series_decision_mode: mode,
                      },
                    };
                    syncRoundScoringFields(next);
                    return next;
                  });
                }}
              >
                <option value="games_total">Fixed games — winner by total pinfall</option>
                <option value="race_to_wins">Best of / race to wins</option>
              </select>
            </div>
            {!isGamesTotal && (
              <Input
                label="Race to wins"
                type="number"
                min={1}
                value={
                  methodConfig.race_to_wins === '' || methodConfig.race_to_wins == null
                    ? local.race_to_wins == null
                      ? ''
                      : String(local.race_to_wins)
                    : String(methodConfig.race_to_wins)
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  setLocal((prev) => {
                    if (!prev) return prev;
                    const cfg = {
                      ...((prev.competition_method_config as Record<string, unknown>) || {}),
                    };
                    if (raw.trim() === '') {
                      delete cfg.race_to_wins;
                      return {
                        ...prev,
                        race_to_wins: '',
                        competition_method_config: cfg,
                      };
                    }
                    const parsed = parseInt(raw, 10);
                    if (!Number.isFinite(parsed)) return prev;
                    return {
                      ...prev,
                      race_to_wins: parsed,
                      competition_method_config: { ...cfg, race_to_wins: parsed },
                    };
                  });
                }}
                onBlur={() => {
                  setLocal((prev) => {
                    if (!prev) return prev;
                    const cfg = (prev.competition_method_config as Record<string, unknown>) || {};
                    const r = clampPositiveInt(
                      prev.race_to_wins ?? cfg.race_to_wins,
                      2
                    );
                    const next = {
                      ...prev,
                      race_to_wins: r,
                      competition_method_config: { ...cfg, race_to_wins: r },
                    };
                    syncRoundScoringFields(next);
                    return next;
                  });
                }}
                fullWidth
              />
            )}
          </div>
        )}

        <div>
          <Label>Competition format</Label>
          <p className="text-xs text-text-muted mb-1">
            Choose the stage format. Carry-over seeding is configured on flow arrows.
          </p>
          <select
            className={selectCls}
            value={method}
            data-guide-id="guide-format-round-method"
            onChange={(e) => {
              const m = e.target.value as AdvancementMethod;
              const g = Math.max(
                1,
                Number(
                  (local.competition_method_config as Record<string, unknown>)?.game_count ??
                    local.game_count ??
                    1
                )
              );
              const preserved = pickRoundGameScoring(
                (local.competition_method_config as Record<string, unknown>) || {}
              );
              const scoringForMethod =
                m === AdvancementMethod.ELIMINATOR
                  ? preserved
                  : {
                      game_style: preserved.game_style,
                      dylg_enabled: false,
                      dylg_scope: null,
                      dylg_drop_count: null,
                    };
              const next = {
                ...local,
                competition_method: m,
                competition_method_config: stripDylgUnlessEliminator(m, {
                  ...DEFAULT_COMPETITION_METHOD_CONFIGS[m],
                  game_count: g,
                  ...scoringForMethod,
                }),
              };
              syncRoundScoringFields(next);
              setLocal(next);
            }}
          >
            <option value={AdvancementMethod.ELIMINATOR}>{eliminatorLabel}</option>
            <option value={AdvancementMethod.BRACKET}>Bracket</option>
            <option value={AdvancementMethod.STEPLADDER}>Stepladder</option>
            <option value={AdvancementMethod.ROUND_ROBIN}>Round robin</option>
            <option value={AdvancementMethod.PODS}>Pods</option>
          </select>
        </div>

        <div>
          <Label>Game style</Label>
          <p className="text-xs text-text-muted mb-1">
            How games are bowled in this round. Independent of competition format (e.g. Baker
            round robin).
          </p>
          <select
            className={selectCls}
            value={scoring.game_style}
            onChange={(e) => setGameStyle(e.target.value as RoundGameStyle)}
          >
            <option value="standard">Standard</option>
            <option value="baker">Baker</option>
          </select>
        </div>

        {method === AdvancementMethod.ELIMINATOR && (
          <DylgRoundConfigSection
            scoring={scoring}
            dylgGameCount={dylgGameCount}
            dylgMaxDrop={dylgMaxDrop}
            isTeamEvent={isTeamEvent}
            selectCls={selectCls}
            updateMethodConfig={updateMethodConfig}
          />
        )}

        {!usesExplicitGameCount && (
          <p className="text-xs text-text-muted">
            Game count is inferred for this format from its method settings.
          </p>
        )}

        {method === AdvancementMethod.BRACKET && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Bracket mode</Label>
                <select
                  className={selectCls}
                  value={String(methodConfig.bracket_mode ?? 'single_elimination')}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'single_elimination') {
                      updateMethodConfig({ bracket_mode: v, grand_final_reset: false });
                    } else {
                      updateMethodConfig({ bracket_mode: v });
                    }
                  }}
                >
                  <option value="single_elimination">Single elimination</option>
                  <option value="double_elimination">Double elimination</option>
                </select>
              </div>
              <div>
                <Label>Seeding</Label>
                <select
                  className={selectCls}
                  value={String(
                    coerceBracketSeedModeForOpening(
                      (methodConfig.seed_mode as 'by_seed' | 'random' | 'manual') || 'by_seed',
                      allowStandingsSeeding
                    )
                  )}
                  onChange={(e) =>
                    updateMethodConfig({
                      seed_mode: coerceBracketSeedModeForOpening(
                        e.target.value as 'by_seed' | 'random' | 'manual',
                        allowStandingsSeeding
                      ),
                    })
                  }
                >
                  {allowStandingsSeeding ? (
                    <option value="by_seed">By seed (traditional chart)</option>
                  ) : null}
                  <option value="random">Randomized</option>
                  <option value="manual">Manual (shells only)</option>
                </select>
                {!allowStandingsSeeding ? (
                  <p className="mt-1 text-xs text-text-muted">
                    First format (no feeder): standings-based seeding is disabled.
                  </p>
                ) : null}
              </div>
            </div>
            {String(methodConfig.bracket_mode ?? 'single_elimination') === 'double_elimination' && (
              <div>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(methodConfig.grand_final_reset)}
                    onChange={(e) =>
                      updateMethodConfig({ grand_final_reset: e.target.checked ? true : false })
                    }
                  />
                  <span>
                    <span className="font-medium">Grand final reset</span>
                    <span className="block text-xs text-text-muted">
                      If the losers-bracket champion wins the first grand final, add one bracket reset
                      match (same WB and LB feeders) before the bracket is decided.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {method === AdvancementMethod.ROUND_ROBIN && (
          <div className="space-y-3">
            {!hideRoundRobinSchedule && (
              <RoundRobinScheduleSettings
                methodConfig={methodConfig}
                onChange={(patch) => updateMethodConfig(patch)}
              />
            )}
            <div>
              <Label>Bonus pins (optional)</Label>
              <p className="text-xs text-text-muted mb-2">
                Awarded per completed head-to-head match. Use with flow-arrow criteria “Total
                Pinfall with Bonus Pins”.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input
                  label="Win"
                  type="number"
                  min={0}
                  value={String(
                    (methodConfig.bonus_pins as { win?: number } | undefined)?.win ?? 0
                  )}
                  onChange={(e) => {
                    const win = Math.max(0, parseInt(e.target.value, 10) || 0);
                    const prev =
                      (methodConfig.bonus_pins as {
                        win?: number;
                        tie?: number;
                        loss?: number;
                      } | null) || {};
                    updateMethodConfig({
                      bonus_pins: {
                        win,
                        tie: Number(prev.tie ?? 0),
                        loss: Number(prev.loss ?? 0),
                      },
                    });
                  }}
                  fullWidth
                />
                <Input
                  label="Tie"
                  type="number"
                  min={0}
                  value={String(
                    (methodConfig.bonus_pins as { tie?: number } | undefined)?.tie ?? 0
                  )}
                  onChange={(e) => {
                    const tie = Math.max(0, parseInt(e.target.value, 10) || 0);
                    const prev =
                      (methodConfig.bonus_pins as {
                        win?: number;
                        tie?: number;
                        loss?: number;
                      } | null) || {};
                    updateMethodConfig({
                      bonus_pins: {
                        win: Number(prev.win ?? 0),
                        tie,
                        loss: Number(prev.loss ?? 0),
                      },
                    });
                  }}
                  fullWidth
                />
                <Input
                  label="Loss"
                  type="number"
                  min={0}
                  value={String(
                    (methodConfig.bonus_pins as { loss?: number } | undefined)?.loss ?? 0
                  )}
                  onChange={(e) => {
                    const loss = Math.max(0, parseInt(e.target.value, 10) || 0);
                    const prev =
                      (methodConfig.bonus_pins as {
                        win?: number;
                        tie?: number;
                        loss?: number;
                      } | null) || {};
                    updateMethodConfig({
                      bonus_pins: {
                        win: Number(prev.win ?? 0),
                        tie: Number(prev.tie ?? 0),
                        loss,
                      },
                    });
                  }}
                  fullWidth
                />
              </div>
            </div>
          </div>
        )}

        {method === AdvancementMethod.PODS && (
          <PodsSizeAdvanceSettings
            draft={podsConfigFromRound(methodConfig)}
            allowStandingsBasedSeeding={allowStandingsSeeding}
            onChange={(patch) => {
              const current = podsConfigFromRound(methodConfig);
              const merged = {
                ...current,
                ...patch,
                balance_mode: coercePodsBalanceModeForOpening(
                  patch.balance_mode ?? current.balance_mode,
                  allowStandingsSeeding
                ),
              };
              updateMethodConfig(podsConfigToPatch(merged, methodConfig));
            }}
          />
        )}
      </div>
    </Modal>
  );
};

export default TemplateRoundEditorModal;
