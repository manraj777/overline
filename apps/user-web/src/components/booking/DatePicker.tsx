import React from 'react';
import { format, addDays, isSameDay, isToday, isTomorrow } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  maxDays?: number;
}

const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onSelectDate,
  minDate = new Date(),
  maxDays = 14,
}) => {
  const [startIndex, setStartIndex] = React.useState(0);
  const visibleDays = 7;

  const dates = Array.from({ length: maxDays }, (_, i) => addDays(minDate, i));

  const handlePrev = () => {
    setStartIndex(Math.max(0, startIndex - visibleDays));
  };

  const handleNext = () => {
    setStartIndex(Math.min(dates.length - visibleDays, startIndex + visibleDays));
  };

  const visibleDates = dates.slice(startIndex, startIndex + visibleDays);

  const formatDayLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE');
  };

  return (
    <div className="relative">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrev}
          disabled={startIndex === 0}
          className="p-2 rounded-full hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed text-on-surface"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-medium text-on-surface">
          {format(visibleDates[0], 'MMMM yyyy')}
        </span>
        <button
          onClick={handleNext}
          disabled={startIndex >= dates.length - visibleDays}
          className="p-2 rounded-full hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed text-on-surface"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Date Grid */}
      <div className="grid grid-cols-7 gap-2">
        {visibleDates.map((date) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={cn(
                'flex flex-col items-center py-3 rounded-xl transition-all',
                isSelected
                  ? 'bg-primary text-on-primary'
                  : 'hover:bg-surface-container-high text-on-surface'
              )}
            >
              <span
                className={cn(
                  'text-xs mb-1',
                  isSelected ? 'text-on-primary/80' : 'text-on-surface-variant'
                )}
              >
                {formatDayLabel(date)}
              </span>
              <span className="text-lg font-semibold">{format(date, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { DatePicker };
