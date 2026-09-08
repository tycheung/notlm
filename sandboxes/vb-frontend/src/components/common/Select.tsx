import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  'data-guide-id'?: string;
}

const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  'data-guide-id': dataGuideId,
}) => {
  const safeOptions = Array.isArray(options) ? options : [];
  // Matching mobile-app S.select
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      data-guide-id={dataGuideId}
      className="block w-full px-3 py-2 sm:py-[9px] bg-surface-light text-text border border-border rounded-input text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary box-border disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {safeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select; 