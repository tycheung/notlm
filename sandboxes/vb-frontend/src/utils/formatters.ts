import { formatDateNaive } from './dateUtils';
/**
 * Format a number as currency with dollar sign
 * @param value The value to format
 * @param options Intl.NumberFormat options
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(value);
};

/**
 * Format a date as a string
 * @param date The date to format
 * @param options Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  if (typeof date === 'string') {
    return formatDateNaive(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }).format(date);
};

/**
 * Format a number with commas as thousands separators
 * @param value The number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
}; 