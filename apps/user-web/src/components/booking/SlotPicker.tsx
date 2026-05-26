import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui';
import type { TimeSlot } from '@/types';
import { Clock } from 'lucide-react';

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
        <span className="ml-3 text-on-surface-variant">Loading available times...</span>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/30">
        <p className="text-on-surface-variant font-medium">No available time for this date.</p>
        <p className="text-sm text-outline mt-1">
          Please try a different date or staff member.
        </p>
      </div>
    );
  }

  // Filter only available slots or show them all but disabled if unavailable
  const availableSlots = slots.filter(s => s.available);

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-12 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/30">
        <p className="text-on-surface-variant font-medium">All slots are fully booked for this date.</p>
        <p className="text-sm text-outline mt-1">
          Please try a different date.
        </p>
      </div>
    );
  }

  // Group slots by time of day (Morning, Afternoon, Evening)
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const groupedSlots = {
    Morning: availableSlots.filter(s => timeToMinutes(s.startTime) < 720), // Before 12:00 PM
    Afternoon: availableSlots.filter(s => timeToMinutes(s.startTime) >= 720 && timeToMinutes(s.startTime) < 1020), // 12:00 PM - 5:00 PM
    Evening: availableSlots.filter(s => timeToMinutes(s.startTime) >= 1020), // After 5:00 PM
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedSlots).map(([period, periodSlots]) => {
        if (periodSlots.length === 0) return null;
        
        return (
          <div key={period} className="space-y-3">
            <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {period}
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {periodSlots.map((slot, index) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                return (
                  <button
                    key={`${slot.startTime}-${index}`}
                    onClick={() => onSelectSlot(slot)}
                    className={cn(
                      "px-3 py-2.5 rounded-xl text-sm font-black transition-all duration-200 border",
                      isSelected
                        ? "bg-primary text-on-primary border-primary shadow-md shadow-primary/20 scale-[1.02]"
                        : "bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-primary/40 hover:bg-surface-container"
                    )}
                  >
                    {slot.startTime}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { SlotPicker };
