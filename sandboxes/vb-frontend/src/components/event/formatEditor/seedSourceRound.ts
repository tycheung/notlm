import type { RoundRead } from '../../../types/round';

export type SeedSourceMode = 'feeder' | 'round' | 'all_rounds';

export type SeedSourceConfig = {
  seed_source_mode?: SeedSourceMode | null;
  seed_source_round_id?: number | null;
};

/** Null / invalid round id. */
export function normalizeSeedSourceRoundId(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const MODES: SeedSourceMode[] = ['feeder', 'round', 'all_rounds'];

/** Legacy: round id without mode → specific round. */
export function normalizeSeedSourceMode(
  rawMode: unknown,
  roundId: unknown
): SeedSourceMode {
  const mode = String(rawMode ?? '').trim().toLowerCase();
  if (MODES.includes(mode as SeedSourceMode)) {
    return mode as SeedSourceMode;
  }
  if (normalizeSeedSourceRoundId(roundId) != null) {
    return 'round';
  }
  return 'feeder';
}

export function seedSourceFromConfig(cfg: Record<string, unknown>): SeedSourceConfig {
  const seed_source_mode = normalizeSeedSourceMode(
    cfg.seed_source_mode,
    cfg.seed_source_round_id
  );
  const seed_source_round_id =
    seed_source_mode === 'round'
      ? normalizeSeedSourceRoundId(cfg.seed_source_round_id)
      : null;
  return { seed_source_mode, seed_source_round_id };
}

export function seedSourceToPatch(
  draft: SeedSourceConfig,
  prevCfg: Record<string, unknown>
): Record<string, unknown> {
  const mode = normalizeSeedSourceMode(draft.seed_source_mode, draft.seed_source_round_id);
  if (mode === 'feeder') {
    return {
      ...prevCfg,
      seed_source_mode: 'feeder',
      seed_source_round_id: null,
    };
  }
  if (mode === 'all_rounds') {
    return {
      ...prevCfg,
      seed_source_mode: 'all_rounds',
      seed_source_round_id: null,
    };
  }
  return {
    ...prevCfg,
    seed_source_mode: 'round',
    seed_source_round_id: normalizeSeedSourceRoundId(draft.seed_source_round_id),
  };
}

export function roundSeedSourceLabel(round: RoundRead): string {
  const name = String(round.friendly_name || '').trim();
  const num = Number(round.round_number) || 0;
  const prefix = num > 0 ? `Round ${num}` : `Round ${round.id}`;
  return name ? `${prefix} · ${name}` : prefix;
}

export function ancestorRoundsForSeeding(
  rounds: RoundRead[] | undefined,
  currentRoundId: number
): RoundRead[] {
  return [...(rounds || [])]
    .filter((row) => Number(row.id) !== Number(currentRoundId))
    .sort((a, b) => {
      const an = Number(a.round_number) || 0;
      const bn = Number(b.round_number) || 0;
      if (an !== bn) return an - bn;
      return Number(a.id) - Number(b.id);
    });
}

export const SEED_SOURCE_MODE_OPTIONS: Array<{
  value: SeedSourceMode;
  label: string;
  hint: string;
}> = [
  {
    value: 'feeder',
    label: 'Incoming feeder (prior round)',
    hint: 'Seed 1 is the top finisher from the round that fed this stage (default).',
  },
  {
    value: 'round',
    label: 'Specific earlier round',
    hint: 'Re-seed advancers by totals from one chosen round (e.g. original qualifying).',
  },
  {
    value: 'all_rounds',
    label: 'All rounds (event total)',
    hint: 'Sum every scored game in the event to rank seed 1…N among advancers.',
  },
];
