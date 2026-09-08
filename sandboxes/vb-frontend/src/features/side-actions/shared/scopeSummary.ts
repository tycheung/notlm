import type { SideAction } from '@/types/side_action';

export function formatPoolScopeSummary(sideAction: SideAction): string {
  const poolNames = sideAction.pools
    .filter((pool) => pool.is_enabled)
    .map((pool) => pool.squad_name);
  const label =
    sideAction.squad_scope_mode === 'all' ? 'All squads' : 'Selected squads';
  const scope = `${label} · ${
    poolNames.length ? poolNames.join(', ') : 'No enabled pools'
  }`;
  const customized = sideAction.pools
    .filter(
      (pool) =>
        pool.is_enabled && Object.keys(pool.override_config ?? {}).length > 0
    )
    .map((pool) => {
      const details = [
        pool.override_config.game_numbers?.length
          ? `games ${pool.override_config.game_numbers.join(', ')}`
          : null,
        typeof pool.override_config.entry_fee === 'number'
          ? `$${pool.override_config.entry_fee.toFixed(2)} entry`
          : null,
      ].filter(Boolean);
      return `${pool.squad_name}${details.length ? ` (${details.join('; ')})` : ''}`;
    });
  return customized.length
    ? `${scope} · Overrides: ${customized.join(', ')}`
    : scope;
}
