import React from 'react';

interface PeakHoursData {
  day: string;
  count: number;
}

interface PeakHoursHeatmapProps {
  data: PeakHoursData[];
  hourCounts?: Record<number, number>;
  isLoading?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7am - 10pm

export function PeakHoursHeatmap({ data, hourCounts, isLoading }: PeakHoursHeatmapProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-5 w-40 bg-gray-200 rounded mb-6" />
          <div className="h-[200px] bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  // Build a heatmap grid from data
  // data is byDayOfWeek: [{ day, count }]
  // hourCounts is peak hours: { hour: count }
  const grid: number[][] = DAYS.map(() => HOURS.map(() => 0));

  // Distribute counts across hours proportionally for each day
  if (data?.length && hourCounts) {
    const totalHourBookings = Object.values(hourCounts).reduce((s, v) => s + v, 0) || 1;
    data.forEach((d) => {
      const dayIdx = DAYS.indexOf(d.day);
      if (dayIdx === -1) return;
      HOURS.forEach((h, hIdx) => {
        const hourShare = (hourCounts[h] || 0) / totalHourBookings;
        grid[dayIdx][hIdx] = Math.round(d.count * hourShare);
      });
    });
  }

  const maxVal = Math.max(1, ...grid.flat());

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Peak Hours</h3>
      <p className="text-sm text-gray-500 mb-4">Booking density by day and hour</p>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex ml-12 mb-1">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center text-[10px] text-gray-400">
                {h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center mb-0.5">
              <div className="w-12 text-xs text-gray-500 font-medium text-right pr-2">{day}</div>
              <div className="flex flex-1 gap-0.5">
                {HOURS.map((_, hIdx) => {
                  const val = grid[dayIdx][hIdx];
                  const intensity = val / maxVal;
                  return (
                    <div
                      key={hIdx}
                      className="flex-1 aspect-square rounded-sm cursor-pointer transition-transform hover:scale-125"
                      style={{
                        backgroundColor:
                          val === 0
                            ? '#f1f5f9'
                            : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                      }}
                      title={`${day} ${HOURS[hIdx]}:00 — ${val} booking${val !== 1 ? 's' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-[10px] text-gray-400">Less</span>
            {[0.15, 0.35, 0.55, 0.75, 1].map((o, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `rgba(99, 102, 241, ${o})` }}
              />
            ))}
            <span className="text-[10px] text-gray-400">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
