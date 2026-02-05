import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import type { Staff } from '@overline/shared';

interface StaffPickerProps {
  staff: Staff[];
  selectedStaff: Staff | null;
  onSelectStaff: (staff: Staff | null) => void;
  allowAny?: boolean;
}

const StaffPicker: React.FC<StaffPickerProps> = ({
  staff,
  selectedStaff,
  onSelectStaff,
  allowAny = true,
}) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {allowAny && (
        <button
          onClick={() => onSelectStaff(null)}
          className={cn(
            'flex flex-col items-center gap-2 p-3 rounded-xl border-2 min-w-[80px] transition-all',
            !selectedStaff
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 text-sm font-medium">Any</span>
          </div>
          <span className="text-sm font-medium text-gray-700">
            No Preference
          </span>
        </button>
      )}

      {staff.map((person) => (
        <button
          key={person.id}
          onClick={() => onSelectStaff(person)}
          className={cn(
            'flex flex-col items-center gap-2 p-3 rounded-xl border-2 min-w-[80px] transition-all',
            selectedStaff?.id === person.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <Avatar
            src={person.avatarUrl}
            name={person.name}
            size="lg"
          />
          <span className="text-sm font-medium text-gray-700 text-center">
            {person.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export { StaffPicker };
