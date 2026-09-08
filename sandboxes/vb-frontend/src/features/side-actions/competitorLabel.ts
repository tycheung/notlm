/** Desk/print column label for who enters a pot. */
export function competitorColumnLabel(
  entryUnit?: string | null
): 'Team' | 'Bowler' {
  return entryUnit === 'team' ? 'Team' : 'Bowler';
}

export function entryUnitFromTypeConfig(
  typeConfig?: Record<string, unknown> | null
): 'bowler' | 'team' {
  return typeConfig?.entry_unit === 'team' ? 'team' : 'bowler';
}
