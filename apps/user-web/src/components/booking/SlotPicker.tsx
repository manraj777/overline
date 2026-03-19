import React from 'react';
import { cn, formatTime } from '@/lib/utils';
import { Spinner } from '@/components/ui';
import type { TimeSlot } from '@/types';

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-3 text-gray-500">Loading available slots...</span>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No available slots for this date.</p>
        <p className="text-sm text-gray-400 mt-1">
          Please try a different date or staff member.
        </p>
      </div>
    );
  }

  // Group slots by period (morning, afternoon, evening)
  const groupSlots = (slots: TimeSlot[]) => {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    slots.forEach((slot) => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      if (hour < 12) morning.push(slot);
      else if (hour < 17) afternoon.push(slot);
      else evening.push(slot);
    });

    return { morning, afternoon, evening };
  };

  const grouped = groupSlots(slots);

  const renderGroup = (title: string, groupSlots: TimeSlot[]) => {
    if (groupSlots.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-500 mb-3">{title}</h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {groupSlots.map((slot) => {
            const isSelected = selectedSlot?.startTime === slot.startTime;
            const isBooked = !slot.available;

            return (
              <div
                key={slot.startTime}
                className={cn(
                  'rounded-lg border p-2 text-center transition-all',
                  isBooked
                    ? 'border-gray-300 bg-gray-100'
                    : isSelected
                      ? 'border-green-500 bg-green-100'
                      : 'border-green-200 bg-green-50'
                )}
              >
                <div className={cn('text-sm font-semibold', isBooked ? 'text-gray-600' : 'text-green-700')}>
                  {formatTime(slot.startTime)}
                </div>
                {isBooked ? (
                  <div className="mt-1 text-xs font-medium text-gray-500">Booked</div>
                ) : (
                  <button
                    onClick={() => onSelectSlot(slot)}
                    className={cn(
                      'mt-2 w-full rounded-md px-2 py-1 text-xs font-semibold transition',
                      isSelected
                        ? 'bg-green-700 text-white hover:bg-green-800'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    )}
                  >
                    Book
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderGroup('Morning', grouped.morning)}
      {renderGroup('Afternoon', grouped.afternoon)}
      {renderGroup('Evening', grouped.evening)}
    </div>
  );
};

export { SlotPicker };
