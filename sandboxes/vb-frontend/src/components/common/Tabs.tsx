import React, { useId, useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
  /** Optional spotlight / guide target */
  guideId?: string;
}

export interface TabsProps {
  activeTab: string;
  tabs: TabItem[];
  onTabChange: (tabId: string) => void;
  variant?: 'underline' | 'pills' | 'rounded';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
  idPrefix?: string;
  panelId?: string;
}

const Tabs: React.FC<TabsProps> = ({ 
  activeTab, 
  tabs, 
  onTabChange, 
  variant = 'underline',
  size = 'md',
  className = '',
  ariaLabel = 'Tabs',
  idPrefix,
  panelId,
}) => {
  const generatedId = useId().replace(/:/g, '');
  const tabsId = idPrefix ?? `tabs-${generatedId}`;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveFocus = (currentIndex: number, direction: 1 | -1) => {
    for (let offset = 1; offset <= tabs.length; offset += 1) {
      const nextIndex = (currentIndex + direction * offset + tabs.length) % tabs.length;
      if (!tabs[nextIndex].disabled) {
        tabRefs.current[nextIndex]?.focus();
        onTabChange(tabs[nextIndex].id);
        return;
      }
    }
  };

  const getBaseClasses = () => {
    const sizes = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    };
    
    return `font-medium transition-colors ${sizes[size]}`;
  };

  const getUnderlineSpacing = () => {
    const paddings = {
      sm: 'py-2 px-2.5',
      md: 'py-3 px-4',
      lg: 'py-3 px-5',
    };
    return paddings[size];
  };

  const getVariantClasses = (tab: TabItem, isActive: boolean) => {
    const baseClasses = getBaseClasses();
    
    switch (variant) {
      case 'underline':
        return `${baseClasses} ${
          isActive
            ? 'border-primary text-primary border-b-2 font-bold italic'
            : 'border-transparent text-text-muted hover:text-text-muted hover:border-primary border-b-2 font-bold'
        } whitespace-nowrap ${getUnderlineSpacing()}`;
        
      case 'pills':
        return `${baseClasses} ${
          isActive
            ? 'bg-primary text-white font-bold italic'
            : 'text-primary hover:bg-surface-light hover:text-primary-light font-bold'
        } px-6 py-2 rounded-full`;
        
      case 'rounded':
        return `${baseClasses} ${
          isActive
            ? 'bg-surface text-primary border-t border-l border-r border-border font-bold italic'
            : 'text-text-muted hover:text-primary-light hover:bg-surface-light font-bold'
        } px-6 py-2 rounded-t-lg`;
        
      default:
        return baseClasses;
    }
  };

  const getContainerClasses = () => {
    switch (variant) {
      case 'underline':
        return 'border-b border-border mb-6';
      case 'pills':
        return 'bg-surface-light p-1 rounded-full inline-flex space-x-1 mb-6';
      case 'rounded':
        return 'mb-6';
      default:
        return 'mb-6';
    }
  };

  const getNavClasses = () => {
    switch (variant) {
      case 'underline': {
        const gaps = {
          sm: 'space-x-2',
          md: 'space-x-4',
          lg: 'space-x-5',
        };
        return `-mb-px flex ${gaps[size]} overflow-x-auto`;
      }
      case 'pills':
        return 'flex space-x-1';
      case 'rounded':
        return 'flex space-x-1';
      default:
        return 'flex space-x-4';
    }
  };

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      <div className={getNavClasses()} role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={`${tabsId}-tab-${tab.id}`}
              type="button"
              role="tab"
              className={`${getVariantClasses(tab, isActive)} ${
                tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  moveFocus(index, 1);
                } else if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  moveFocus(index, -1);
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  const first = tabs.findIndex((item) => !item.disabled);
                  if (first >= 0) {
                    tabRefs.current[first]?.focus();
                    onTabChange(tabs[first].id);
                  }
                } else if (event.key === 'End') {
                  event.preventDefault();
                  let last = -1;
                  tabs.forEach((item, itemIndex) => {
                    if (!item.disabled) last = itemIndex;
                  });
                  if (last >= 0) {
                    tabRefs.current[last]?.focus();
                    onTabChange(tabs[last].id);
                  }
                }
              }}
              disabled={tab.disabled}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              data-guide-id={tab.guideId}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs; 