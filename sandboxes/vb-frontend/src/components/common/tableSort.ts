export type SortDirection = 'asc' | 'desc';

export interface SortState<TColumn extends string> {
  column: TColumn;
  direction: SortDirection;
}

export const toggleSortDirection = (
  currentDirection: SortDirection,
  isActiveColumn: boolean
): SortDirection => {
  if (!isActiveColumn) return 'asc';
  return currentDirection === 'asc' ? 'desc' : 'asc';
};

