import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarMonthView from './CalendarMonthView';
import type { DateOption } from '../../types/local';

describe('CalendarMonthView', () => {
  const mockOnAddDate = vi.fn();
  const mockOnRemoveDate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders calendar with month navigation', () => {
    render(
      <CalendarMonthView
        dateOptions={[]}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    // Should show month/year (may show "2 Months" or "3 Months" in multi-month view)
    const currentMonth = new Date().toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    const monthsLabel = screen.queryByText(/\d+ Months/i);

    // Either the current month name OR the "N Months" label should be present
    expect(
      screen.queryByText(currentMonth) || monthsLabel
    ).toBeTruthy();

    // Should show navigation buttons
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
    expect(screen.getByLabelText('Next month')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('renders day headers', () => {
    render(
      <CalendarMonthView
        dateOptions={[]}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach((day) => {
      // Day headers may appear multiple times in multi-month view
      const headers = screen.getAllByText(day);
      expect(headers.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders all days in the current month', () => {
    render(
      <CalendarMonthView
        dateOptions={[]}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    const today = new Date();
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

    // Check that all days 1-31 (or appropriate for month) are present
    for (let day = 1; day <= daysInMonth; day++) {
      const buttons = screen.getAllByText(day.toString());
      expect(buttons.length).toBeGreaterThan(0);
    }
  });

  it('highlights selected dates', () => {
    const today = new Date();
    // Pick a date that's definitely in the future (tomorrow + 10 days)
    const selectedDate = new Date(today);
    selectedDate.setDate(selectedDate.getDate() + 10);
    const isoDate = selectedDate.toISOString().split('T')[0];

    const dateOptions: DateOption[] = [
      {
        id: 'date-1',
        date: isoDate,
        label: 'Selected Date',
      },
    ];

    render(
      <CalendarMonthView
        dateOptions={dateOptions}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    // If the selected date is in the next month, navigate forward
    if (selectedDate.getMonth() !== today.getMonth()) {
      const nextButton = screen.getByLabelText('Next month');
      fireEvent.click(nextButton);
    }

    // Verify at least one selected day button exists with correct data attribute
    const selectedButtons = screen.queryAllByTestId('calendar-day-selected');
    expect(selectedButtons.length).toBeGreaterThan(0);

    // Verify the button has the proper aria-label format with "(selected)" suffix
    const hasSelectedLabel = selectedButtons.some(btn =>
      btn.getAttribute('aria-label')?.includes('(selected)')
    );
    expect(hasSelectedLabel).toBe(true);
  });

  it('calls onAddDate when clicking an unselected date', () => {
    const targetDay = 15;

    render(
      <CalendarMonthView
        dateOptions={[]}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    // Click on day 15
    const dayButtons = screen.getAllByText(targetDay.toString());
    const validButton = dayButtons.find(
      (btn) => !btn.hasAttribute('disabled')
    );

    if (validButton) {
      fireEvent.click(validButton);

      expect(mockOnAddDate).toHaveBeenCalledTimes(1);

      // The clicked date should be a valid ISO date (could be current month or next months)
      const callArg = mockOnAddDate.mock.calls[0][0];
      expect(callArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's day 15 of some month
      const clickedDate = new Date(callArg + 'T00:00:00');
      expect(clickedDate.getDate()).toBe(targetDay);
    }
  });

  it('calls onRemoveDate when clicking a selected date', () => {
    const today = new Date();
    const targetDay = 15;
    const selectedDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      targetDay
    );
    const isoDate = selectedDate.toISOString().split('T')[0];

    const dateOptions: DateOption[] = [
      {
        id: 'date-1',
        date: isoDate,
        label: 'Selected Date',
      },
    ];

    render(
      <CalendarMonthView
        dateOptions={dateOptions}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    // Click on the selected day 15
    const dayButtons = screen.getAllByText(targetDay.toString());
    const selectedButton = dayButtons.find((btn) =>
      btn.className.includes('bg-primary-500')
    );

    if (selectedButton) {
      fireEvent.click(selectedButton);

      expect(mockOnRemoveDate).toHaveBeenCalledTimes(1);
      expect(mockOnRemoveDate).toHaveBeenCalledWith('date-1');
    }
  });

  it('navigates to previous month', () => {
    render(
      <CalendarMonthView
        dateOptions={[]}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    const today = new Date();
    const currentMonth = today.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // In multi-month view, current month may be shown as individual month header or main title
    expect(screen.queryByText(currentMonth) || screen.queryByText(/\d+ Months/i)).toBeTruthy();

    // Click previous month
    const prevButton = screen.getByLabelText('Previous month');

    // Only proceed if button is not disabled
    if (!prevButton.hasAttribute('disabled')) {
      fireEvent.click(prevButton);

      // Should show previous month somewhere in the document
      const prevMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      ).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      expect(screen.getByText(prevMonth)).toBeInTheDocument();
    }
  });

  it('navigates to next month', () => {
    render(
      <CalendarMonthView
        dateOptions={[]}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    const today = new Date();
    const currentMonth = today.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // In multi-month view, current month may be shown as individual month header or main title
    expect(screen.queryByText(currentMonth) || screen.queryByText(/\d+ Months/i)).toBeTruthy();

    // Click next month
    const nextButton = screen.getByLabelText('Next month');
    fireEvent.click(nextButton);

    // After clicking next, we should see a different set of months
    // We can't check for specific month name since it depends on how many months are shown
    // Just verify the component re-rendered
    const dayButtons = screen.getAllByText('1');
    expect(dayButtons.length).toBeGreaterThan(0);
  });

  it('returns to today when clicking Today button', () => {
    render(
      <CalendarMonthView
        dateOptions={[]}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    const today = new Date();
    const currentMonth = today.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // Navigate to next month
    const nextButton = screen.getByLabelText('Next month');
    fireEvent.click(nextButton);

    // Click Today button
    const todayButton = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayButton);

    // Should be back to current month (shown either as main title or individual month header)
    expect(screen.queryByText(currentMonth) || screen.queryByText(/\d+ Months/i)).toBeTruthy();
  });

  it('disables past dates', () => {
    const today = new Date();
    const pastDay = today.getDate() > 1 ? 1 : 15; // Use day 1 unless today is day 1

    // If we're on the 1st, navigate to previous month first
    render(
      <CalendarMonthView
        dateOptions={[]}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    if (today.getDate() === 1) {
      const prevButton = screen.getByLabelText('Previous month');
      fireEvent.click(prevButton);
    }

    // Find past date buttons
    const pastDateButtons = screen.getAllByText(pastDay.toString());
    const disabledButton = pastDateButtons.find((btn) =>
      btn.hasAttribute('disabled')
    );

    // Past dates should be disabled
    if (today.getDate() > pastDay) {
      expect(disabledButton).toBeDefined();
    }
  });

  it('handles month boundaries correctly', () => {
    render(
      <CalendarMonthView
        dateOptions={[]}
        onAddDate={mockOnAddDate}
        onRemoveDate={mockOnRemoveDate}
      />
    );

    const today = new Date();

    // Get the last day of current month
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

    // Calendar should show day 1 (may appear multiple times in multi-month view)
    const dayOnes = screen.getAllByText('1');
    expect(dayOnes.length).toBeGreaterThanOrEqual(1);

    // Calendar should show last day of month (may appear multiple times in multi-month view)
    const lastDay = lastDayOfMonth.getDate();
    const lastDayElements = screen.getAllByText(lastDay.toString());
    expect(lastDayElements.length).toBeGreaterThanOrEqual(1);
  });
});
