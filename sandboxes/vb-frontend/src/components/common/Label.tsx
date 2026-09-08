import React from 'react';

interface LabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

const Label: React.FC<LabelProps> = ({ 
  htmlFor, 
  children, 
  required = false, 
  className = '' 
}) => {
  // Responsive label - scales from mobile to desktop
  return (
    <label 
      htmlFor={htmlFor}
      className={`block mb-1 text-xs sm:text-sm font-semibold text-text-muted uppercase tracking-[0.06em] ${className}`}
    >
      {children}
      {required && <span className="text-danger ml-1">*</span>}
    </label>
  );
};

export default Label; 