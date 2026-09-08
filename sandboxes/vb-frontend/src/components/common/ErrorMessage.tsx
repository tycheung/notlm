import React, { useState, useEffect } from 'react';
import CloseButton from './CloseButton';

type ErrorSeverity = 'error' | 'warning' | 'critical';

interface ErrorMessageProps {
  /** The error message to display */
  message: string | React.ReactNode;
  /** Optional title for the error */
  title?: string;
  /** Severity level affects styling */
  severity?: ErrorSeverity;
  /** Whether the error can be dismissed by the user */
  isDismissible?: boolean;
  /** Callback when error is dismissed */
  onDismiss?: () => void;
  /** Auto-dismiss after specified milliseconds (0 = no auto-dismiss) */
  autoHideAfter?: number;
  /** Additional CSS classes */
  className?: string;
  /** Custom icon to override default */
  icon?: React.ReactNode;
  /** Show as modal/popup instead of inline */
  isModal?: boolean;
  /** Action button (e.g., retry, contact support) */
  action?: React.ReactNode;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title,
  severity = 'error',
  isDismissible = true,
  onDismiss,
  autoHideAfter = 0,
  className = '',
  icon,
  isModal = false,
  action,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide functionality
  useEffect(() => {
    if (autoHideAfter > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideAfter);

      return () => clearTimeout(timer);
    }
  }, [autoHideAfter]);

  // Handle dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  // Don't render if dismissed
  if (!isVisible) return null;

  // Severity-based styling using mobile-app color palette
  const severityStyles = {
    error: {
      container: 'bg-danger/10 border-danger',
      titleText: 'text-danger',
      messageText: 'text-danger',
      icon: 'text-danger',
      modalOverlay: 'bg-black/70',
    },
    warning: {
      container: 'bg-pending/10 border-pending',
      titleText: 'text-pending',
      messageText: 'text-pending',
      icon: 'text-pending',
      modalOverlay: 'bg-black/70',
    },
    critical: {
      container: 'bg-danger-dark border-danger',
      titleText: 'text-white',
      messageText: 'text-white',
      icon: 'text-white',
      modalOverlay: 'bg-black/80',
    },
  };

  // Default icons for each severity
  const defaultIcons = {
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    critical: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  };

  // Selected styles
  const selectedStyles = severityStyles[severity];
  const selectedIcon = icon || defaultIcons[severity];

  // Error content component
  const ErrorContent = () => (
    <div className={`rounded-lg border-2 p-4 shadow-lg ${selectedStyles.container} ${className}`} role="alert">
      <div className="flex">
        {/* Icon */}
        {selectedIcon && (
          <div className={`flex-shrink-0 mr-3 ${selectedStyles.icon}`}>
            {selectedIcon}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-base sm:text-lg font-bold mb-2 ${selectedStyles.titleText}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm sm:text-base leading-relaxed ${selectedStyles.messageText}`}>
            {message}
          </div>
          
          {/* Action */}
          {action && (
            <div className="mt-4">{action}</div>
          )}
        </div>
        
        {/* Dismiss button */}
        {isDismissible && (
          <div className="ml-auto pl-3 flex-shrink-0">
            <CloseButton
              onClick={handleDismiss}
              aria-label="Dismiss error"
            />
          </div>
        )}
      </div>
    </div>
  );

  // Modal wrapper for popup display
  if (isModal) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${selectedStyles.modalOverlay}`}>
        <div className="max-w-md w-full animate-in fade-in-0 zoom-in-95 duration-200">
          <ErrorContent />
        </div>
      </div>
    );
  }

  // Inline display
  return <ErrorContent />;
};

export default ErrorMessage; 