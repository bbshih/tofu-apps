import type { DateOption } from '../../types/local';
import { groupDatesByMonth } from '../../utils/dateGrouping';

interface DateListViewProps {
  dateOptions: DateOption[];
  onRemoveDate: (dateId: string) => void;
}

export default function DateListView({
  dateOptions,
  onRemoveDate,
}: DateListViewProps) {
  // Group dates by month using shared utility
  const groupedByMonth = groupDatesByMonth(dateOptions);

  return (
    <div className="space-y-6">
      {groupedByMonth.map((monthGroup) => (
        <div key={monthGroup.month}>
          {/* Month Header */}
          <h3 className="text-lg font-bold text-primary-700 mb-3">
            {monthGroup.month} ({monthGroup.dates.length} {monthGroup.dates.length === 1 ? 'date' : 'dates'})
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
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthGroup.dates.map((dateInfo) => {
                  const isWeekend = ['Sat', 'Sun'].includes(dateInfo.dayOfWeek);

                  return (
                    <tr
                      key={dateInfo.dateOption.id}
                      className={`border-t border-primary-200 transition-colors ${
                        isWeekend
                          ? 'bg-light-100 hover:bg-light-200'
                          : 'bg-white hover:bg-primary-50'
                      }`}
                    >
                      {/* Day of Week */}
                      <td
                        className={`px-4 py-3 border-r border-primary-200 font-medium ${
                          isWeekend ? 'text-accent-600' : 'text-gray-700'
                        }`}
                      >
                        {dateInfo.dayOfWeek}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 border-r border-primary-200 text-gray-800">
                        {dateInfo.dateOption.label}
                      </td>

                      {/* Remove Button */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onRemoveDate(dateInfo.dateOption.id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-300 rounded-lg transition-colors cursor-pointer"
                          aria-label="Remove date"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Remove
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
