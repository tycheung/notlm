import React from 'react';

export type PageTitleSize = 'default' | 'responsive' | 'large' | 'hero';

export interface PageTitleProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
  size?: PageTitleSize;
  id?: string;
}

const sizeClasses: Record<PageTitleSize, string> = {
  default: 'text-2xl font-bold text-primary',
  responsive: 'text-2xl sm:text-3xl font-bold text-primary',
  large: 'text-3xl font-bold text-primary',
  hero: 'text-3xl sm:text-4xl font-bold text-primary',
};

/**
 * Primary page/screen title — matches Admin Dashboard (`text-2xl font-bold text-primary`).
 */
const PageTitle: React.FC<PageTitleProps> = ({
  children,
  as: Component = 'h1',
  className = '',
  size = 'default',
  id,
}) => {
  return (
    <Component id={id} className={`${sizeClasses[size]} ${className}`.trim()}>
      {children}
    </Component>
  );
};

export default PageTitle;
