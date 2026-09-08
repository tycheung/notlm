import React, { useState, forwardRef, InputHTMLAttributes } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  className?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      leftIcon,
      className = '',
      ...rest
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    // Base input styles - responsive font size for web-friendly scaling
    const baseInputStyles = 
      'px-3 sm:px-3 py-2 sm:py-[9px] bg-surface-light text-text rounded-input border focus:outline-none focus:ring-2 transition-colors duration-200 box-border text-sm sm:text-base';
    
    // Error styles - using mobile-app danger color
    const errorStyles = error 
      ? 'border-danger focus:border-danger focus:ring-danger/50' 
      : 'border-border focus:border-primary focus:ring-primary/50';
    
    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';
    
    // Icon padding
    const leftPadding = leftIcon ? 'pl-10' : '';
    const rightPadding = 'pr-10'; // Always add right padding for the eye icon

    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-field`}>
        {label && (
          <label 
            htmlFor={rest.id} 
            className="block mb-1 text-xs sm:text-sm font-semibold text-text-muted uppercase tracking-[0.06em]"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={`${baseInputStyles} ${errorStyles} ${widthStyles} ${leftPadding} ${rightPadding} ${className}`}
            {...rest}
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="bg-transparent hover:bg-transparent text-text-muted hover:text-text outline-none hover:outline-none focus:outline-none border-none hover:border-none focus:border-none ring-0 hover:ring-0 focus:ring-0 focus:text-text transition-colors duration-200 p-1 rounded"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <VisibilityOffIcon className="w-5 h-5" />
              ) : (
                <VisibilityIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        
        {error && (
          <p className="mt-1 text-xs sm:text-sm text-danger">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="mt-1 text-xs sm:text-sm text-text-dim">{helperText}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput; 