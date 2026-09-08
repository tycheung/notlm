import React, { useState, useEffect, forwardRef } from 'react';

interface CurrencyInputProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
  onBlur?: () => void;
  onFocus?: () => void;
  'data-testid'?: string;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(({
  value,
  onChange,
  placeholder = "0.00",
  disabled = false,
  className = "",
  min = 0,
  max = 99999.99,
  onBlur,
  onFocus,
  'data-testid': testId,
}, ref) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number to currency display (without $ symbol)
  const formatCurrency = (num: number | null): string => {
    if (num === null || num === undefined) return '';
    return num.toFixed(2);
  };

  // Parse string to number, removing any non-numeric characters except decimal
  const parseValue = (str: string): number | null => {
    if (!str.trim()) return null;
    
    // Remove any non-numeric characters except decimal point
    const cleaned = str.replace(/[^0-9.]/g, '');
    
    // Handle multiple decimal points by keeping only the first one
    const parts = cleaned.split('.');
    const cleanedValue = parts.length > 1 
      ? `${parts[0]}.${parts.slice(1).join('')}` 
      : cleaned;
    
    const num = parseFloat(cleanedValue);
    return isNaN(num) ? null : num;
  };

  // Update display value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatCurrency(value ?? null));
    }
  }, [value, isFocused]);

  // Initialize display value
  useEffect(() => {
    setDisplayValue(formatCurrency(value ?? null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Parse and validate the value
    const numericValue = parseValue(inputValue);
    
    if (numericValue !== null) {
      // Validate range
      if (numericValue < min) {
        onChange(min);
        return;
      }
      if (numericValue > max) {
        onChange(max);
        return;
      }
      
      // Round to 2 decimal places
      const roundedValue = Math.round(numericValue * 100) / 100;
      onChange(roundedValue);
    } else {
      onChange(null);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.();
    
    // Select all text when focused for easy editing
    e.target.select();
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Format the display value when losing focus
    const numericValue = parseValue(displayValue);
    const formattedValue = formatCurrency(numericValue);
    setDisplayValue(formattedValue);
    
    onBlur?.();
  };

  const baseClasses = "w-full px-3 py-2 border rounded-md text-sm transition-colors";
  const stateClasses = disabled 
    ? "bg-surface opacity-50 border-border text-text-dim cursor-not-allowed"
    : "bg-surface-light border-border text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted text-sm pointer-events-none">
        $
      </div>
      <input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseClasses} ${stateClasses} pl-8 ${className}`}
        data-testid={testId}
        inputMode="decimal"
        autoComplete="off"
      />
    </div>
  );
});

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput; 