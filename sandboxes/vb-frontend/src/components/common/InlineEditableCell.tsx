import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CurrencyInput from './CurrencyInput';
import { useScoringTabOrder } from '../../contexts/ScoringTabOrderContext';
import type { TabNavigateDirection } from '../../contexts/ScoringTabOrderContext';
import { getErrorMessage } from '../../api/apiErrors';

export type CellType = 'text' | 'number' | 'currency' | 'average' | 'select';

interface SelectOption {
  value: string | number;
  label: string;
}

interface InlineEditableCellProps {
  value: string | number | null | undefined;
  type: CellType;
  onSave?: (value: string | number | null) => Promise<void>;
  onChange?: (value: string | number | null) => void; // For batch mode
  placeholder?: string;
  disabled?: boolean;
  options?: SelectOption[]; // For select type
  min?: number; // For number/currency/average types
  max?: number; // For number/currency/average types
  className?: string;
  displayFormatter?: (value: string | number | null) => string; // Custom display formatting
  batchMode?: boolean; // New prop for batch editing
  pendingValue?: string | number | null; // Value that's pending confirmation
  /** Stable id for scoring grid Tab order (must match ScoringTabOrderProvider list). */
  scoringTabCellId?: string;
  /** When true with batchMode, Tab / Shift+Tab moves between scoring cells instead of default focus. */
  enableScoringTabNavigation?: boolean;
  /** 'centered-overlay' keeps the value centered; edit icon floats on the right without shifting the number. */
  displayLayout?: 'inline' | 'centered-overlay';
}

