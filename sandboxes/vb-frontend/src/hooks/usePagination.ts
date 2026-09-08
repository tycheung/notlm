import { useState, useCallback, useEffect } from 'react';

type PaginationParams = {
  skip: number;
  limit: number;
};

type UsePaginationProps = {
  initialPage?: number;
  initialLimit?: number;
  totalItems?: number;
};

export const usePagination = ({
  initialPage = 1,
  initialLimit = 10,
  totalItems = 0
}: UsePaginationProps = {}) => {
  const [page, setPage] = useState<number>(initialPage);
  const [limit, setLimit] = useState<number>(initialLimit);
  const [total, setTotal] = useState<number>(totalItems);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(total / limit));
  
  // Calculate skip value for API calls
  const skip = (page - 1) * limit;
  
  // Ensure page is within valid range when total changes
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  
  // Get pagination parameters for API requests
  const getPaginationParams = useCallback((): PaginationParams => ({
    skip,
    limit
  }), [skip, limit]);
  
  // Go to a specific page
  const goToPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
    }
  }, [totalPages]);
  
  // Go to next page
  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }, [page, totalPages]);
  
  // Go to previous page
  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);
  
  // Go to first page
  const firstPage = useCallback(() => {
    setPage(1);
  }, []);
  
  // Go to last page
  const lastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages]);
  
  // Change items per page
  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    // Reset to first page when changing limit to avoid empty pages
    setPage(1);
  }, []);
  
  // Update total items count
  const updateTotal = useCallback((count: number) => {
    setTotal(count);
  }, []);
  
  // Check if a specific page is active
  const isPageActive = useCallback((pageNumber: number) => {
    return pageNumber === page;
  }, [page]);
  
  // Generate an array of page numbers for pagination UI
  const getPageNumbers = useCallback((maxButtons: number = 7) => {
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Always include first and last page
    const firstPageNumber = 1;
    const lastPageNumber = totalPages;
    
    // Calculate how many buttons to show around current page
    const buttonsAroundCurrent = maxButtons - 2; // minus first and last
    const buttonsOnEachSide = Math.floor(buttonsAroundCurrent / 2);
    
    // Calculate start and end of page numbers
    let startPage = Math.max(firstPageNumber + 1, page - buttonsOnEachSide);
    let endPage = Math.min(lastPageNumber - 1, startPage + buttonsAroundCurrent - 1);
    
    // Adjust if we're close to the end
    if (endPage - startPage < buttonsAroundCurrent - 1) {
      startPage = Math.max(firstPageNumber + 1, lastPageNumber - buttonsAroundCurrent);
    }
    
    // Generate the array of page numbers
    const pageNumbers = [firstPageNumber];
    
    // Add ellipsis after first page if needed
    if (startPage > firstPageNumber + 1) {
      pageNumbers.push(-1); // -1 represents ellipsis
    }
    
    // Add page numbers around current page
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (endPage < lastPageNumber - 1) {
      pageNumbers.push(-1); // -1 represents ellipsis
    }
    
    // Add last page if not already included
    if (endPage < lastPageNumber) {
      pageNumbers.push(lastPageNumber);
    }
    
    return pageNumbers;
  }, [page, totalPages]);
  
  return {
    page,
    limit,
    total,
    totalPages,
    skip,
    getPaginationParams,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changeLimit,
    updateTotal,
    isPageActive,
    getPageNumbers,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};