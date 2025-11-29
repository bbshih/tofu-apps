import { useState, useMemo, memo, useEffect } from 'react';
import type { DateOption } from '../../types/local';
import { formatDateLabel } from '@seacalendar/shared';

interface CalendarMonthViewProps {
  dateOptions: DateOption[];
  onAddDate: (isoDate: string) => void;
  onRemoveDate: (dateId: string) => void;
}

// Memoized calendar day cell component for better performance
const CalendarDay = memo(function CalendarDay({
  day,
  year,
  month,
  isSelected,
  isPast,
  isToday,
  isWeekend,
  onClick,
  fontSize,
  padding,
}: {
  day: number;
  year: number;
  month: number;
  isSelected: boolean;
  isPast: boolean;
  isToday: boolean;
  isWeekend: boolean;
  onClick: () => void;
  fontSize: string;
  padding: string;
}) {
  const date = new Date(year, month, day);
  const isoDate = date.toISOString().split('T')[0];

  return (
    <button
      onClick={onClick}
      disabled={isPast}
      data-testid={isSelected ? 'calendar-day-selected' : 'calendar-day'}
      className={`
        aspect-square ${padding} rounded-lg transition-all
        flex items-center justify-center
        ${fontSize} font-medium
        ${isToday ? 'ring-2 ring-coral-400 ring-offset-1' : ''}
        ${isPast
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : isSelected
          ? 'bg-ocean-500 text-white hover:bg-ocean-600 shadow-md'
          : isWeekend
          ? 'bg-sand-50 text-ocean-700 hover:bg-sand-100'
          : 'bg-white text-gray-600 hover:bg-ocean-50 hover:text-ocean-700'
        }
      `}
      aria-label={`${formatDateLabel(isoDate)}${isSelected ? ' (selected)' : ''}`}
    >
      {day}
    </button>
  );
});

