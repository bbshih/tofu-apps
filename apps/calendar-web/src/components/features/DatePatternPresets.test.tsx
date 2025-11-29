import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DatePatternPresets from './DatePatternPresets';

describe('DatePatternPresets', () => {
  it('should render all preset buttons', () => {
    const onDatesSelected = vi.fn();
    render(<DatePatternPresets onDatesSelected={onDatesSelected} />);

    expect(screen.getByRole('button', { name: /Quarterly Weekends/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next 4 Weekends/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /This Weekend/i })).toBeInTheDocument();
  });

  it('should call onDatesSelected when Quarterly Weekends is clicked', async () => {
    const user = userEvent.setup();
    const onDatesSelected = vi.fn();
    render(<DatePatternPresets onDatesSelected={onDatesSelected} />);

    const button = screen.getByRole('button', { name: /Quarterly Weekends/i });
    await user.click(button);

    expect(onDatesSelected).toHaveBeenCalledOnce();
    expect(onDatesSelected).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String)]));

    // Should have multiple dates
    const dates = onDatesSelected.mock.calls[0][0];
    expect(dates.length).toBeGreaterThan(0);
  });

  it('should call onDatesSelected when Next 4 Weekends is clicked', async () => {
    const user = userEvent.setup();
    const onDatesSelected = vi.fn();
    render(<DatePatternPresets onDatesSelected={onDatesSelected} />);

    const button = screen.getByRole('button', { name: /Next 4 Weekends/i });
    await user.click(button);

    expect(onDatesSelected).toHaveBeenCalledOnce();
    expect(onDatesSelected).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String)]));
  });

  it('should call onDatesSelected when This Weekend is clicked', async () => {
    const user = userEvent.setup();
    const onDatesSelected = vi.fn();
    render(<DatePatternPresets onDatesSelected={onDatesSelected} />);

    const button = screen.getByRole('button', { name: /This Weekend/i });
    await user.click(button);

    expect(onDatesSelected).toHaveBeenCalledOnce();
    expect(onDatesSelected).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String)]));
  });

  it('should render with Quick Patterns heading', () => {
    const onDatesSelected = vi.fn();
    render(<DatePatternPresets onDatesSelected={onDatesSelected} />);

    expect(screen.getByText('Quick Patterns')).toBeInTheDocument();
  });
});
