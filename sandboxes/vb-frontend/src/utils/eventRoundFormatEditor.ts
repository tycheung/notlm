import type { RoundRead, RoundUpdate } from '../../types/round';
import type { AdvancementMethod } from '../../types/roundRelationship';
import { syncRoundScoringFields } from './eventStructurePayloadFlow';
import { stripDylgUnlessEliminator } from './roundGameScoring';

/** Map a live event round into the shared round editor draft shape. */
export function roundReadToEditorDraft(round: RoundRead): Record<string, unknown> {
  return {
    id: round.id,
    ref: `round-${round.id}`,
    round_number: round.round_number,
    friendly_name: round.friendly_name ?? '',
    game_count: round.game_count,
    number_of_squads: round.number_of_squads,
    notes: round.notes ?? '',
    allows_reentry: round.allows_reentry,
    max_reentries: round.max_reentries ?? null,
    reentry_fee: round.reentry_fee ?? null,
    competition_method: round.competition_method,
    competition_method_config: round.competition_method_config
      ? { ...(round.competition_method_config as Record<string, unknown>) }
      : {},
  };
}

/** Fields the shared editor may write back via PATCH /rounds/{id}. */
export function editorDraftToRoundUpdate(draft: Record<string, unknown>): RoundUpdate {
  // Normalize series_decision_mode / race / max into competition_method_config (BE SSOT).
  const next: Record<string, unknown> = {
    ...draft,
    competition_method_config: {
      ...((draft.competition_method_config as Record<string, unknown> | undefined) || {}),
    },
  };
  syncRoundScoringFields(next);
  const cfg = {
    ...((next.competition_method_config as Record<string, unknown> | undefined) || {}),
  };
  if (next.max_games != null && Number.isFinite(Number(next.max_games))) {
    cfg.max_games = Math.max(1, Math.floor(Number(next.max_games)));
  }
  if (next.race_to_wins != null && Number.isFinite(Number(next.race_to_wins))) {
    cfg.race_to_wins = Math.max(1, Math.floor(Number(next.race_to_wins)));
  }

  const method = next.competition_method as AdvancementMethod | undefined;
  const stripped = stripDylgUnlessEliminator(method, cfg);
  const gameCountRaw = next.game_count;
  const game_count =
    typeof gameCountRaw === 'number' && Number.isFinite(gameCountRaw) && gameCountRaw >= 1
      ? Math.floor(gameCountRaw)
      : undefined;

  return {
    friendly_name:
      next.friendly_name === '' || next.friendly_name == null
        ? null
        : String(next.friendly_name),
    game_count,
    number_of_squads:
      next.number_of_squads != null && Number.isFinite(Number(next.number_of_squads))
        ? Math.max(1, Math.floor(Number(next.number_of_squads)))
        : undefined,
    notes: next.notes == null || next.notes === '' ? null : String(next.notes),
    allows_reentry: Boolean(next.allows_reentry),
    max_reentries:
      next.max_reentries == null || next.max_reentries === ''
        ? null
        : Number(next.max_reentries),
    reentry_fee:
      next.reentry_fee == null || next.reentry_fee === ''
        ? null
        : Number(next.reentry_fee),
    competition_method: method,
    competition_method_config: stripped,
  };
}
