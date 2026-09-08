import React from 'react';

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  id?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ 
  children, 
  className = '',
  size = 'medium',
  as: Component = 'h3',
  id
}) => {
  const sizeStyles = {
    small: 'text-base sm:text-lg', // 16px mobile, 18px desktop
    medium: 'text-lg sm:text-xl', // 18px mobile, 20px desktop
    large: 'text-xl sm:text-2xl' // 20px mobile, 24px desktop
  };

  return (
    <Component 
      id={id}
      className={`font-bold text-text ${sizeStyles[size]} tracking-[0.05em] ${className}`}
    >
      {children}
    </Component>
  );
};

export default SectionTitle; 