import React from 'react';

interface CloseButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

const CloseButton: React.FC<CloseButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  'aria-label': ariaLabel = 'Close modal'
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-transparent border-0 p-1 text-text-dim hover:text-text-muted focus:outline-none focus:text-text-muted hover:bg-transparent focus:bg-transparent transition-colors duration-150 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      aria-label={ariaLabel}
      type="button"
      style={{ background: 'transparent', border: 'none' }}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
};

export default CloseButton; 