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
    const timePart = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr;
    const [h, m] = timePart.split(':').map(Number);
    return h * 60 + m;
  };

  const formatSlotTime = (isoStr: string) => {
    if (!isoStr) return '';
    const timePart = isoStr.includes('T') ? isoStr.split('T')[1] : isoStr;
    const [hStr, mStr] = timePart.split(':');
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return isoStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH.toString().padStart(2, '0')}:${mStr || '00'} ${ampm}`;
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
        
        const periodConfig = {
          Morning: {
            borderColor: 'border-l-amber-300',
            iconBg: 'bg-amber-50',
            sunFill: '#D4D4D4',
            rayStroke: '#BFBFBF',
            subLabel: 'Before 12 PM',
          },
          Afternoon: {
            borderColor: 'border-l-neutral-400',
            iconBg: 'bg-neutral-100',
            sunFill: '#A3A3A3',
            rayStroke: '#8C8C8C',
            subLabel: '12 — 5 PM',
          },
          Evening: {
            borderColor: 'border-l-neutral-600',
            iconBg: 'bg-neutral-100',
            sunFill: '',
            rayStroke: '',
            subLabel: 'After 5 PM',
          },
        }[period] || { borderColor: '', iconBg: '', sunFill: '', rayStroke: '', subLabel: '' };

        const SunIcon = ({ fill, stroke }: { fill: string; stroke: string }) => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="5" fill={fill} />
            {[0,45,90,135,180,225,270,315].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <line
                  key={angle}
                  x1={12 + 7.5 * Math.cos(rad)}
                  y1={12 + 7.5 * Math.sin(rad)}
                  x2={12 + 10 * Math.cos(rad)}
                  y2={12 + 10 * Math.sin(rad)}
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        );

        const MoonIcon = () => (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.9-.35 4.15-1A7 7 0 0 1 12 3z" fill="#737373" />
          </svg>
        );

        return (
          <div key={period} className={`space-y-3 border-l-[3px] ${periodConfig.borderColor} pl-4 rounded-r-xl`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-[10px] ${periodConfig.iconBg} flex items-center justify-center`}>
                {period === 'Evening' ? <MoonIcon /> : <SunIcon fill={periodConfig.sunFill} stroke={periodConfig.rayStroke} />}
              </div>
              <div>
                <h4 className="text-sm font-black text-on-surface leading-tight">{period}</h4>
                <p className="text-[10px] text-on-surface-variant font-medium">{periodConfig.subLabel}</p>
              </div>
            </div>
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
                    {formatSlotTime(slot.startTime)}
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
