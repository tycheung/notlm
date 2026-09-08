/**
 * Comprehensive date and datetime utilities
 * Handles both timezone-naive formatting and datetime operations
 */

/**
 * Format a datetime string without timezone conversion - treats the datetime as local
 * @param dateTimeString ISO format datetime string (YYYY-MM-DDTHH:mm:ss)
 * @returns Formatted datetime string
 */
export const formatDateTimeNaive = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  
  // Parse the string components directly without timezone conversion
  const dateStr = dateTimeString.slice(0, 19); // Remove any timezone info
  const [datePart, timePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-');
  const [hour, minute] = timePart.split(':');
  
  // Create date object with local timezone (no conversion)
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Full local date/time including seconds (no timezone conversion; uses wall time from ISO prefix).
 * Use for sign-up / audit timestamps when second precision matters.
 */
export const formatDateTimeSecondsNaive = (dateTimeString: string | null | undefined): string => {
  if (!dateTimeString) return '';
  const dateStr = dateTimeString.slice(0, 19);
  const [datePart, timePart] = dateStr.split('T');
  if (!datePart || !timePart) return formatDateNaive(dateTimeString);
  const [year, month, day] = datePart.split('-');
  const timeBits = timePart.split(':');
  const hour = timeBits[0] ?? '0';
  const minute = timeBits[1] ?? '00';
  const second = timeBits[2] ?? '00';
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10)
  );
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

/**
 * Format a date string without timezone conversion - treats the date as local
 * @param dateString ISO format date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
 * @returns Formatted date string
 */
