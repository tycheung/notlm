import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  siblingCount?: number;
  className?: string;
  variant?: 'default' | 'simple' | 'compact';
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  siblingCount = 1,
  className = '',
  variant = 'default',
}) => {
  // Don't render if only one page
  if (totalPages <= 1) return null;

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  // Calculate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pageNumbers: (number | 'ellipsis')[] = [];
    
    // Always include first page
    pageNumbers.push(1);
    
    // Calculate bounds for main pagination display
    const leftBound = Math.max(2, currentPage - siblingCount);
    const rightBound = Math.min(totalPages - 1, currentPage + siblingCount);
    
    // Add ellipsis on the left if needed
    if (leftBound > 2) {
      pageNumbers.push('ellipsis');
    }
    
    // Add page numbers in range
    for (let i = leftBound; i <= rightBound; i++) {
      pageNumbers.push(i);
    }
    
    // Add ellipsis on the right if needed
    if (rightBound < totalPages - 1) {
      pageNumbers.push('ellipsis');
    }
    
    // Always include last page if more than 1 page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  // Simple variant
  if (variant === 'simple') {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <button
          className={`px-3 py-1 rounded-md border border-border ${
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed bg-surface-light text-text-dim'
              : 'hover:bg-surface-light text-text'
          }`}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        
        <span className="text-sm text-text">
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          className={`px-3 py-1 rounded-md border border-border ${
            currentPage === totalPages
              ? 'opacity-50 cursor-not-allowed bg-surface-light text-text-dim'
              : 'hover:bg-surface-light text-text'
          }`}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          className={`p-1 rounded-md ${
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed text-text-dim'
              : 'text-primary hover:bg-surface-light'
          }`}
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M7.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L3.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        <button
          className={`p-1 rounded-md ${
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed text-text-dim'
              : 'text-primary hover:bg-surface-light'
          }`}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        <span className="text-sm font-medium text-text">
          {currentPage} / {totalPages}
        </span>
        
        <button
          className={`p-1 rounded-md ${
            currentPage === totalPages
              ? 'opacity-50 cursor-not-allowed text-text-dim'
              : 'text-primary hover:bg-surface-light'
          }`}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        <button
          className={`p-1 rounded-md ${
            currentPage === totalPages
              ? 'opacity-50 cursor-not-allowed text-text-dim'
              : 'text-primary hover:bg-surface-light'
          }`}
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 6.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M12.293 15.707a1 1 0 010-1.414L16.586 10l-4.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  }

  // Default variant
  return (
    <nav className={`flex items-center justify-center ${className}`} aria-label="Pagination">
      <ul className="flex items-center space-x-1">
        {/* First page button */}
        {showFirstLast && (
          <li>
            <button
              className={`p-2 rounded-md ${
                currentPage === 1
                  ? 'opacity-50 cursor-not-allowed bg-surface-light text-text-dim'
                  : 'hover:bg-surface-light text-primary'
              }`}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              aria-label="First page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M7.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L3.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </li>
        )}
        
        {/* Previous page button */}
        {showPrevNext && (
          <li>
            <button
              className={`p-2 rounded-md ${
                currentPage === 1
                  ? 'opacity-50 cursor-not-allowed bg-surface-light text-text-dim'
                  : 'hover:bg-surface-light text-primary'
              }`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </li>
        )}
        
        {/* Page numbers */}
        {getPageNumbers().map((pageNumber, index) => (
          <li key={index}>
            {pageNumber === 'ellipsis' ? (
              <span className="px-3 py-2 text-text-muted">...</span>
            ) : (
              <button
                className={`px-3 py-2 rounded-md ${
                  pageNumber === currentPage
                    ? 'bg-primary text-text font-medium'
                    : 'text-text hover:bg-surface-light'
                }`}
                onClick={() => handlePageChange(pageNumber)}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            )}
          </li>
        ))}
        
        {/* Next page button */}
        {showPrevNext && (
          <li>
            <button
              className={`p-2 rounded-md ${
                currentPage === totalPages
                  ? 'opacity-50 cursor-not-allowed bg-surface-light text-text-dim'
                  : 'hover:bg-surface-light text-primary'
              }`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </li>
        )}
        
        {/* Last page button */}
        {showFirstLast && (
          <li>
            <button
              className={`p-2 rounded-md ${
                currentPage === totalPages
                  ? 'opacity-50 cursor-not-allowed bg-surface-light text-text-dim'
                  : 'hover:bg-surface-light text-primary'
              }`}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Last page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 6.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M12.293 15.707a1 1 0 010-1.414L16.586 10l-4.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Pagination;
