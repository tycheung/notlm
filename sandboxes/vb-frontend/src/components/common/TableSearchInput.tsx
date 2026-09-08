import React, { useEffect, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import Input from './Input';

interface TableSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  /**
   * Layout classes for the outer wrapper (e.g. `max-w-xl`, `flex-1`).
   * Never put height/margin here on the input — that breaks search-icon alignment.
   */
  className?: string;
  debounceMs?: number;
  /** Default true so toolbar searches sit flush with sibling filters. */
  omitMargin?: boolean;
  autoComplete?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
}

/**
 * Canonical table/list search field: MUI search icon + Input padding contract.
 * Prefer this over a bare `<Input>` for any “search …” control.
 */
const TableSearchInput: React.FC<TableSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search by name, USBC ID, or email',
  label,
  className,
  debounceMs = 0,
  omitMargin = true,
  autoComplete = 'off',
  id,
  name,
  disabled,
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (debounceMs <= 0) return;
    const timeoutId = window.setTimeout(() => {
      onChange(localValue);
    }, debounceMs);
    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, localValue, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    if (debounceMs <= 0) {
      onChange(next);
    }
  };

  return (
    <Input
      id={id}
      name={name}
      label={label}
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      fullWidth
      omitMargin={omitMargin}
      wrapperClassName={className}
      leftIcon={<SearchIcon className="text-text-muted" fontSize="small" />}
      aria-label={label || placeholder}
    />
  );
};

export default TableSearchInput;
