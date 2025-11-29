/**
 * Natural Language Processing service for date parsing
 * Parses event descriptions to extract dates and details using chrono-node
 */

import * as chrono from 'chrono-node';
import { addDays, addWeeks, addMonths, startOfDay, endOfWeek, startOfWeek, format } from 'date-fns';
import { parseEventWithLLM, expandDateRanges, type LLMParsedEvent } from './llmDateParser';

export interface ParsedEvent {
  title: string;
  dates: Date[];
  times: string[];
  description?: string;
  raw: string;
}

/**
 * Parse natural language event description
 * Examples:
 * - "Q1 2025 Hangout - Fridays and Saturdays in January"
 * - "Movie night next Friday and Saturday at 7pm"
 * - "Dinner on Jan 10, Jan 17, and Jan 24 at 7:30pm"
 * - "Boys Night every weekend in December"
 * - "Hangout weekends for the next 3 months"
 * - "Every friday and saturday this and next week"
 * - "tomorrow"
 * - "next week"
 * - "this weekend"
 */
export function parseEventDescription(text: string): ParsedEvent {
  const parsed: ParsedEvent = {
    title: '',
    dates: [],
    times: [],
    description: '',
    raw: text,
  };

  // Check for "weekends? (for|over) (the )?next X (months?|weeks?)" pattern
  const weekendsNextPattern =
    /weekends?\s+(?:for|over)\s+(?:the\s+)?next\s+(\d+)\s+(months?|weeks?)/i;
  const weekendsNextMatch = text.match(weekendsNextPattern);

  // Check for "every [day(s)] (this|next) (and next )?(week|month)" pattern
  const everyDayWeekPattern =
    /every\s+((?:friday|saturday|sunday|monday|tuesday|wednesday|thursday)(?:\s+and\s+(?:friday|saturday|sunday|monday|tuesday|wednesday|thursday))*)\s+(this|next)\s+(?:and\s+next\s+)?(week|month)/i;
  const everyDayWeekMatch = text.match(everyDayWeekPattern);

  // Check for "every [day(s)] in [month/year]" pattern
  const everyPattern =
    /every\s+(weekend|weekday|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\s+in\s+(\w+)/i;
  const everyMatch = text.match(everyPattern);

  if (weekendsNextMatch) {
    const count = parseInt(weekendsNextMatch[1]);
    const unit = weekendsNextMatch[2].toLowerCase();
    const daysOfWeek = [6, 0]; // Saturday and Sunday

    const now = startOfDay(new Date());
    let endDate: Date;

    if (unit.startsWith('month')) {
      endDate = addMonths(now, count);
    } else {
      endDate = addWeeks(now, count);
    }

    parsed.dates = generateDateRange(now, endDate, daysOfWeek);

    // Extract title
    const titleCandidate = text.substring(0, weekendsNextMatch.index).trim();
    if (titleCandidate.length > 0 && titleCandidate.length < 100) {
      parsed.title = titleCandidate;
    }
  } else if (everyDayWeekMatch) {
    const daysText = everyDayWeekMatch[1];
    const timeframe = everyDayWeekMatch[2]; // "this" or "next"
    const hasNext = text.includes('and next');

    // Parse all mentioned days
    const daysOfWeek = parseDayOfWeek(daysText);

    // Use chrono to parse "this week" or "next week"
    const chronoResult = chrono.parse(`${timeframe} week`);
    if (chronoResult.length > 0) {
      const weekDate = chronoResult[0].start.date();
      const startDate = startOfWeek(weekDate, { weekStartsOn: 0 }); // Week starts Sunday
      const endDate = endOfWeek(weekDate, { weekStartsOn: 0 });

      parsed.dates = generateDateRange(startDate, endDate, daysOfWeek);

      // If "this and next week", add next week too
      if (hasNext) {
        const nextWeekResult = chrono.parse('next week');
        if (nextWeekResult.length > 0) {
          const nextWeekDate = nextWeekResult[0].start.date();
          const nextWeekStart = startOfWeek(nextWeekDate, { weekStartsOn: 0 });
          const nextWeekEnd = endOfWeek(nextWeekDate, { weekStartsOn: 0 });
          const nextWeekDates = generateDateRange(nextWeekStart, nextWeekEnd, daysOfWeek);
          parsed.dates = [...parsed.dates, ...nextWeekDates].sort(
            (a, b) => a.getTime() - b.getTime()
          );
        }
      }
    }

    // Extract title
    const titleCandidate = text.substring(0, everyDayWeekMatch.index).trim();
    if (titleCandidate.length > 0 && titleCandidate.length < 100) {
      parsed.title = titleCandidate;
    }
  } else if (everyMatch) {
    const dayType = everyMatch[1].toLowerCase();
    const monthText = everyMatch[2];

    // Parse the month/year
    const monthResult = chrono.parse(monthText);
    if (monthResult.length > 0) {
      const targetDate = monthResult[0].start.date();
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();

      // Determine which days of week to include
      let daysOfWeek: number[] = [];
      if (dayType === 'weekend') {
        daysOfWeek = [6, 0]; // Saturday and Sunday
      } else if (dayType === 'weekday') {
        daysOfWeek = [1, 2, 3, 4, 5]; // Monday-Friday
      } else {
        // Parse specific day
        daysOfWeek = parseDayOfWeek(dayType);
      }

      // Generate all matching dates in the month
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      parsed.dates = generateDateRange(firstDay, lastDay, daysOfWeek);
    }
  } else {
    // Parse dates using chrono-node
    const chronoResults = chrono.parse(text);

    if (chronoResults.length > 0) {
      // Extract dates, filtering out vague time references
      for (const result of chronoResults) {
        // Skip vague references like "night", "morning", "evening" without specific dates
        if (
          result.text.match(/^(night|morning|evening|afternoon)$/i) &&
          !result.start.isCertain('day')
        ) {
          continue;
        }

        const date = result.start.date();
        parsed.dates.push(date);

        // Extract time if present
        if (result.start.isCertain('hour')) {
          const time = format(date, 'h:mm a');
          if (!parsed.times.includes(time)) {
            parsed.times.push(time);
          }
        }
      }

      // Remove duplicate dates
      parsed.dates = Array.from(new Set(parsed.dates.map((d) => d.toISOString())))
        .map((iso) => new Date(iso))
        .sort((a, b) => a.getTime() - b.getTime());
    }
  }

  // Try to extract title
  if (weekendsNextMatch || everyDayWeekMatch) {
    // Title already extracted above
  } else if (everyMatch) {
    // For "every X in Y" pattern, title is everything before "every"
    const titleCandidate = text.substring(0, everyMatch.index).trim();
    if (titleCandidate.length > 0 && titleCandidate.length < 100) {
      parsed.title = titleCandidate;
    }
  } else {
    // For explicit dates, title is before first date mention
    const chronoResults = chrono.parse(text);
    if (chronoResults.length > 0) {
      const firstDateIndex = chronoResults[0].index;
      const titleCandidate = text.substring(0, firstDateIndex).trim();

      // Remove common prefixes
      const cleanTitle = titleCandidate
        .replace(/^(event|hangout|gathering|meeting|dinner|lunch)[\s:]*-?[\s:]*/i, '')
        .trim();

      if (cleanTitle.length > 0 && cleanTitle.length < 100) {
        parsed.title = cleanTitle;
      }
    }
  }

  // If no title found, use first few words
  if (!parsed.title) {
    const words = text.split(/\s+/).slice(0, 5);
    parsed.title = words.join(' ');
  }

  return parsed;
}

/**
 * Parse natural language input and return ISO date strings
 * This is a simplified version for quick date parsing without full event context
 * Returns array of ISO date strings (YYYY-MM-DD)
 */
export function parseDateFromNaturalLanguage(input: string): string[] {
  const parsed = parseEventDescription(input);
  return parsed.dates.map((date) => {
    const d = startOfDay(date);
    return format(d, 'yyyy-MM-dd');
  });
}

/**
 * Generate date options from a date range and days of week
 * Example: "Fridays and Saturdays in January" → [Jan 3, Jan 4, Jan 10, Jan 11, ...]
 */
export function generateDateRange(
  startDate: Date,
  endDate: Date,
  daysOfWeek: number[] // 0=Sunday, 5=Friday, 6=Saturday
): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(startDate);
  const end = startOfDay(endDate);

  while (current <= end) {
    if (daysOfWeek.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * Parse day of week from text
 * Returns day number (0-6) or -1 if not found
 */
export function parseDayOfWeek(text: string): number[] {
  const days: number[] = [];
  const lower = text.toLowerCase();

  const dayMap: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };

  for (const [name, num] of Object.entries(dayMap)) {
    if (lower.includes(name)) {
      if (!days.includes(num)) {
        days.push(num);
      }
    }
  }

  return days.sort();
}

/**
 * Format date for display
 */
export function formatDateOption(date: Date): string {
  return format(date, 'EEE MMM d, yyyy');
}

/**
 * Validate parsed event
 */
export function validateParsedEvent(parsed: ParsedEvent): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!parsed.title || parsed.title.length < 3) {
    errors.push('Event title must be at least 3 characters');
  }

  if (parsed.title.length > 100) {
    errors.push('Event title must be less than 100 characters');
  }

  if (parsed.dates.length === 0) {
    errors.push('At least one date must be specified');
  }

  if (parsed.dates.length > 50) {
    errors.push('Maximum of 50 dates allowed');
  }

  // Check for past dates
  const now = new Date();
  const pastDates = parsed.dates.filter((d) => d < now);
  if (pastDates.length > 0) {
    errors.push('All dates must be in the future');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Tiered date parsing: Try local patterns first, fall back to LLM for complex cases
 * This is the main entry point for parsing event descriptions
 */
export async function parseEventDescriptionSmart(text: string): Promise<ParsedEvent> {
  // Step 1: Try local pattern matching (fast, free)
  const localResult = parseEventDescription(text);

  // Calculate confidence based on local parsing results
  const hasGoodTitle = localResult.title.length > 2 && localResult.title.length < 100;
  const hasDates = localResult.dates.length > 0;
  const localConfidence = hasGoodTitle && hasDates ? 0.9 : hasDates ? 0.7 : 0.0;

  // If local parsing is confident, use it
  if (localConfidence >= 0.85) {
    return localResult;
  }

  // Step 2: Try LLM parsing for complex/ambiguous cases
  try {
    const llmResult = await parseEventWithLLM(text);

    if (llmResult && llmResult.confidence >= 0.7) {
      // Convert LLM result to ParsedEvent format
      const dates = expandDateRanges(llmResult.dateRanges);
      const times = llmResult.dateRanges
        .flatMap((range) => range.times || [])
        .filter((time, index, self) => self.indexOf(time) === index); // unique

      return {
        title: llmResult.title,
        dates,
        times,
        description: llmResult.description || '',
        raw: text,
      };
    }
  } catch (_error) {
    console.warn('LLM parsing failed, using local result:', _error);
  }

  // Step 3: Fall back to local result if LLM fails or has low confidence
  return localResult;
}

/**
 * Export LLM parsed event for advanced use cases
 */
export async function parseEventDescriptionAdvanced(text: string): Promise<LLMParsedEvent | null> {
  return parseEventWithLLM(text);
}
