import type { DateOption } from '../../types/local';
import { groupDatesByMonth } from '../../utils/dateGrouping';

interface DateCalendarViewProps {
  dateOptions: DateOption[];
  selectedDates: string[];
  onToggleDate: (dateId: string) => void;
}

export default function DateCalendarView({
  dateOptions,
  selectedDates,
  onToggleDate,
}: DateCalendarViewProps) {
  // Group dates by month using shared utility
  const groupedByMonth = groupDatesByMonth(dateOptions);

  return (
    <div className="space-y-6">
      {groupedByMonth.map((monthGroup) => (
        <div key={monthGroup.month}>
          {/* Month Header */}
          <h3 className="text-lg font-bold text-primary-700 mb-3">
            {monthGroup.month}
          </h3>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full border-2 border-primary-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-primary-100">
                  <th className="px-4 py-2 text-left text-sm font-semibold text-primary-800 border-r border-primary-200">
                    Day
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-primary-800 border-r border-primary-200">
                    Date
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-primary-800">
                    Available?
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthGroup.dates.map((dateInfo, _index) => {
                  const isSelected = selectedDates.includes(dateInfo.dateOption.id);
                  const isWeekend = ['Sat', 'Sun'].includes(dateInfo.dayOfWeek);

                  return (
                    <tr
                      key={dateInfo.dateOption.id}
                      className={`border-t border-primary-200 transition-colors ${
                        isSelected
                          ? 'bg-primary-500 hover:bg-primary-600'
                          : isWeekend
                          ? 'bg-light-100 hover:bg-light-200'
                          : 'bg-white hover:bg-primary-50'
                      }`}
                    >
                      {/* Day of Week */}
                      <td
                        className={`px-4 py-3 border-r border-primary-200 font-medium ${
                          isSelected
                            ? 'text-white'
                            : isWeekend
                            ? 'text-accent-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {dateInfo.dayOfWeek}
                      </td>

                      {/* Date */}
                      <td
                        className={`px-4 py-3 border-r border-primary-200 ${
                          isSelected ? 'text-white font-semibold' : 'text-gray-800'
                        }`}
                      >
                        {dateInfo.dateOption.label}
                      </td>

                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onToggleDate(dateInfo.dateOption.id)}
                          className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                            isSelected
                              ? 'bg-white text-primary-600 hover:bg-primary-50'
                              : 'bg-primary-500 text-white hover:bg-primary-600'
                          }`}
                        >
                          {isSelected ? '✓ Available' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
