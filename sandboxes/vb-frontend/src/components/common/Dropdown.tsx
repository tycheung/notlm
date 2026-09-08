import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  id: string | number;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  trigger: React.ReactNode;
  label?: string;
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  width?: 'auto' | 'fit' | 'full';
  className?: string;
  itemClassName?: string;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  items,
  onSelect,
  trigger,
  label,
  placement = 'bottom-left',
  width = 'auto',
  className = '',
  itemClassName = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Handle item click
  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      onSelect(item);
      setIsOpen(false);
    }
  };

  // Placement styles
  const placementStyles = {
    'bottom-left': 'top-full left-0',
    'bottom-right': 'top-full right-0',
    'top-left': 'bottom-full left-0',
    'top-right': 'bottom-full right-0',
  };

  // Width styles
  const widthStyles = {
    auto: 'w-auto',
    fit: 'w-auto min-w-full',
    full: 'w-64',
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block mb-2 text-sm font-medium text-primary">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <div onClick={toggleDropdown} className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
        {trigger}
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className={`absolute z-10 mt-1 ${placementStyles[placement]} ${widthStyles[width]} bg-surface rounded-md shadow-lg border border-border focus:outline-none`}
        >
          <div className="py-1 max-h-60 overflow-auto" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {items.map((item) => (
              <div
                key={item.id}
                className={`
                  px-4 py-2 text-sm text-text hover:bg-surface-light hover:text-text flex items-center
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${itemClassName}
                `}
                onClick={() => !item.disabled && handleItemClick(item)}
                role="menuitem"
              >
                {item.icon && (
                  <span className="mr-2">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
