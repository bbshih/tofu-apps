import { describe, it, expect } from 'vitest';
import {
  formatDateLabel,
  generateDatesInRange,
  createDateOption,
  generateDateOptions,
  parseDate,
  formatDateFull,
  getDayName,
  DaysOfWeek,
  DayPatterns,
  generateQuarterlyWeekends,
  generateNextWeekends,
  generateThisWeekend,
  generateCustomPattern,
} from './dateHelpers';

describe('dateHelpers', () => {
  describe('formatDateLabel', () => {
    it('should format ISO date to short label', () => {
      const label = formatDateLabel('2025-01-15');
      expect(label).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
      expect(label).toContain('Jan');
      expect(label).toContain('15');
    });

    it('should handle different months', () => {
      expect(formatDateLabel('2025-03-20')).toContain('Mar');
      expect(formatDateLabel('2025-12-25')).toContain('Dec');
    });

    it('should handle edge cases', () => {
      expect(formatDateLabel('2025-01-01')).toContain('Jan');
      expect(formatDateLabel('2025-12-31')).toContain('Dec');
    });
  });

  describe('generateDatesInRange', () => {
    it('should generate weekend dates', () => {
      // Use T12:00:00 to avoid timezone issues
      const start = new Date('2025-01-01T12:00:00');
      const end = new Date('2025-01-31T12:00:00');
      const dates = generateDatesInRange(start, end, DayPatterns.WEEKENDS);

      expect(dates.length).toBeGreaterThan(0);
      dates.forEach((isoDate) => {
        expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const date = new Date(isoDate + 'T12:00:00');
        expect([0, 6]).toContain(date.getDay());
      });
    });

    it('should generate weekday dates', () => {
      const start = new Date('2025-01-01T12:00:00');
      const end = new Date('2025-01-31T12:00:00');
      const dates = generateDatesInRange(start, end, DayPatterns.WEEKDAYS);

      expect(dates.length).toBeGreaterThan(0);
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T12:00:00');
        const day = date.getDay();
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(5);
      });
    });

    it('should generate specific days', () => {
      const start = new Date('2025-01-01T12:00:00');
      const end = new Date('2025-01-31T12:00:00');
      const dates = generateDatesInRange(start, end, [5]); // Fridays only

      // January 2025 has Fridays on: 3, 10, 17, 24, 31 = 5 Fridays
      expect(dates.length).toBe(5);
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T12:00:00');
        expect(date.getDay()).toBe(5);
      });
    });

    it('should handle Fri-Sun pattern', () => {
      const start = new Date('2025-01-01T12:00:00');
      const end = new Date('2025-01-31T12:00:00');
      const dates = generateDatesInRange(start, end, DayPatterns.FRI_SUN);

      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T12:00:00');
        expect([5, 6, 0]).toContain(date.getDay());
      });
    });

    it('should handle empty days array', () => {
      const start = new Date('2025-01-01T12:00:00');
      const end = new Date('2025-01-31T12:00:00');
      const dates = generateDatesInRange(start, end, []);

      expect(dates).toEqual([]);
    });

    it('should handle single day range', () => {
      // Jan 15, 2025 is a Wednesday
      const start = new Date('2025-01-15T12:00:00');
      const end = new Date('2025-01-15T12:00:00');
      const dates = generateDatesInRange(start, end, DayPatterns.ALL_DAYS);

      expect(dates.length).toBe(1);
      expect(dates[0]).toBe('2025-01-15');
    });
  });

  describe('createDateOption', () => {
    it('should create date option with auto-generated id', () => {
      const option = createDateOption('2025-01-15');

      expect(option.id).toBe('date-2025-01-15');
      expect(option.date).toBe('2025-01-15');
      expect(option.label).toMatch(/Jan 15/);
    });

    it('should create date option with custom id', () => {
      const option = createDateOption('2025-01-15', 'custom-id');

      expect(option.id).toBe('custom-id');
      expect(option.date).toBe('2025-01-15');
    });
  });

  describe('generateDateOptions', () => {
    it('should generate array of DateOptions', () => {
      const start = new Date('2025-01-01T12:00:00');
      const end = new Date('2025-01-07T12:00:00');
      const options = generateDateOptions(start, end, DayPatterns.WEEKENDS);

      expect(options.length).toBeGreaterThan(0);
      options.forEach((option) => {
        expect(option).toHaveProperty('id');
        expect(option).toHaveProperty('date');
        expect(option).toHaveProperty('label');
        expect(option.id).toMatch(/^date-\d+$/);
      });
    });
  });

  describe('parseDate', () => {
    it('should parse valid ISO date', () => {
      // parseDate returns a UTC-based Date, so use UTC methods for verification
      const date = parseDate('2025-01-15');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getUTCFullYear()).toBe(2025);
      expect(date?.getUTCMonth()).toBe(0);
      expect(date?.getUTCDate()).toBe(15);
    });

    it('should parse MM/DD/YYYY format', () => {
      const date = parseDate('01/15/2025');
      expect(date).toBeInstanceOf(Date);
    });

    it('should return null for invalid date', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('2025-13-45')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate('2025-01-32')).toBeNull();
    });
  });

  describe('formatDateFull', () => {
    it('should format date in full format', () => {
      const formatted = formatDateFull('2025-01-15');

      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
      expect(formatted).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
    });

    it('should handle different dates', () => {
      expect(formatDateFull('2025-12-25')).toContain('December');
      expect(formatDateFull('2025-07-04')).toContain('July');
    });
  });

  describe('getDayName', () => {
    it('should return correct day abbreviations', () => {
      expect(getDayName(0)).toBe('Sun');
      expect(getDayName(1)).toBe('Mon');
      expect(getDayName(2)).toBe('Tue');
      expect(getDayName(3)).toBe('Wed');
      expect(getDayName(4)).toBe('Thu');
      expect(getDayName(5)).toBe('Fri');
      expect(getDayName(6)).toBe('Sat');
    });

    it('should return empty string for invalid day', () => {
      expect(getDayName(-1)).toBe('');
      expect(getDayName(7)).toBe('');
      expect(getDayName(100)).toBe('');
    });
  });

  describe('DaysOfWeek constants', () => {
    it('should have correct day mappings', () => {
      expect(DaysOfWeek.SUNDAY).toBe(0);
      expect(DaysOfWeek.MONDAY).toBe(1);
      expect(DaysOfWeek.TUESDAY).toBe(2);
      expect(DaysOfWeek.WEDNESDAY).toBe(3);
      expect(DaysOfWeek.THURSDAY).toBe(4);
      expect(DaysOfWeek.FRIDAY).toBe(5);
      expect(DaysOfWeek.SATURDAY).toBe(6);
    });
  });

  describe('DayPatterns constants', () => {
    it('should have correct weekend pattern', () => {
      expect(DayPatterns.WEEKENDS).toEqual([6, 0]);
    });

    it('should have correct Fri-Sun pattern', () => {
      expect(DayPatterns.FRI_SUN).toEqual([5, 6, 0]);
    });

    it('should have correct weekday pattern', () => {
      expect(DayPatterns.WEEKDAYS).toEqual([1, 2, 3, 4, 5]);
    });

    it('should have correct all days pattern', () => {
      expect(DayPatterns.ALL_DAYS).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });
  });

  describe('generateQuarterlyWeekends', () => {
    it('should generate Fri-Sun dates for 3 months', () => {
      const dates = generateQuarterlyWeekends();

      expect(dates.length).toBeGreaterThan(10); // Should have many weekend dates
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T00:00:00');
        expect([5, 6, 0]).toContain(date.getDay());
      });
    });

    it('should span approximately 3 months', () => {
      const dates = generateQuarterlyWeekends();

      const firstDate = new Date(dates[0] + 'T00:00:00');
      const lastDate = new Date(dates[dates.length - 1] + 'T00:00:00');

      const monthsDiff = (lastDate.getMonth() - firstDate.getMonth() + 12) % 12;
      expect(monthsDiff).toBeGreaterThanOrEqual(2);
      expect(monthsDiff).toBeLessThanOrEqual(3);
    });
  });

  describe('generateNextWeekends', () => {
    it('should generate next N weekends (Sat-Sun)', () => {
      const dates = generateNextWeekends(3, false);

      expect(dates.length).toBeGreaterThanOrEqual(4); // At least 3 weekends = 6 days
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T00:00:00');
        expect([6, 0]).toContain(date.getDay()); // Only Sat and Sun
      });
    });

    it('should generate next N weekends including Friday', () => {
      const dates = generateNextWeekends(2, true);

      expect(dates.length).toBeGreaterThanOrEqual(4); // At least 2 weekends = 6 days (Fri-Sun)
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T00:00:00');
        expect([5, 6, 0]).toContain(date.getDay());
      });
    });

    it('should handle single weekend', () => {
      const dates = generateNextWeekends(1, false);

      expect(dates.length).toBeGreaterThanOrEqual(2); // Sat + Sun
      expect(dates.length).toBeLessThanOrEqual(2);
    });

    it('should return dates in chronological order', () => {
      const dates = generateNextWeekends(3, true);

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] + 'T00:00:00');
        const curr = new Date(dates[i] + 'T00:00:00');
        expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
      }
    });
  });

  describe('generateThisWeekend', () => {
    it('should generate this weekend including Friday', () => {
      const dates = generateThisWeekend(true);

      expect(dates.length).toBeGreaterThanOrEqual(1);
      expect(dates.length).toBeLessThanOrEqual(3); // Fri, Sat, Sun
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T00:00:00');
        expect([5, 6, 0]).toContain(date.getDay());
      });
    });

    it('should generate this weekend without Friday', () => {
      const dates = generateThisWeekend(false);

      expect(dates.length).toBeGreaterThanOrEqual(1);
      expect(dates.length).toBeLessThanOrEqual(2); // Sat, Sun only
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T00:00:00');
        expect([6, 0]).toContain(date.getDay());
      });
    });

    it('should return dates in chronological order', () => {
      const dates = generateThisWeekend(true);

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] + 'T00:00:00');
        const curr = new Date(dates[i] + 'T00:00:00');
        expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
      }
    });
  });

  describe('generateCustomPattern', () => {
    it('should generate dates for current month', () => {
      const dates = generateCustomPattern([5], 0, 1); // Fridays this month

      expect(dates.length).toBeGreaterThan(0);
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T00:00:00');
        expect(date.getDay()).toBe(5);

        const today = new Date();
        expect(date.getMonth()).toBe(today.getMonth());
      });
    });

    it('should generate dates for next month', () => {
      const dates = generateCustomPattern([6, 0], 1, 1); // Weekends next month

      expect(dates.length).toBeGreaterThan(0);
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T00:00:00');
        expect([6, 0]).toContain(date.getDay());

        const today = new Date();
        const nextMonth = (today.getMonth() + 1) % 12;
        expect(date.getMonth()).toBe(nextMonth);
      });
    });

    it('should generate dates for multiple months', () => {
      const dates = generateCustomPattern([1, 3, 5], 0, 3); // Mon/Wed/Fri for 3 months

      expect(dates.length).toBeGreaterThan(10);
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T00:00:00');
        expect([1, 3, 5]).toContain(date.getDay());
      });
    });

    it('should handle future months', () => {
      const dates = generateCustomPattern([6], 6, 1); // Saturdays 6 months from now

      expect(dates.length).toBeGreaterThan(0);
      dates.forEach((isoDate) => {
        const date = new Date(isoDate + 'T00:00:00');
        expect(date.getDay()).toBe(6);
      });
    });

    it('should handle all days pattern', () => {
      const dates = generateCustomPattern(DayPatterns.ALL_DAYS, 0, 1);

      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

      expect(dates.length).toBeGreaterThanOrEqual(daysInMonth - today.getDate());
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle leap year', () => {
      const start = new Date('2024-02-01T12:00:00');
      const end = new Date('2024-02-29T12:00:00');
      const dates = generateDatesInRange(start, end, DayPatterns.ALL_DAYS);

      expect(dates.length).toBe(29);
    });

    it('should handle non-leap year', () => {
      const start = new Date('2025-02-01T12:00:00');
      const end = new Date('2025-02-28T12:00:00');
      const dates = generateDatesInRange(start, end, DayPatterns.ALL_DAYS);

      expect(dates.length).toBe(28);
    });

    it('should handle year boundaries', () => {
      const start = new Date('2024-12-25T12:00:00');
      const end = new Date('2025-01-05T12:00:00');
      const dates = generateDatesInRange(start, end, DayPatterns.ALL_DAYS);

      expect(dates.length).toBe(12); // Dec 25-31 (7) + Jan 1-5 (5)
    });

    it('should handle same start and end date', () => {
      // Jan 15, 2025 is a Wednesday (day 3)
      const start = new Date('2025-01-15T12:00:00');
      const end = new Date('2025-01-15T12:00:00');
      const dates = generateDatesInRange(start, end, [3]); // Wednesday

      // Jan 15, 2025 is indeed a Wednesday
      expect(dates.length).toBe(1);
      expect(dates[0]).toBe('2025-01-15');
    });
  });
});
