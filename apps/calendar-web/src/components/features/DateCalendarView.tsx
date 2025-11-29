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
          <h3 className="text-lg font-bold text-ocean-700 mb-3">
            {monthGroup.month}
          </h3>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full border-2 border-ocean-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-ocean-100">
                  <th className="px-4 py-2 text-left text-sm font-semibold text-ocean-800 border-r border-ocean-200">
                    Day
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-ocean-800 border-r border-ocean-200">
                    Date
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-ocean-800">
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
                      className={`border-t border-ocean-200 transition-colors ${
                        isSelected
                          ? 'bg-ocean-500 hover:bg-ocean-600'
                          : isWeekend
                          ? 'bg-sand-100 hover:bg-sand-200'
                          : 'bg-white hover:bg-ocean-50'
                      }`}
                    >
                      {/* Day of Week */}
                      <td
                        className={`px-4 py-3 border-r border-ocean-200 font-medium ${
                          isSelected
                            ? 'text-white'
                            : isWeekend
                            ? 'text-coral-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {dateInfo.dayOfWeek}
                      </td>

                      {/* Date */}
                      <td
                        className={`px-4 py-3 border-r border-ocean-200 ${
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
                              ? 'bg-white text-ocean-600 hover:bg-ocean-50'
                              : 'bg-ocean-500 text-white hover:bg-ocean-600'
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