export const formatDateNaive = (dateString: string): string => {
  if (!dateString) return '';
  
  // Parse the string components directly without timezone conversion
  const dateStr = dateString.slice(0, 10); // Get just YYYY-MM-DD part
  const [year, month, day] = dateStr.split('-');
  
  // Create date object with local timezone (no conversion)
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * True when current time is strictly after the event end datetime.
 * Aligns with backend `Event.has_ended` (`now > end_date`).
 */
export const isEventPastEndDate = (endDateIso: string | null | undefined): boolean => {
  if (!endDateIso) return false;
  const t = Date.parse(endDateIso);
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
};

/**
 * Format a date string without timezone conversion - short format
 * @param dateString ISO format date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
 * @returns Formatted date string (e.g., "Jan 24")
 */
export const formatDateShortNaive = (dateString: string): string => {
  if (!dateString) return '';
  
  // Parse the string components directly without timezone conversion
  const dateStr = dateString.slice(0, 10); // Get just YYYY-MM-DD part
  const [year, month, day] = dateStr.split('-');
  
  // Create date object with local timezone (no conversion)
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format a date string without timezone conversion - standard local format
 * @param dateString ISO format date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
 * @returns Formatted date string in locale format
 */
export const formatDateLocalNaive = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  // Parse the string components directly without timezone conversion
  const dateStr = dateString.slice(0, 10); // Get just YYYY-MM-DD part
  const [year, month, day] = dateStr.split('-');
  
  // Create date object with local timezone (no conversion)
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  return date.toLocaleDateString();
};

/**
 * Format a time string from a datetime without timezone conversion
 * @param dateTimeString ISO format datetime string (YYYY-MM-DDTHH:mm:ss)
 * @returns Formatted time string
 */
export const formatTimeNaive = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  
  // Parse the string components directly without timezone conversion
  const dateStr = dateTimeString.slice(0, 19); // Remove any timezone info
  const [datePart, timePart] = dateStr.split('T');
  
  if (!timePart) return '';
  
  const [hour, minute] = timePart.split(':');
  
  // Create date object with local timezone (no conversion)
  const date = new Date(2000, 0, 1, parseInt(hour), parseInt(minute)); // Use dummy date
  
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format a full datetime string without timezone conversion
 * @param dateTimeString ISO format datetime string (YYYY-MM-DDTHH:mm:ss)
 * @returns Formatted datetime string with both date and time
 */
export const formatFullDateTimeNaive = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  
  // Parse the string components directly without timezone conversion
  const dateStr = dateTimeString.slice(0, 19); // Remove any timezone info
  const [datePart, timePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-');
  const [hour, minute] = timePart.split(':');
  
  // Create date object with local timezone (no conversion)
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format a date range without timezone conversion
 * @param startDate ISO format date string
 * @param endDate ISO format date string
 * @returns Formatted date range string (e.g., "Jan 24 - Jan 26, 2025")
 */
export const formatDateRangeNaive = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return '';
  
  const start = formatDateNaive(startDate);
  const end = formatDateNaive(endDate);
  
  // If same date, just show once
  if (start === end) return start;
  
  return `${start} - ${end}`;
};

/**
 * Smart date formatting for mobile/desktop without timezone conversion
 * @param dateTimeString ISO format datetime string
 * @param isMobile Whether to use mobile formatting
 * @returns Formatted date string appropriate for the device
 */
export const formatDateSmartNaive = (dateTimeString: string, isMobile: boolean = false): string => {
  if (!dateTimeString) return '';
  
  // Parse string components directly without timezone conversion
  const dateStr = dateTimeString.slice(0, 19); // Remove any timezone info
  const [datePart, timePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-');
  const [hour, minute] = timePart.split(':');
  
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isMobile) {
    // For today, show only time
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // For yesterday, show "Yesterday"
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // For other dates, show compact format
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  // Full date and time for desktop
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get a relative time description (e.g., "2 days ago", "in 3 hours")
 * @param dateTimeString ISO format datetime string
 * @returns Relative time description
 */
export const getRelativeTime = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  
  const date = parseNaiveDateTimeToDate(dateTimeString);
  if (!date) return '';
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDays = Math.round(diffHr / 24);
  
  if (diffDays > 0) {
    return `in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  } else if (diffDays < 0) {
    return `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'} ago`;
  } else if (diffHr > 0) {
    return `in ${diffHr} ${diffHr === 1 ? 'hour' : 'hours'}`;
  } else if (diffHr < 0) {
    return `${Math.abs(diffHr)} ${Math.abs(diffHr) === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffMin > 0) {
    return `in ${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'}`;
  } else if (diffMin < 0) {
    return `${Math.abs(diffMin)} ${Math.abs(diffMin) === 1 ? 'minute' : 'minutes'} ago`;
  } else {
    return 'just now';
  }
};

/**
 * Comprehensive squad date validation that matches backend logic
 * @param squadStartDateTime Squad start datetime string (timezone-naive)
 * @param eventStartDate Event start date string (timezone-naive)
 * @param eventEndDate Event end date string (timezone-naive)
 * @returns Object with validation result and error message
 */
export const validateSquadDates = (
  squadStartDateTime: string,
  eventStartDate: string,
  eventEndDate: string
): { isValid: boolean; errorMessage?: string } => {
  try {
    // Normalize all datetime strings to remove timezone info and microseconds
    const normalizeDateTime = (dateTimeStr: string): string => {
      if (!dateTimeStr) return '';
      // Remove timezone info and microseconds, keep only YYYY-MM-DDTHH:mm:ss
      return dateTimeStr.slice(0, 19);
    };

    const normalizedSquadStart = normalizeDateTime(squadStartDateTime);
    const normalizedEventStart = normalizeDateTime(eventStartDate);
    const normalizedEventEnd = normalizeDateTime(eventEndDate);

    // Convert to Date objects for comparison (all will be in local timezone)
    const squadStart = parseNaiveDateTimeToDate(normalizedSquadStart);
    const eventStart = parseNaiveDateTimeToDate(normalizedEventStart);
    const eventEnd = parseNaiveDateTimeToDate(normalizedEventEnd);

    // Validate that dates are valid
    if (!squadStart || !eventStart || !eventEnd) {
      return {
        isValid: false,
        errorMessage: 'Invalid date format in validation'
      };
    }

    // Validate squad start time is within event bounds
    if (squadStart < eventStart) {
      return {
        isValid: false,
        errorMessage: `Squad start time must be after event start time (${normalizedEventStart})`
      };
    }

    if (squadStart > eventEnd) {
      return {
        isValid: false,
        errorMessage: `Squad start time must be before event end time (${normalizedEventEnd})`
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating squad dates:', error);
    return {
      isValid: false,
      errorMessage: 'Error validating squad dates'
    };
  }
};

// ===== DATETIME UTILITIES (from datetimeUtils.ts) =====

/**
 * Parse a timezone-naive ISO datetime string into a local Date (no UTC shift).
 * Accepts YYYY-MM-DDTHH:mm, YYYY-MM-DDTHH:mm:ss, or fractional seconds.
 */
export const parseNaiveDateTimeToDate = (
  value: string | null | undefined
): Date | null => {
  if (!value || !value.trim()) return null;
  const s = value.trim().replace(' ', 'T').slice(0, 19);
  const [datePart, timePart] = s.split('T');
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split('-').map((x) => parseInt(x, 10));
  const timeBits = timePart.split(':');
  const h = parseInt(timeBits[0] ?? '0', 10);
  const min = parseInt(timeBits[1] ?? '0', 10);
  const sec = parseInt(timeBits[2] ?? '0', 10);
  if ([y, m, d, h, min, sec].some((n) => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d, h, min, sec);
};

export const parseNaiveDateTimeToTimestamp = (
  value: string | null | undefined
): number => {
  const parsed = parseNaiveDateTimeToDate(value);
  return parsed ? parsed.getTime() : Number.NaN;
};

/**
 * Return the later of event start or current local time.
 * Input is treated as timezone-naive wall time.
 */
export const getLaterOfEventStartOrNow = (
  eventStart: string | null | undefined
): Date => {
  const now = new Date();
  const parsedEventStart = parseNaiveDateTimeToDate(eventStart);
  if (!parsedEventStart) return now;
  return parsedEventStart > now ? parsedEventStart : now;
};

export { getApiErrorMessage, getErrorMessage } from '../api/apiErrors';

/** First 16 chars YYYY-MM-DDTHH:mm for comparing datetime-local style values */
export const naiveDateTimeToMinuteKey = (value: string | null | undefined): string => {
  if (!value) return '';
  return value.slice(0, 16);
};

/**
 * Convert a Date object to a timezone-naive ISO string with microseconds
 * @param date Date object
 * @returns ISO string without timezone info (YYYY-MM-DDTHH:mm:ss.uuuuuu)
 */
export const toTimezoneNaiveISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  // Deterministic microseconds for stable comparisons and payloads.
  const microseconds = '000';
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${microseconds}`;
};

/**
 * Convert a Date object to a timezone-naive ISO string without microseconds
 * @param date Date object
 * @returns ISO string without timezone info (YYYY-MM-DDTHH:mm:ss)
 */
export const toTimezoneNaiveISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Convert a datetime string to timezone-naive format
 * @param dateTimeString ISO datetime string (may include timezone)
 * @returns Timezone-naive ISO string (YYYY-MM-DDTHH:mm:ss)
 */
export const toTimezoneNaiveString = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  
  // Remove timezone info and return just the datetime part
  return dateTimeString.slice(0, 19);
};

/**
 * Get current datetime as timezone-naive string with microseconds
 * @returns Current datetime as timezone-naive ISO string
 */
export const getCurrentTimezoneNaiveISO = (): string => {
  return toTimezoneNaiveISO(new Date());
};

/**
 * Get current datetime as timezone-naive string without microseconds
 * @returns Current datetime as timezone-naive ISO string
 */
export const getCurrentTimezoneNaiveISOString = (): string => {
  return toTimezoneNaiveISOString(new Date());
};

/**
 * Ensure a datetime string is timezone-naive before sending to backend
 * @param dateTimeString ISO datetime string
 * @returns Timezone-naive datetime string
 */
export const ensureTimezoneNaive = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  return dateTimeString.trim().replace(' ', 'T').slice(0, 19);
};

/**
 * Add days to a date
 * @param date Date object
 * @param days Number of days to add
 * @returns New Date object
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Add hours to a date
 * @param date Date object
 * @param hours Number of hours to add
 * @returns New Date object
 */
export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

/**
 * Add minutes to a date
 * @param date Date object
 * @param minutes Number of minutes to add
 * @returns New Date object
 */
export const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

/**
 * Get current date as YYYY-MM-DD string
 * @returns Current date as YYYY-MM-DD string
 */
export const getCurrentDateString = (): string => {
  return toLocalDateString(new Date());
};

/**
 * Convert a Date object to YYYY-MM-DD string
 * @param date Date object
 * @returns Date as YYYY-MM-DD string
 */
export const toDateString = (date: Date): string => {
  return toLocalDateString(date);
};

/**
 * Local calendar date as YYYY-MM-DD (use for date pickers; avoids UTC shift from toISOString).
 */
export const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Backend EventCreate expects datetime (Pydantic), not date-only strings.
 * Accepts YYYY-MM-DD or existing naive ISO; returns YYYY-MM-DDTHH:mm:ss wall time.
 */
export const normalizeToNaiveDateTime = (isoOrYyyyMmDd: string, endOfDay: boolean): string => {
  const s = (isoOrYyyyMmDd || '').trim();
  if (!s) return s;
  if (s.includes('T')) {
    return toTimezoneNaiveString(s).slice(0, 19);
  }
  const datePart = s.slice(0, 10);
  const parts = datePart.split('-');
  if (parts.length !== 3) return s;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if ([y, m, d].some((n) => Number.isNaN(n))) return s;
  const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  return toTimezoneNaiveISOString(dt);
}; 

/**
 * Convert a date or datetime value to the same calendar day at 23:59:59 (timezone-naive).
 * Accepts YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss input.
 */
export const toSameDayEndOfDayNaiveDateTime = (
  isoOrYyyyMmDd: string | null | undefined
): string => {
  const raw = (isoOrYyyyMmDd || '').trim();
  if (!raw) return '';
  const datePart = raw.includes('T') ? raw.slice(0, 10) : raw.slice(0, 10);
  return normalizeToNaiveDateTime(datePart, true);
};