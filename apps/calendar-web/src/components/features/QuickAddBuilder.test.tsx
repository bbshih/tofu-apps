import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickAddBuilder from './QuickAddBuilder';

describe('QuickAddBuilder', () => {
  it('should render with all day checkboxes', () => {
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    // Check all 7 days are rendered
    expect(screen.getByRole('button', { name: 'Sun' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mon' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fri' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sat' })).toBeInTheDocument();
  });

  it('should have Fri, Sat, Sun selected by default', () => {
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    // Default selection is Fri-Sun
    expect(screen.getByRole('button', { name: 'Fri', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sat', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sun', pressed: true })).toBeInTheDocument();
  });

  it('should toggle day selection when clicked', async () => {
    const user = userEvent.setup();
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    const monButton = screen.getByRole('button', { name: 'Mon' });

    // Initially not selected
    expect(monButton).toHaveAttribute('aria-pressed', 'false');

    // Click to select
    await user.click(monButton);
    expect(monButton).toHaveAttribute('aria-pressed', 'true');

    // Click to deselect
    await user.click(monButton);
    expect(monButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('should render all time range options', () => {
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    expect(screen.getByRole('button', { name: 'This month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next 2 months' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next 3 months' })).toBeInTheDocument();
  });

  it('should have "Next 2 months" selected by default', () => {
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    expect(
      screen.getByRole('button', { name: 'Next 2 months', pressed: true })
    ).toBeInTheDocument();
  });

  it('should change time range when clicked', async () => {
    const user = userEvent.setup();
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    const thisMonthButton = screen.getByRole('button', { name: 'This month' });

    // Click to select this month
    await user.click(thisMonthButton);
    expect(thisMonthButton).toHaveAttribute('aria-pressed', 'true');

    // Next 2 months should be deselected
    expect(screen.getByRole('button', { name: 'Next 2 months' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('should show preview of selected days and time range', () => {
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    // Default preview should show Fri, Sat, Sun for next 2 months with month names in parentheses
    expect(screen.getByText(/Fri, Sat, Sun for next 2 months \([^)]+\)/i)).toBeInTheDocument();
  });

  it('should call onDatesSelected when Add Dates is clicked', async () => {
    const user = userEvent.setup();
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    const addButton = screen.getByRole('button', { name: 'Add Dates' });
    await user.click(addButton);

    expect(onDatesSelected).toHaveBeenCalledOnce();
    expect(onDatesSelected).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String)]));

    // Should have dates
    const dates = onDatesSelected.mock.calls[0][0];
    expect(dates.length).toBeGreaterThan(0);
  });

  it('should disable Add button when no days are selected', async () => {
    const user = userEvent.setup();
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    // Deselect all days
    await user.click(screen.getByRole('button', { name: 'Fri' }));
    await user.click(screen.getByRole('button', { name: 'Sat' }));
    await user.click(screen.getByRole('button', { name: 'Sun' }));

    const addButton = screen.getByRole('button', { name: 'Add Dates' });
    expect(addButton).toBeDisabled();
  });

  it('should update preview when days are changed', async () => {
    const user = userEvent.setup();
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    // Add Monday (default is Fri=5, Sat=6, Sun=0)
    await user.click(screen.getByRole('button', { name: 'Mon' }));

    // Preview should now include Monday (days sorted: Sun=0, Mon=1, Fri=5, Sat=6) with month names
    expect(screen.getByText(/Sun, Mon, Fri, Sat for next 2 months \([^)]+\)/i)).toBeInTheDocument();
  });

  it('should update preview when time range is changed', async () => {
    const user = userEvent.setup();
    const onDatesSelected = vi.fn();
    render(<QuickAddBuilder onDatesSelected={onDatesSelected} />);

    // Change to "This month"
    await user.click(screen.getByRole('button', { name: 'This month' }));

    // Preview should show "this month" with month name in parentheses
    expect(screen.getByText(/Fri, Sat, Sun for this month \([^)]+\)/i)).toBeInTheDocument();
  });
});
