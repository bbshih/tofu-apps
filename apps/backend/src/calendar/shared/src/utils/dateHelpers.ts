import { DateOption } from '../types/index.js';

/**
 * Format an ISO date string into a display label
 * Example: "2025-01-10" -> "Fri Jan 10"
 */
export function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00'); // Add time to avoid timezone issues
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${dayOfWeek} ${month} ${day}`;
}

/**
 * Generate all dates in a range that match specified days of week
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param daysOfWeek - Array of day numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @returns Array of ISO date strings
 */
export function generateDatesInRange(
  startDate: Date,
  endDate: Date,
  daysOfWeek: readonly number[]
): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    if (daysOfWeek.includes(current.getDay())) {
      // Format as ISO date string (YYYY-MM-DD)
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Create a DateOption object from an ISO date string
 */
export function createDateOption(isoDate: string, id?: string): DateOption {
  return {
    id: id || `date-${isoDate}`,
    date: isoDate,
    label: formatDateLabel(isoDate),
  };
}

/**
 * Generate DateOptions for a range of dates with specified days of week
 */
export function generateDateOptions(
  startDate: Date,
  endDate: Date,
  daysOfWeek: readonly number[]
): DateOption[] {
  const dates = generateDatesInRange(startDate, endDate, daysOfWeek);
  return dates.map((date, index) => createDateOption(date, `date-${index}`));
}

/**
 * Parse a date string in various formats to a Date object
 * Supports: YYYY-MM-DD, MM/DD/YYYY, etc.
 */
export function parseDate(dateString: string): Date | null {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/**
 * Format a date for display in full format
 * Example: "2025-01-10" -> "Friday, January 10, 2025"
 */
export function formatDateFull(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get day of week abbreviation (0-6 -> Sun-Sat)
 */
export function getDayName(dayNumber: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayNumber] || '';
}

/**
 * Day of week constants for readability
 */
export const DaysOfWeek = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

/**
 * Common day combinations
 */
export const DayPatterns = {
  WEEKENDS: [DaysOfWeek.SATURDAY, DaysOfWeek.SUNDAY],
  FRI_SUN: [DaysOfWeek.FRIDAY, DaysOfWeek.SATURDAY, DaysOfWeek.SUNDAY],
  WEEKDAYS: [
    DaysOfWeek.MONDAY,
    DaysOfWeek.TUESDAY,
    DaysOfWeek.WEDNESDAY,
    DaysOfWeek.THURSDAY,
    DaysOfWeek.FRIDAY,
  ],
  ALL_DAYS: [0, 1, 2, 3, 4, 5, 6],
} as const;

/**
 * Generate dates for "Quarterly Weekends" pattern (Fri-Sun for current + next 2 months)
 */
export function generateQuarterlyWeekends(): string[] {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0); // Last day of 3rd month

  return generateDatesInRange(startOfMonth, endDate, DayPatterns.FRI_SUN);
}

/**
 * Generate dates for "Next N Weekends" pattern
 */
export function generateNextWeekends(count: number, includeFriday = false): string[] {
  const today = new Date();
  const dates: string[] = [];
  const daysPattern = includeFriday ? DayPatterns.FRI_SUN : DayPatterns.WEEKENDS;

  let current = new Date(today);
  let weekendsFound = 0;

  // Find the starting day (next Friday if including Friday, otherwise next Saturday)
  const targetStartDay = includeFriday ? DaysOfWeek.FRIDAY : DaysOfWeek.SATURDAY;
  while (current.getDay() !== targetStartDay) {
    current.setDate(current.getDate() + 1);
  }

  // Generate dates for N weekends
  const endDate = new Date(current);
  endDate.setDate(endDate.getDate() + count * 7); // Rough estimate, will filter

  const allDates = generateDatesInRange(current, endDate, daysPattern);

  // Group by weekend and take only N weekends
  for (const date of allDates) {
    const d = new Date(date + 'T00:00:00');
    if (d.getDay() === targetStartDay) {
      weekendsFound++;
      if (weekendsFound > count) {
        break;
      }
    }
    dates.push(date);
  }

  return dates;
}

/**
 * Generate dates for "This Weekend" pattern (upcoming Fri-Sun)
 */
export function generateThisWeekend(includeFriday = true): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // If today is Monday-Thursday, get the upcoming weekend
  // If today is Friday-Sunday, get this current weekend
  let startDate = new Date(today);

  if (includeFriday) {
    // Find this week's Friday
    const daysUntilFriday = (DaysOfWeek.FRIDAY - dayOfWeek + 7) % 7;
    startDate.setDate(today.getDate() + daysUntilFriday);
  } else {
    // Find this week's Saturday
    const daysUntilSaturday = (DaysOfWeek.SATURDAY - dayOfWeek + 7) % 7;
    startDate.setDate(today.getDate() + daysUntilSaturday);
  }

  // End date is Sunday
  const endDate = new Date(startDate);
  const daysUntilSunday = (DaysOfWeek.SUNDAY - startDate.getDay() + 7) % 7;
  endDate.setDate(startDate.getDate() + daysUntilSunday);

  const daysPattern = includeFriday ? DayPatterns.FRI_SUN : DayPatterns.WEEKENDS;
  return generateDatesInRange(startDate, endDate, daysPattern);
}

/**
 * Generate dates by custom pattern
 * @param daysOfWeek - Array of day numbers (0 = Sunday, 6 = Saturday)
 * @param monthsAhead - Number of months from now (0 = this month, 1 = next month, etc.)
 * @param monthCount - Number of months to include (default 1)
 */
export function generateCustomPattern(
  daysOfWeek: readonly number[],
  monthsAhead: number,
  monthCount: number = 1
): string[] {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + monthsAhead + monthCount, 0);

  return generateDatesInRange(startDate, endDate, daysOfWeek);
}
