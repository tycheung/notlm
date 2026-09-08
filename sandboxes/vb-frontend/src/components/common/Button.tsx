import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'lightbackground' | 'darkbackground' | 'icon';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}) => {
  // Base styles - matching mobile-app S.btn
  const baseStyles = 'font-semibold rounded-btn transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 cursor-pointer';
  
  // Size styles - responsive font sizes for web-friendly scaling
  const sizeStyles = {
    small: 'py-[5px] px-[10px] text-xs sm:text-sm rounded-btn-sm', // Responsive: 12px mobile, 14px desktop
    medium: 'py-2 sm:py-[10px] px-4 sm:px-[18px] text-sm sm:text-base', // Responsive: 14px mobile, 16px desktop
    large: 'py-3 px-6 text-base sm:text-lg', // Responsive: 16px mobile, 18px desktop
  };
  
  // Variant styles - matching mobile-app color palette (C object)
  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-light focus:ring-primary border-none', // S.btn
    secondary: 'bg-surface-light text-text border border-border hover:bg-surface focus:ring-border', // S.btnSec
    outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary/10 focus:ring-primary',
    danger: 'bg-danger-dark text-white hover:bg-danger focus:ring-danger border-none rounded-btn-sm', // S.btnDanger
    success: 'bg-success text-white hover:bg-success/90 focus:ring-success',
    lightbackground: 'bg-surface-light text-text border border-border hover:bg-surface focus:ring-border', // S.btnSec variant
    darkbackground: 'bg-primary text-white hover:bg-primary-light focus:ring-primary border-none', // S.btn variant
    icon: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-light focus:ring-border', // Icon buttons
  };
  
  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // Disabled styles - matching mobile-app (opacity: 0.5)
  const disabledStyles = disabled || isLoading ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyles} ${disabledStyles} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
