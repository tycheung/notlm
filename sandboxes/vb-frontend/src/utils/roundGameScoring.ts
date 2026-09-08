export type RoundGameStyle = 'standard' | 'baker';
export type RoundDylgScope = 'individual' | 'team';

export type RoundGameScoringFields = {
  game_style: RoundGameStyle;
  dylg_enabled: boolean;
  dylg_scope: RoundDylgScope | null;
  dylg_drop_count: number | null;
};

function clampDropCount(raw: unknown, gameCount: number): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  const drop = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  if (gameCount > 1) return Math.min(drop, gameCount - 1);
  return 1;
}

/** Fields preserved when switching competition format in the round editor. */
export function pickRoundGameScoring(
  cfg: Record<string, unknown> | null | undefined
): RoundGameScoringFields {
  const style = String(cfg?.game_style ?? 'standard').toLowerCase();
  const game_style: RoundGameStyle = style === 'baker' ? 'baker' : 'standard';
  const dylg_enabled = Boolean(cfg?.dylg_enabled);
  if (!dylg_enabled) {
    return { game_style, dylg_enabled: false, dylg_scope: null, dylg_drop_count: null };
  }
  const gameCountRaw = Number(cfg?.game_count ?? 0);
  const gameCount = Number.isFinite(gameCountRaw) ? Math.floor(gameCountRaw) : 0;
  const dylg_drop_count = clampDropCount(cfg?.dylg_drop_count, gameCount);
  if (game_style === 'baker') {
    return { game_style, dylg_enabled: true, dylg_scope: 'team', dylg_drop_count };
  }
  const scopeRaw = String(cfg?.dylg_scope ?? '').toLowerCase();
  const dylg_scope: RoundDylgScope = scopeRaw === 'team' ? 'team' : 'individual';
  return { game_style, dylg_enabled: true, dylg_scope, dylg_drop_count };
}

/** Strip DYLG keys unless this is a qualifying (eliminator) round. */
export function stripDylgUnlessEliminator(
  method: string | undefined,
  cfg: Record<string, unknown>
): Record<string, unknown> {
  if (String(method || '').toLowerCase() === 'eliminator') {
    return cfg;
  }
  const next = { ...cfg };
  delete next.dylg_enabled;
  delete next.dylg_scope;
  delete next.dylg_drop_count;
  return next;
}

/** Display label for game_style. */
export function gameStyleDisplayLabel(
  cfg: Record<string, unknown> | null | undefined
): string {
  return pickRoundGameScoring(cfg).game_style === 'baker' ? 'Baker' : 'Standard';
}

/** True when any event round uses Baker team scoring. */
export function eventHasBakerRounds(
  rounds:
    | Array<{ competition_method_config?: Record<string, unknown> | null }>
    | null
    | undefined
): boolean {
  return (rounds ?? []).some(
    (round) =>
      pickRoundGameScoring(round.competition_method_config ?? undefined).game_style ===
      'baker'
  );
}
