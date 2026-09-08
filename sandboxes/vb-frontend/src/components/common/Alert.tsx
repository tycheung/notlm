import React, { useState } from 'react';
import CloseButton from './CloseButton';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string | React.ReactNode;
  isDismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  isDismissible = true,
  onDismiss,
  className = '',
  icon,
  action,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Handle dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  // Don't render if dismissed
  if (!isVisible) return null;

  // Variant styles — dark surfaces + palette accent borders (Victory tokens)
  const variantStyles = {
    info: {
      container: 'bg-surface-light border border-border border-l-4 border-l-accent text-text',
      icon: 'text-accent',
    },
    success: {
      container: 'bg-surface-light border border-border border-l-4 border-l-success text-text',
      icon: 'text-success',
    },
    warning: {
      container: 'bg-surface-light border border-border border-l-4 border-l-pending text-text',
      icon: 'text-pending',
    },
    error: {
      container: 'bg-surface-light border border-border border-l-4 border-l-danger text-text',
      icon: 'text-danger',
    },
  };

  // Default icons
  const defaultIcons = {
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  // Selected styles
  const selectedStyles = variantStyles[variant];
  const selectedIcon = icon || defaultIcons[variant];

  return (
    <div className={`rounded-md border p-4 ${selectedStyles.container} ${className}`} role="alert">
      <div className="flex">
        {/* Icon */}
        {selectedIcon && (
          <div className={`flex-shrink-0 mr-3 ${selectedStyles.icon}`}>
            {selectedIcon}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <div className="text-sm">{message}</div>
          
          {/* Action */}
          {action && (
            <div className="mt-3">{action}</div>
          )}
        </div>
        
        {/* Dismiss button */}
        {isDismissible && (
          <div className="ml-auto pl-3">
            <CloseButton
              onClick={handleDismiss}
              aria-label="Dismiss"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
