import { formatDateNaive, formatDateTimeNaive } from './dateUtils';
/**
 * Utility functions for formatting data for display
 */

/**
 * Format a number as currency (USD)
 * @param value The number to format
 * @param showCents Whether to show cents (defaults to true)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number | undefined, showCents = true): string => {
  if (value === undefined) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(value);
};

/**
 * Format a date to a readable string
 * @param date The date to format
 * @param includeTime Whether to include the time
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date | undefined, includeTime = false): string => {
  if (!date) return '';
  if (typeof date === 'string') {
    return includeTime ? formatDateTimeNaive(date) : formatDateNaive(date);
  }
  const options: Intl.DateTimeFormatOptions = includeTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Format a number with comma separators
 * @param value The number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number | undefined): string => {
  if (value === undefined) return '0';
  
  return new Intl.NumberFormat('en-US').format(value);
};

/**
 * Format a percentage
 * @param value The decimal value (0-1) to format as percentage
 * @param decimals Number of decimal places to show
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number | undefined, decimals = 0): string => {
  if (value === undefined) return '0%';
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
