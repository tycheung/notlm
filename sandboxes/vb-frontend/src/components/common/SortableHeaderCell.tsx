import React from 'react';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { SortDirection } from './tableSort';

interface SortableHeaderCellProps<TColumn extends string> {
  label: string;
  columnKey: TColumn;
  activeColumn: TColumn;
  direction: SortDirection;
  onToggle: (column: TColumn) => void;
  disabled?: boolean;
  className?: string;
}

const SortableHeaderCell = <TColumn extends string>({
  label,
  columnKey,
  activeColumn,
  direction,
  onToggle,
  disabled = false,
  className = '',
}: SortableHeaderCellProps<TColumn>) => {
  const isActive = activeColumn === columnKey;

  return (
    <button
      type="button"
      onClick={() => onToggle(columnKey)}
      disabled={disabled}
      className={`inline-flex items-center gap-1 text-left uppercase tracking-wider disabled:opacity-70 ${className}`}
    >
      <span>{label}</span>
      {isActive ? (
        direction === 'asc' ? (
          <ArrowUpwardIcon className="w-3.5 h-3.5" />
        ) : (
          <ArrowDownwardIcon className="w-3.5 h-3.5" />
        )
      ) : (
        <UnfoldMoreIcon className="w-3.5 h-3.5 opacity-70" />
      )}
    </button>
  );
};

export default SortableHeaderCell;

