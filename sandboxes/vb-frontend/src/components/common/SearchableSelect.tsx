import React, { useState, useRef, useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import Input from './Input';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAddNew?: () => void;
  name: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  label?: string;
  showAddNew?: boolean;
  addNewText?: string;
  /** Placeholder for the dropdown filter field (styled like `TableSearchInput`). */
  searchInputPlaceholder?: string;
  /** Optional guide spotlight / field-flash target on the closed control. */
  'data-guide-id'?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  onAddNew,
  name,
  id,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  error,
  className = '',
  label,
  showAddNew = false,
  addNewText = '➕ Add New',
  searchInputPlaceholder = 'Search...',
  'data-guide-id': dataGuideId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get the selected option's label
  const selectedOption = options.find(opt => opt.value.toString() === value.toString());
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      default:
        break;
    }
  };

  // Handle option selection
  const handleOptionSelect = (option: SelectOption) => {
    // Create a synthetic event to match the onChange handler signature
    const syntheticEvent = {
      target: {
        name,
        value: option.value
      }
    } as React.ChangeEvent<HTMLSelectElement>;
    
    onChange(syntheticEvent);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Handle add new option
  const handleAddNew = () => {
    if (onAddNew) {
      setIsOpen(false);
      setSearchTerm('');
      onAddNew();
    }
  };

  // Handle toggling the dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setHighlightedIndex(0);
      setSearchTerm('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef} data-guide-id={dataGuideId}>
      {label && (
        <label 
          htmlFor={id || name} 
          className="block text-sm font-medium text-text mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Hidden native select for form submission */}
      <select
        name={name}
        id={id || name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="hidden"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Custom select UI */}
      <div
        className={`flex items-center relative w-full border rounded-md shadow-sm px-3 py-2 bg-surface-light text-text text-left cursor-default
          ${error ? 'border-danger' : 'border-border'} 
          ${disabled ? 'bg-surface opacity-50 text-text-dim cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          ${className}`}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        role="combobox"
      >
        <span className="block truncate flex-grow">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="ml-2 pointer-events-none">
          <svg className="h-5 w-5 text-text-dim" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </div>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-surface shadow-lg border border-border">
          {/* Search input */}
          <div className="px-3 py-2 border-b border-border">
            <Input
              ref={searchInputRef}
              type="text"
              omitMargin
              fullWidth
              leftIcon={<SearchIcon className="text-text-muted" fontSize="small" />}
              placeholder={searchInputPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
              aria-label={searchInputPlaceholder}
            />
          </div>
          
          {/* Options list */}
          <ul
            className="max-h-60 overflow-auto py-1"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-text-muted">No options found</li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  className={`px-3 py-2 text-sm cursor-pointer
                    ${index === highlightedIndex ? 'bg-primary text-white' : 'text-text hover:bg-surface-light'}
                    ${option.value === value ? 'font-semibold' : 'font-normal'}`}
                  onClick={() => handleOptionSelect(option)}
                  role="option"
                  aria-selected={option.value === value}
                >
                  {option.label}
                </li>
              ))
            )}
            
            {/* Add new option */}
            {showAddNew && onAddNew && (
              <li
                className="px-3 py-2 text-sm border-t border-border text-success hover:bg-surface-light cursor-pointer font-semibold"
                onClick={handleAddNew}
              >
                {addNewText}
              </li>
            )}
          </ul>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
};

export default SearchableSelect; 
