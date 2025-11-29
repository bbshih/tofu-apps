import { useState } from 'react';
import Button from '../shared/Button';
import { generateCustomPattern, DaysOfWeek, getDayName } from '@seacalendar/shared';

export interface QuickAddBuilderProps {
  onDatesSelected: (dates: string[]) => void;
}

interface DayCheckbox {
  day: number;
  label: string;
  checked: boolean;
}

export default function QuickAddBuilder({ onDatesSelected }: QuickAddBuilderProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>([
    DaysOfWeek.FRIDAY,
    DaysOfWeek.SATURDAY,
    DaysOfWeek.SUNDAY,
  ]);
  const [timeRange, setTimeRange] = useState<{ months: number; count: number }>({
    months: 0,
    count: 2,
  });

  const days: DayCheckbox[] = [
    { day: DaysOfWeek.SUNDAY, label: 'Sun', checked: selectedDays.includes(DaysOfWeek.SUNDAY) },
    { day: DaysOfWeek.MONDAY, label: 'Mon', checked: selectedDays.includes(DaysOfWeek.MONDAY) },
    { day: DaysOfWeek.TUESDAY, label: 'Tue', checked: selectedDays.includes(DaysOfWeek.TUESDAY) },
    {
      day: DaysOfWeek.WEDNESDAY,
      label: 'Wed',
      checked: selectedDays.includes(DaysOfWeek.WEDNESDAY),
    },
    {
      day: DaysOfWeek.THURSDAY,
      label: 'Thu',
      checked: selectedDays.includes(DaysOfWeek.THURSDAY),
    },
    { day: DaysOfWeek.FRIDAY, label: 'Fri', checked: selectedDays.includes(DaysOfWeek.FRIDAY) },
    {
      day: DaysOfWeek.SATURDAY,
      label: 'Sat',
      checked: selectedDays.includes(DaysOfWeek.SATURDAY),
    },
  ];

  const timeRangeOptions = [
    { label: 'This month', value: { months: 0, count: 1 } },
    { label: 'Next month', value: { months: 1, count: 1 } },
    { label: 'Next 2 months', value: { months: 0, count: 2 } },
    { label: 'Next 3 months', value: { months: 0, count: 3 } },
  ];

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleAdd = () => {
    if (selectedDays.length === 0) return;

    const dates = generateCustomPattern(selectedDays, timeRange.months, timeRange.count);
    onDatesSelected(dates);
  };

  const getPreviewText = () => {
    if (selectedDays.length === 0) return 'Select days to see preview';

    const dayNames = selectedDays.map((d) => getDayName(d)).join(', ');
    const rangeLabel =
      timeRangeOptions.find(
        (opt) => opt.value.months === timeRange.months && opt.value.count === timeRange.count
      )?.label || 'selected period';

    // Calculate actual month names
    const today = new Date();
    const monthNames = [];
    for (let i = 0; i < timeRange.count; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + timeRange.months + i, 1);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });
      monthNames.push(monthName);
    }
    const monthsText = monthNames.join(', ');

    return `${dayNames} for ${rangeLabel.toLowerCase()} (${monthsText})`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-coral-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        <h3 className="font-semibold text-ocean-800">Quick Add</h3>
      </div>

      <div className="p-4 rounded-lg border-2 border-coral-200 bg-white space-y-4">
        {/* Day Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Days</label>
          <div className="flex gap-2 flex-wrap">
            {days.map(({ day, label, checked }) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                  checked
                    ? 'bg-coral-500 border-coral-600 text-white shadow-md'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-coral-400 hover:bg-coral-50'
                }`}
                aria-pressed={checked}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Range Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {timeRangeOptions.map((option) => {
              const isSelected =
                option.value.months === timeRange.months && option.value.count === timeRange.count;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setTimeRange(option.value)}
                  className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                    isSelected
                      ? 'bg-ocean-500 border-ocean-600 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-ocean-400 hover:bg-ocean-50'
                  }`}
                  aria-pressed={isSelected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-sand-100 p-3 rounded-lg border border-sand-300">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Preview:</span> {getPreviewText()}
          </p>
        </div>

        {/* Add Button */}
        <Button
          onClick={handleAdd}
          disabled={selectedDays.length === 0}
          variant="primary"
          fullWidth
        >
          Add Dates
        </Button>
      </div>
    </div>
  );
}
