import type { SideAction } from '../types/side_action';

export function formatEliminatorCurrentlyAliveCell(
  sideAction: Pick<
    SideAction,
    | 'eliminator_currently_alive'
    | 'eliminator_is_complete'
    | 'eliminator_cash_spots'
    | 'current_entries'
  >
): string {
  if (sideAction.eliminator_is_complete) {
    const spots =
      sideAction.eliminator_cash_spots != null &&
      Number.isFinite(sideAction.eliminator_cash_spots)
        ? Math.max(0, Math.trunc(sideAction.eliminator_cash_spots))
        : 0;
    return `Completed (${spots})`;
  }

  const alive =
    sideAction.eliminator_currently_alive != null &&
    Number.isFinite(sideAction.eliminator_currently_alive)
      ? Math.max(0, Math.trunc(sideAction.eliminator_currently_alive))
      : Math.max(0, Math.trunc(Number(sideAction.current_entries ?? 0)));

  return String(alive);
}
