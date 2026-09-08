import React from 'react';

type SpinnerSize = 'small' | 'medium' | 'large';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`inline-block ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin`}></div>
    </div>
  );
};

export default Spinner; 
