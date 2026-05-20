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
        <span className="ml-3 text-gray-500">Loading available times...</span>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No available time for this date.</p>
        <p className="text-sm text-gray-400 mt-1">
          Please try a different date or staff member.
        </p>
      </div>
    );
  }

  // Parse time to minutes since midnight for calculations
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const startOfDayMinutes = timeToMinutes(slots[0].startTime);
  const endOfDayMinutes = timeToMinutes(slots[slots.length - 1].endTime);
  const totalDayMinutes = endOfDayMinutes - startOfDayMinutes;

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value; // "HH:mm"
    if (!timeValue) return;

    // Find the slot that matches this time
    const exactSlot = slots.find((s) => s.startTime === timeValue);
    if (exactSlot) {
      onSelectSlot(exactSlot);
    }
  };

  // Group continuous slots for timeline
  const timelineBlocks: { startMin: number; duration: number; available: boolean; startTimeStr: string }[] = [];
  let currentBlock = null;

  for (const slot of slots) {
    if (!currentBlock) {
      currentBlock = {
        startMin: timeToMinutes(slot.startTime),
        duration: timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime),
        available: slot.available,
        startTimeStr: slot.startTime,
      };
    } else if (currentBlock.available === slot.available) {
      currentBlock.duration += timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
    } else {
      timelineBlocks.push(currentBlock);
      currentBlock = {
        startMin: timeToMinutes(slot.startTime),
        duration: timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime),
        available: slot.available,
        startTimeStr: slot.startTime,
      };
    }
  }
  if (currentBlock) timelineBlocks.push(currentBlock);

  // Selected time in minutes (for indicator line)
  const selectedMinutes = selectedSlot ? timeToMinutes(selectedSlot.startTime) : null;
  const selectedPct = selectedMinutes !== null ? ((selectedMinutes - startOfDayMinutes) / totalDayMinutes) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
        <h4 className="text-sm font-bold text-on-surface mb-3 flex items-center justify-between">
          <span>Staff Availability</span>
          <span className="text-xs font-normal text-on-surface-variant">{slots[0].startTime} - {slots[slots.length-1].endTime}</span>
        </h4>
        
        {/* Timeline Bar */}
        <div className="relative h-8 w-full bg-surface-container-high rounded-md overflow-hidden flex">
          {timelineBlocks.map((block, i) => {
            const widthPct = (block.duration / totalDayMinutes) * 100;
            return (
              <div
                key={i}
                title={`${block.startTimeStr} (${block.available ? 'Free' : 'Busy'})`}
                onClick={() => {
                  if (block.available) {
                    const slot = slots.find(s => s.startTime === block.startTimeStr);
                    if (slot) onSelectSlot(slot);
                  }
                }}
                className={cn(
                  "h-full transition-colors cursor-pointer border-r border-surface-container-low last:border-r-0",
                  block.available ? "bg-primary/20 hover:bg-primary/40" : "bg-error/20 cursor-not-allowed opacity-50 striped-bg"
                )}
                style={{ width: `${widthPct}%` }}
              />
            );
          })}
          
          {/* Selected indicator */}
          {selectedPct !== null && (
            <div 
              className="absolute top-0 bottom-0 w-1 bg-primary rounded-full shadow-lg transform -translate-x-1/2 z-10 transition-all"
              style={{ left: `${selectedPct}%` }}
            />
          )}
        </div>
        
        <div className="flex justify-between mt-2 text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary/40" /> Free</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-error/40" /> Busy</div>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold text-on-surface block mb-2">Select Time</label>
        <div className="relative max-w-xs">
          <input
            type="time"
            value={selectedSlot?.startTime || ''}
            onChange={handleTimeChange}
            className="input-m3 w-full appearance-none bg-surface-container text-lg font-medium text-center"
            step="300" // 5-minute intervals
          />
        </div>
        {selectedSlot && !selectedSlot.available && (
          <p className="text-error text-xs mt-2 font-medium">This time is currently busy. Please select a free slot from the timeline above.</p>
        )}
        {selectedSlot && selectedSlot.available && (
          <p className="text-success text-xs mt-2 font-medium">Selected time is available!</p>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .striped-bg {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 5px,
            rgba(0,0,0,0.05) 5px,
            rgba(0,0,0,0.05) 10px
          );
        }
        .dark .striped-bg {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 5px,
            rgba(255,255,255,0.05) 5px,
            rgba(255,255,255,0.05) 10px
          );
        }
      `}} />
    </div>
  );
};

export { SlotPicker };
