import type { DateOption } from '../types/local';

/**
 * Grouped date structure with month and associated dates
 */
export interface GroupedDate {
  month: string; // "January 2025"
  dates: {
    dateOption: DateOption;
    dayOfWeek: string; // "Mon", "Tue", etc.
    dayOfMonth: number; // 15
  }[];
}

/**
 * Groups date options by month and year
 * Used in DateListView and DateCalendarView
 *
 * @param dateOptions - Array of date options to group
 * @returns Array of grouped dates by month, sorted chronologically
 */
export function groupDatesByMonth(dateOptions: DateOption[]): GroupedDate[] {
  const groupedByMonth: GroupedDate[] = [];

  dateOptions.forEach((option) => {
    const date = new Date(option.date + 'T00:00:00');
    const monthYear = date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayOfMonth = date.getDate();

    let monthGroup = groupedByMonth.find((g) => g.month === monthYear);
    if (!monthGroup) {
      monthGroup = { month: monthYear, dates: [] };
      groupedByMonth.push(monthGroup);
    }

    monthGroup.dates.push({
      dateOption: option,
      dayOfWeek,
      dayOfMonth,
    });
  });

  // Sort months chronologically
  return sortDateGroups(groupedByMonth);
}

/**
 * Sorts grouped dates chronologically by month
 *
 * @param groups - Array of grouped dates
 * @returns Sorted array of grouped dates
 */
export function sortDateGroups(groups: GroupedDate[]): GroupedDate[] {
  return groups.sort((a, b) => {
    const dateA = new Date(a.dates[0].dateOption.date);
    const dateB = new Date(b.dates[0].dateOption.date);
    return dateA.getTime() - dateB.getTime();
  });
}
