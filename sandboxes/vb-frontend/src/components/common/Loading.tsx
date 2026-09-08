import React from 'react';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'circle' | 'dots' | 'spinner';
  color?: 'primary' | 'secondary' | 'white' | 'black';
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  variant = 'circle',
  color = 'primary',
  fullScreen = false,
  message,
  className = '',
}) => {
  // Size values in pixels
  const sizeValues = {
    small: {
      container: 'w-5 h-5',
      text: 'text-xs',
    },
    medium: {
      container: 'w-8 h-8',
      text: 'text-sm',
    },
    large: {
      container: 'w-12 h-12',
      text: 'text-base',
    },
  };

  // Color values
  const colorValues = {
    primary: 'text-primary',
    secondary: 'text-accent',
    white: 'text-white',
    black: 'text-text',
  };

  // Selected styles
  const selectedSize = sizeValues[size];
  const selectedColor = colorValues[color];

  // Full screen overlay
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="flex flex-col items-center space-y-4 p-6 bg-surface border border-border rounded-lg shadow-xl">
          <LoadingIndicator 
            variant={variant} 
            size={size}
            color={color} 
            className={className}
          />
          {message && (
            <p className={`${selectedSize.text} font-medium ${selectedColor}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Inline loading
  return (
    <div className={`flex items-center ${className}`}>
      <LoadingIndicator 
        variant={variant} 
        size={size}
        color={color} 
      />
      {message && (
        <p className={`ml-3 ${selectedSize.text} font-medium ${selectedColor}`}>
          {message}
        </p>
      )}
    </div>
  );
};

// Internal component to render different loading indicators
interface LoadingIndicatorProps {
  variant: 'circle' | 'dots' | 'spinner';
  size: 'small' | 'medium' | 'large';
  color: 'primary' | 'secondary' | 'white' | 'black';
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  variant,
  size,
  color,
  className = '',
}) => {
  // Size values
  const sizeValues = {
    small: 'w-5 h-5',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  // Color values
  const colorValues = {
    primary: 'text-primary',
    secondary: 'text-accent',
    white: 'text-white',
    black: 'text-text',
  };

  // Selected styles
  const selectedSize = sizeValues[size];
  const selectedColor = colorValues[color];

  // Spinner variant
  if (variant === 'spinner') {
    return (
      <div className={`${selectedSize} ${selectedColor} ${className}`}>
        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      </div>
    );
  }

  // Dots variant
  if (variant === 'dots') {
    const dotSizes = {
      small: 'w-1.5 h-1.5',
      medium: 'w-2 h-2',
      large: 'w-3 h-3',
    };

    return (
      <div className={`flex space-x-2 ${className}`}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${dotSizes[size]} ${selectedColor} rounded-full animate-pulse`}
            style={{ animationDelay: `${i * 0.2}s` }}
          ></div>
        ))}
      </div>
    );
  }

  // Default circle variant
  return (
    <div className={`${selectedSize} ${selectedColor} ${className}`}>
      <svg 
        className="animate-spin" 
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
    </div>
  );
};

export default Loading;
