import React from 'react';
import { cn, formatTime } from '@/lib/utils';
import { Spinner } from '@/components/ui';
import type { TimeSlot } from '@overline/shared';

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

            return (
              <button
                key={slot.startTime}
                onClick={() => onSelectSlot(slot)}
                disabled={!slot.available}
                className={cn(
                  'py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : slot.available
                    ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                )}
              >
                {formatTime(slot.startTime)}
              </button>
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