function CalendarMonthView({
  dateOptions,
  onAddDate,
  onRemoveDate,
}: CalendarMonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [monthsToShow, setMonthsToShow] = useState(1);

  // Determine how many months to show based on screen size
  useEffect(() => {
    const updateMonthsToShow = () => {
      const width = window.innerWidth;
      if (width >= 1280) {
        setMonthsToShow(3); // xl screens
      } else if (width >= 768) {
        setMonthsToShow(2); // md screens
      } else {
        setMonthsToShow(1); // mobile
      }
    };

    updateMonthsToShow();
    window.addEventListener('resize', updateMonthsToShow);
    return () => window.removeEventListener('resize', updateMonthsToShow);
  }, []);

  // Get the first day of the month and total days
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Memoize calendar calculations
  const { selectedDatesSet, todayTimestamp, todayDate } = useMemo(() => {
    // Create a set of selected dates for quick lookup
    const selectedSet = new Set(dateOptions.map(opt => opt.date));

    // Get today's timestamp for comparison (at midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();

    // Store today's full date info
    const todayInfo = {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate(),
    };

    return {
      selectedDatesSet: selectedSet,
      todayTimestamp: todayTs,
      todayDate: todayInfo
    };
  }, [dateOptions]);

  // Format current month display
  const monthYearDisplay = useMemo(
    () => currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    [currentMonth]
  );

  // Check if previous month would have any selectable (non-past) dates
  const canGoPrevious = useMemo(() => {
    const lastDayOfPrevMonth = new Date(year, month, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Can go to previous month if the last day of that month is today or in the future
    return lastDayOfPrevMonth.getTime() >= today.getTime();
  }, [year, month]);

  // Check if there are selections before or after the displayed range
  const { hasSelectionsBefore, hasSelectionsAfter } = useMemo(() => {
    const firstDisplayedMonth = new Date(year, month, 1);
    const lastDisplayedMonth = new Date(year, month + monthsToShow, 0);

    let before = false;
    let after = false;

    for (const option of dateOptions) {
      const optionDate = new Date(option.date + 'T00:00:00');
      if (optionDate < firstDisplayedMonth) {
        before = true;
      }
      if (optionDate > lastDisplayedMonth) {
        after = true;
      }
      if (before && after) break; // Early exit if both found
    }

    return { hasSelectionsBefore: before, hasSelectionsAfter: after };
  }, [dateOptions, year, month, monthsToShow]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Handle date click
  const handleDateClick = (day: number, monthOffset: number = 0) => {
    const clickedDate = new Date(year, month + monthOffset, day);
    const isoDate = clickedDate.toISOString().split('T')[0];

    if (selectedDatesSet.has(isoDate)) {
      // Find and remove the date
      const dateOption = dateOptions.find(opt => opt.date === isoDate);
      if (dateOption) {
        onRemoveDate(dateOption.id);
      }
    } else {
      // Add the date
      onAddDate(isoDate);
    }
  };

  // Generate calendar for a specific month
  const generateMonthCalendar = (monthOffset: number) => {
    const targetYear = new Date(year, month + monthOffset, 1).getFullYear();
    const targetMonth = new Date(year, month + monthOffset, 1).getMonth();

    const firstDayOfMonth = new Date(targetYear, targetMonth, 1);
    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return {
      days,
      year: targetYear,
      month: targetMonth,
      monthName: firstDayOfMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    };
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Font size classes based on number of months shown
  const fontSizeClasses = {
    dayHeader: monthsToShow === 1 ? 'text-sm' : monthsToShow === 2 ? 'text-xs' : 'text-[10px]',
    dayNumber: monthsToShow === 1 ? 'text-sm' : monthsToShow === 2 ? 'text-xs' : 'text-[10px]',
    monthTitle: monthsToShow === 1 ? 'text-lg' : monthsToShow === 2 ? 'text-base' : 'text-sm',
    padding: monthsToShow === 1 ? 'p-2' : monthsToShow === 2 ? 'p-1.5' : 'p-1',
  };

  return (
    <div className="bg-white rounded-xl border-2 border-ocean-200 overflow-hidden">
      {/* Header with navigation */}
      <div className="bg-ocean-100 px-4 py-3 flex items-center justify-between border-b-2 border-ocean-200">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousMonth}
            disabled={!canGoPrevious}
            className={`p-2 rounded-lg transition-colors ${
              canGoPrevious
                ? 'hover:bg-ocean-200 cursor-pointer'
                : 'opacity-40 cursor-not-allowed'
            }`}
            aria-label="Previous month"
          >
            <svg
              className={`w-5 h-5 transition-all duration-500 ${
                hasSelectionsBefore
                  ? 'text-coral-500 animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]'
                  : 'text-ocean-700'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <h3 className={`${fontSizeClasses.monthTitle} font-bold text-ocean-800`}>
            {monthsToShow === 1 ? monthYearDisplay : `${monthsToShow} Months`}
          </h3>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-ocean-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <svg
              className={`w-5 h-5 transition-all duration-500 ${
                hasSelectionsAfter
                  ? 'text-coral-500 animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]'
                  : 'text-ocean-700'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Multi-month grid */}
      <div className={`grid gap-4 p-4 ${
        monthsToShow === 1 ? 'grid-cols-1' :
        monthsToShow === 2 ? 'grid-cols-1 md:grid-cols-2' :
        'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      }`}>
        {Array.from({ length: monthsToShow }).map((_, monthIndex) => {
          const monthData = generateMonthCalendar(monthIndex);

          return (
            <div key={monthIndex} className="space-y-2">
              {/* Month title (only show for multi-month view) */}
              {monthsToShow > 1 && (
                <h4 className={`${fontSizeClasses.monthTitle} font-semibold text-ocean-700 text-center`}>
                  {monthData.monthName}
                </h4>
              )}

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className={`text-center ${fontSizeClasses.dayHeader} font-semibold text-ocean-600 py-1`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {monthData.days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const date = new Date(monthData.year, monthData.month, day);
                  const dateTimestamp = date.getTime();
                  const isoDate = date.toISOString().split('T')[0];
                  const isSelected = selectedDatesSet.has(isoDate);
                  const isPastDate = dateTimestamp < todayTimestamp;
                  const isTodayDate = todayDate.year === monthData.year && todayDate.month === monthData.month && todayDate.day === day;
                  const dayOfWeek = date.getDay();
                  const isWeekendDate = dayOfWeek === 0 || dayOfWeek === 6;

                  return (
                    <CalendarDay
                      key={day}
                      day={day}
                      year={monthData.year}
                      month={monthData.month}
                      isSelected={isSelected}
                      isPast={isPastDate}
                      isToday={isTodayDate}
                      isWeekend={isWeekendDate}
                      onClick={() => handleDateClick(day, monthIndex)}
                      fontSize={fontSizeClasses.dayNumber}
                      padding={fontSizeClasses.padding}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(CalendarMonthView);