const InlineEditableCell: React.FC<InlineEditableCellProps> = ({
  value,
  type,
  onSave,
  onChange,
  placeholder = '',
  disabled = false,
  options = [],
  min,
  max,
  className = '',
  displayFormatter,
  batchMode = false,
  pendingValue,
  scoringTabCellId,
  enableScoringTabNavigation = false,
  displayLayout = 'inline',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | number | null>(pendingValue ?? value ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  /** Skip blur auto-save when Tab already committed and closed this cell. */
  const skipBlurCommitRef = useRef(false);
  /** Tab activate already focused; skip the post-paint focus effect (avoids re-select wiping the first digit). */
  const skipFocusEffectRef = useRef(false);
  const scoringTabCtx = useScoringTabOrder();

  // Reset edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(pendingValue ?? value ?? null);
    }
  }, [value, isEditing, pendingValue]);

  const focusEditInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (el instanceof HTMLInputElement) {
      el.select();
    }
  }, []);

  // Focus input when editing starts via click (Tab path focuses inside activate).
  useLayoutEffect(() => {
    if (!isEditing) return;
    if (skipFocusEffectRef.current) {
      skipFocusEffectRef.current = false;
      return;
    }
    focusEditInput();
  }, [isEditing, focusEditInput]);

  const activateForTab = useCallback(() => {
    // Mount + focus before Tab keydown returns so the next digit is not lost.
    skipFocusEffectRef.current = true;
    flushSync(() => {
      setIsEditing(true);
      setError(null);
    });
    focusEditInput();
  }, [focusEditInput]);

  useEffect(() => {
    if (
      !scoringTabCellId ||
      !enableScoringTabNavigation ||
      !scoringTabCtx ||
      disabled
    ) {
      return;
    }
    scoringTabCtx.registerCell(scoringTabCellId, activateForTab);
    return () => scoringTabCtx.unregisterCell(scoringTabCellId);
  }, [
    scoringTabCellId,
    enableScoringTabNavigation,
    scoringTabCtx,
    disabled,
    activateForTab,
  ]);

  const validateBatchNumberLike = useCallback((): {
    ok: boolean;
    finalValue: string | number | null;
    errorMsg: string | null;
  } => {
    let finalValue: string | number | null = editValue;
    if (type === 'number' || type === 'average') {
      if (editValue === null || editValue === '') {
        finalValue = null;
      } else {
        const numValue = typeof editValue === 'string' ? parseFloat(editValue) : editValue;
        if (isNaN(numValue as number) || numValue === null) {
          return { ok: false, finalValue: null, errorMsg: 'Please enter a valid number' };
        }
        if (min !== undefined && numValue < min) {
          return { ok: false, finalValue: null, errorMsg: `Value must be at least ${min}` };
        }
        if (max !== undefined && numValue > max) {
          return { ok: false, finalValue: null, errorMsg: `Value cannot exceed ${max}` };
        }
        finalValue = numValue;
      }
    }
    if (type === 'average') {
      const numValue = typeof editValue === 'string' ? parseFloat(String(editValue)) : editValue;
      if (numValue !== null && !isNaN(numValue as number) && (numValue < 0 || numValue > 300)) {
        return { ok: false, finalValue: null, errorMsg: 'Average must be between 0 and 300' };
      }
    }
    return { ok: true, finalValue, errorMsg: null };
  }, [editValue, type, min, max]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Validate based on type
      let finalValue: string | number | null = editValue;
      
      if (type === 'number' || type === 'average') {
        if (editValue === null || editValue === '') {
          finalValue = null;
        } else {
          const numValue = typeof editValue === 'string' ? parseFloat(editValue) : editValue;
          if (isNaN(numValue as number) || numValue === null) {
            setError('Please enter a valid number');
            return;
          }
          
          // Check min/max constraints
          if (min !== undefined && numValue < min) {
            setError(`Value must be at least ${min}`);
            return;
          }
          if (max !== undefined && numValue > max) {
            setError(`Value cannot exceed ${max}`);
            return;
          }
          
          finalValue = numValue;
        }
      }
      
      if (type === 'currency') {
        if (editValue !== null && editValue !== '' && typeof editValue === 'number' && editValue < 0) {
          setError('Amount cannot be negative');
          return;
        }
      }
      
      if (type === 'average') {
        const numValue = typeof editValue === 'string' ? parseFloat(editValue) : editValue;
        if (numValue !== null && (numValue < 0 || numValue > 300)) {
          setError('Average must be between 0 and 300');
          return;
        }
      }

      if (batchMode) {
        // In batch mode, just call onChange and close editing
        onChange?.(finalValue);
        setIsEditing(false);
      } else {
        // In immediate mode, call onSave
        await onSave?.(finalValue);
        setIsEditing(false);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(pendingValue ?? value ?? null);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (
        batchMode &&
        enableScoringTabNavigation &&
        scoringTabCellId &&
        scoringTabCtx
      ) {
        e.preventDefault();
        const { ok, finalValue, errorMsg } = validateBatchNumberLike();
        if (!ok) {
          setError(errorMsg);
          return;
        }
        if (finalValue !== (pendingValue ?? value)) {
          onChange?.(finalValue);
        }
        skipBlurCommitRef.current = true;
        flushSync(() => {
          setIsEditing(false);
        });
        const dir: TabNavigateDirection = e.shiftKey ? 'backward' : 'forward';
        scoringTabCtx.navigateFromCell(scoringTabCellId, dir);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }
    if (batchMode) {
      // Auto-save changes on blur if something changed
      if (editValue !== (pendingValue ?? value)) {
        onChange?.(editValue);
      }
      setIsEditing(false);
    }
  };

  const formatDisplayValue = (val: string | number | null): string => {
    if (displayFormatter) {
      return displayFormatter(val);
    }
    
    if (val === null || val === undefined || val === '') {
      return '—';
    }
    
    // For select fields, find the corresponding label from options
    if (type === 'select' && options.length > 0) {
      const option = options.find(opt => opt.value === val);
      return option ? option.label : String(val);
    }
    
    if (type === 'currency') {
      const numVal = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(numVal) ? '—' : `$${numVal.toFixed(2)}`;
    }
    
    if (type === 'average') {
      const numVal = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(numVal) ? '—' : numVal.toFixed(1);
    }
    
    return String(val);
  };

  const renderInput = () => {
    if (type === 'currency') {
      return (
        <CurrencyInput
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={typeof editValue === 'number' ? editValue : (editValue ? parseFloat(String(editValue)) : null)}
          onChange={setEditValue}
          placeholder={placeholder}
          min={min}
          max={max}
          className="text-sm"
          onBlur={handleBlur}
        />
      );
    }
    
    if (type === 'select') {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={String(editValue ?? '')}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full px-2 py-1 text-sm border border-border rounded bg-surface-light text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    
    // For number and average types, use text input with number validation to avoid up/down arrows
    if (type === 'number' || type === 'average') {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          tabIndex={enableScoringTabNavigation ? -1 : undefined}
          value={String(editValue ?? '')}
          onChange={(e) => {
            const value = e.target.value;
            // Allow empty string, numbers, and decimal points
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
              // Check max constraint while typing
              if (value !== '' && max !== undefined) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue > max) {
                  // Don't allow values above max
                  return;
                }
              }
              // Convert empty string to null for proper handling
              setEditValue(value === '' ? null : value);
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full px-2 py-1 text-sm border border-border rounded bg-surface-light text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
    }
    
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={String(editValue ?? '')}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-sm border border-border rounded bg-surface-light text-text focus:outline-none focus:ring-2 focus:ring-primary"
      />
    );
  };

  // Show the pending value or original value
  const displayValue = pendingValue !== undefined ? pendingValue : value;
  const hasChanges = batchMode && pendingValue !== undefined && pendingValue !== value;

  if (!isEditing) {
    const isCenteredOverlay = displayLayout === 'centered-overlay';
    return (
      <div
        className={`group relative cursor-pointer hover:bg-surface-light px-2 py-1 rounded min-h-[2rem] flex items-center ${isCenteredOverlay ? 'justify-center' : ''} ${className} ${hasChanges ? 'bg-pending/10 border border-pending/30' : ''}`}
        onClick={handleEdit}
      >
        <span
          className={`text-sm tabular-nums ${isCenteredOverlay ? 'text-center' : 'flex-1'} ${hasChanges ? 'font-medium text-pending' : 'text-text'}`}
        >
          {formatDisplayValue(displayValue ?? null)}
        </span>
        {!disabled && (
          <EditIcon
            className={`w-4 h-4 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity ${isCenteredOverlay ? 'absolute right-0' : 'ml-2'}`}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1">
        <div className={`flex-1 ${type === 'currency' ? 'min-w-[12ch]' : ''}`}>
          {renderInput()}
        </div>
        {!batchMode && (
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="p-1 text-green-600 hover:text-green-700 hover:bg-success/15 rounded transition-colors disabled:opacity-50"
              title="Save"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="p-1 text-red-600 hover:text-red-700 hover:bg-danger/15 rounded transition-colors disabled:opacity-50"
              title="Cancel"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-danger/15 px-2 py-1 rounded shadow-sm z-10 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
};

export default InlineEditableCell; 