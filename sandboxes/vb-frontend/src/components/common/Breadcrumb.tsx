import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const location = useLocation();
  
  // Helper to ensure paths don't include query parameters
  const getCleanPath = (path: string | undefined): string => {
    if (!path) return '';
    // Remove any query parameters that might be in the path string
    return path.split('?')[0];
  };
  
  return (
    <nav aria-label="Breadcrumb" className={`mb-4 ${className}`}>
      <ol className="flex items-center flex-wrap text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const cleanPath = item.path ? getCleanPath(item.path) : undefined;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mx-2 text-primary" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              
              {cleanPath && !isLast ? (
                <Link 
                  to={cleanPath}
                  className="text-primary hover:text-primary-light hover:underline transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-primary font-bold italic" : "text-primary"}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb; 
