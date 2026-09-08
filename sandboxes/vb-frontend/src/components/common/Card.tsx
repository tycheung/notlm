import React from 'react';
import { cardOuterBase, cardVariantDefault } from './cardSurface';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  variant?: 'default' | 'outlined' | 'filled';
  titleColor?: string;
  subtitleColor?: string;
  headerBorderColor?: string;
  footerBorderColor?: string;
  footerBgColor?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  footer,
  className = '',
  hoverable = false,
  variant = 'default',
  titleColor = 'text-text', // default text color
  subtitleColor = 'text-text-muted',
  headerBorderColor = 'border-border',
  footerBorderColor = 'border-border',
  footerBgColor = 'bg-surface'
}) => {
  // Variant styles — no horizontal margin (was mx-[14px] vs EditableCard full width)
  const variantStyles = {
    default: cardVariantDefault,
    outlined: 'bg-transparent border-2 border-primary',
    filled: 'bg-surface-light border border-border/50'
  };
  
  // Hover effect
  const hoverStyles = hoverable 
    ? 'transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md' 
    : '';
  
  return (
    <div 
      className={`${cardOuterBase} ${variantStyles[variant]} ${hoverStyles} ${className}`}
    >
      {(title || subtitle) && (
        <div className={`px-3 sm:px-[14px] py-3 border-b ${headerBorderColor} flex justify-between items-center`}>
          {title && (
            <h3 className={`text-sm sm:text-base font-bold ${titleColor}`}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={`text-xs sm:text-sm ${subtitleColor}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className="px-3 sm:px-[14px] py-3 sm:py-4">
        {children}
      </div>
      
      {footer && (
        <div className={`px-3 sm:px-[14px] py-3 ${footerBgColor} border-t ${footerBorderColor}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
