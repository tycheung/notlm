import type { SideAction, SideActionPool } from '@/types/side_action';

export const VARIES_BY_SQUAD = 'Varies by squad';

type EffectivePool = {
  pool: SideActionPool;
  games: number[];
  entryFee: number;
  typeConfig: Record<string, unknown>;
  prizeDistribution: Record<string, number>;
};

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value && typeof value === 'object') {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b)
        )
      )
    );
  }
  return String(value);
}

function commonLabel<T>(
  pools: EffectivePool[],
  select: (pool: EffectivePool) => T,
  format: (value: T) => string
): string {
  if (pools.length === 0) return '—';
  const values = pools.map(select);
  return values.every((value) => stableValue(value) === stableValue(values[0]))
    ? format(values[0])
    : VARIES_BY_SQUAD;
}

export function getEffectivePools(sideAction: SideAction): EffectivePool[] {
  return sideAction.pools
    .filter((pool) => pool.is_enabled)
    .map((pool) => ({
      pool,
      games: pool.game_numbers,
      entryFee: pool.entry_fee,
      typeConfig: {
        ...(sideAction.type_config ?? {}),
        ...((pool.override_config?.type_config as Record<string, unknown> | undefined) ?? {}),
      },
      prizeDistribution:
        pool.override_config?.prize_distribution ?? sideAction.prize_distribution ?? {},
    }));
}

export function effectiveGamesLabel(sideAction: SideAction): string {
  return commonLabel(
    getEffectivePools(sideAction),
    (pool) => pool.games,
    (games) => (games.length === 1 ? `Game ${games[0]}` : `Games ${games.join(', ')}`)
  );
}

export function effectiveEntryFeeLabel(sideAction: SideAction): string {
  return commonLabel(
    getEffectivePools(sideAction),
    (pool) => pool.entryFee,
    (fee) => `$${fee.toFixed(2)}`
  );
}

export function effectiveConfigLabel(
  sideAction: SideAction,
  select: (config: Record<string, unknown>) => string
): string {
  return commonLabel(
    getEffectivePools(sideAction),
    (pool) => select(pool.typeConfig),
    (label) => label
  );
}

export function effectivePrizeDistribution(
  sideAction: SideAction,
  poolId: number
): Record<string, number> {
  return (
    getEffectivePools(sideAction).find(({ pool }) => pool.id === poolId)
      ?.prizeDistribution ?? sideAction.prize_distribution ?? {}
  );
}

export function effectiveByePrizeDistribution(
  sideAction: SideAction,
  poolId: number
): Record<string, number> {
  const effective = getEffectivePools(sideAction).find(({ pool }) => pool.id === poolId);
  const overrideTypeConfig = effective?.pool.override_config?.type_config as
    | Record<string, unknown>
    | undefined;
  return (
    (overrideTypeConfig?.bye_prize_distribution as Record<string, number> | undefined) ??
    (effective?.typeConfig.bye_prize_distribution as Record<string, number> | undefined) ??
    effective?.prizeDistribution ??
    sideAction.prize_distribution ??
    {}
  );
}
