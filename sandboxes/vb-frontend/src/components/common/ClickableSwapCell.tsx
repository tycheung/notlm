import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

interface ClickableSwapCellProps {
  value: string | boolean;
  pendingValue?: string | boolean;
  onChange: (value: string | boolean) => void;
  options: Array<{ key: string | boolean; label: string; icon?: React.ReactNode }>;
  className?: string;
  /** Tighter layout: no "Click to cycle" hint, less padding (e.g. table status column). */
  compact?: boolean;
  /** Overrides native tooltip (e.g. explain multi-step cycles). */
  title?: string;
}

const ClickableSwapCell: React.FC<ClickableSwapCellProps> = ({
  value,
  pendingValue,
  onChange,
  options,
  className = '',
  compact = false,
  title: titleProp
}) => {
  const currentValue = pendingValue !== undefined ? pendingValue : value;
  const hasChanges = pendingValue !== undefined && pendingValue !== value;

  const handleClick = () => {
    const currentIndex = options.findIndex(option => option.key === currentValue);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextOption = options[nextIndex];
    onChange(nextOption.key);
  };

  const currentOption = options.find(option => option.key === currentValue) || options[0];

  const getDefaultIcon = (key: string | boolean) => {
    if (typeof key === 'boolean') {
      return key ? (
        <CheckCircleIcon className="w-4 h-4 text-green-600" />
      ) : (
        <RadioButtonUncheckedIcon className="w-4 h-4 text-text-dim" />
      );
    }
    
    // For string keys, provide default icons for common status values
    switch (key) {
      case 'approved':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'withdrawn':
        return <CancelIcon className="w-4 h-4 text-gray-500" />;
      case 'pending':
        return <PendingIcon className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`group relative cursor-pointer hover:bg-surface-light rounded flex ${
        compact
          ? 'items-center px-1.5 py-0.5 min-h-[2.25rem] gap-1.5'
          : 'items-center px-2 py-1 min-h-[2rem] gap-2'
      } ${className} ${hasChanges ? 'bg-pending/15 border border-yellow-200' : ''}`}
      onClick={handleClick}
      title={titleProp ?? 'Click to cycle through options'}
    >
      <span className="inline-flex shrink-0 items-center justify-center">
        {currentOption.icon || getDefaultIcon(currentValue)}
      </span>
      <span
        className={`text-sm ${
          compact ? 'min-w-0 flex-1 whitespace-normal break-words leading-snug' : 'flex-1 whitespace-nowrap'
        } ${hasChanges ? 'font-medium text-yellow-800' : 'text-text'}`}
      >
        {currentOption.label}
      </span>
      {!compact && (
        <span className="text-xs text-text-dim opacity-0 group-hover:opacity-100 transition-opacity">
          Click to cycle
        </span>
      )}
    </div>
  );
};

export default ClickableSwapCell; 