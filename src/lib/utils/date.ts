import { format, parse, isValid } from 'date-fns';

/**
 * Format date as DD-MMM-YY (e.g., 05-Mar-25)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, 'dd-MMM-yy');
}

/**
 * Format date as DD-MMM-YYYY (e.g., 05-Mar-2025) - full year
 */
export function formatDateFull(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, 'dd-MMM-yyyy');
}

/**
 * Format date and time as DD-MMM-YY HH:mm (e.g., 05-Mar-25 14:30)
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, 'dd-MMM-yy HH:mm');
}

/**
 * Parse date from DD-MMM-YY format
 */
export function parseDate(dateString: string): Date | null {
  try {
    const parsed = parse(dateString, 'dd-MMM-yy', new Date());
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Get current date formatted as DD-MMM-YY
 */
export function getCurrentDate(): string {
  return formatDate(new Date());
}

