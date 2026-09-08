import React from 'react';

export interface PageSectionHeadingProps {
  children: React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
  id?: string;
}

/**
 * In-page section heading (dashboard cards, lists) — consistent semibold primary.
 */
const PageSectionHeading: React.FC<PageSectionHeadingProps> = ({
  children,
  as: Component = 'h2',
  className = '',
  id,
}) => (
  <Component
    id={id}
    className={`text-xl font-semibold text-primary ${className}`.trim()}
  >
    {children}
  </Component>
);

export default PageSectionHeading;
