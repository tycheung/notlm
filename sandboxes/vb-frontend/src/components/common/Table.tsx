import React from 'react';

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((data: T) => React.ReactNode);
  className?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: (item: T, index: number) => string | undefined;
  onRowClick?: (item: T) => void;
}

function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No data available',
  striped = true,
  hoverable = true,
  bordered = true,
  compact = false,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  rowClassName,
  onRowClick,
}: TableProps<T>) {
  const tableStyles = `min-w-full divide-y divide-border ${bordered ? 'border border-border rounded-lg' : ''} ${className}`;
  
  const headerStyles = `bg-primary text-text ${headerClassName}`;
  
  const getRowStyles = (item: T, index: number) => {
    const baseStyles = [
      onRowClick ? 'cursor-pointer' : '',
      hoverable ? 'hover:bg-surface-light' : '',
      striped && index % 2 === 0 ? 'bg-surface' : 'bg-surface-light',
      rowClassName?.(item, index) || '',
    ].filter(Boolean).join(' ');
    
    return baseStyles;
  };
  
  const cellPadding = compact ? 'px-4 py-2' : 'px-6 py-4';

  const safeToString = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      
      if (value.toString && value.toString !== Object.prototype.toString) {
        return value.toString();
      }
      
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[Object]';
      }
    }
    
    return String(value);
  };

  if (isLoading) {
    return (
      <div className={`overflow-hidden shadow-sm ${tableStyles}`}>
        <table className="min-w-full divide-y divide-border">
          <thead className={headerStyles}>
            <tr>
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  scope="col" 
                  className={`${cellPadding} text-left font-semibold ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {Array(3).fill(0).map((_, index) => (
              <tr key={index}>
                {columns.map((_, colIndex) => (
                  <td key={colIndex} className={cellPadding}>
                    <div className="h-4 bg-border rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`overflow-hidden shadow-sm ${tableStyles}`}>
        <table className="min-w-full divide-y divide-border">
          <thead className={headerStyles}>
            <tr>
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  scope="col" 
                  className={`${cellPadding} text-left font-semibold ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td 
                colSpan={columns.length} 
                className="px-6 py-8 text-center text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto shadow-sm ${tableStyles}`}>
      <table className="min-w-full divide-y divide-border">
        <thead className={headerStyles}>
          <tr>
            {columns.map((column, index) => (
              <th 
                key={index} 
                scope="col" 
                className={`${cellPadding} text-left font-semibold ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`bg-surface divide-y divide-border ${bodyClassName}`}>
          {data.map((item, index) => (
            <tr 
              key={keyExtractor(item)} 
              className={getRowStyles(item, index)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {columns.map((column, colIndex) => {
                const value = typeof column.accessor === 'function' 
                  ? column.accessor(item) 
                  : item[column.accessor];
                
                if (React.isValidElement(value)) {
                  return (
                    <td 
                      key={colIndex} 
                      className={`${cellPadding} whitespace-nowrap text-sm text-text ${column.className || ''}`}
                    >
                      {value}
                    </td>
                  );
                }
                
                const cellContent = column.render 
                  ? column.render(value, item)
                  : safeToString(value);
                  
                return (
                  <td 
                    key={colIndex} 
                    className={`${cellPadding} whitespace-nowrap text-sm text-text ${column.className || ''}`}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
