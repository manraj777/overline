import React from 'react';
import { Calendar, Clock, MapPin, User, CreditCard } from 'lucide-react';
import { Card } from '@/components/ui';
import { formatDate, formatTime, formatPrice, formatDuration, getEndTime } from '@/lib/utils';
import { useBookingStore } from '@/stores/booking';

interface BookingSummaryProps {
  showPrice?: boolean;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({ showPrice = true }) => {
  const {
    shop,
    selectedServices,
    selectedStaff,
    selectedDate,
    selectedSlot,
    getTotalDuration,
    getTotalPrice,
  } = useBookingStore();

  const totalDuration = getTotalDuration();
  const totalPrice = getTotalPrice();

  if (!shop) return null;

  return (
    <Card variant="bordered" className="sticky top-4">
      <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>

      {/* Shop Info */}
      <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
          {shop.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white font-bold">
              {shop.name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{shop.name}</h4>
          <p className="text-sm text-gray-500 flex items-center mt-0.5">
            <MapPin className="w-3 h-3 mr-1" />
            {shop.address}
          </p>
        </div>
      </div>

      {/* Selected Services */}
      {selectedServices.length > 0 && (
        <div className="py-4 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Services</h4>
          <div className="space-y-2">
            {selectedServices.map((service) => (
              <div key={service.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{service.name}</span>
                <span className="text-gray-500">{formatDuration(service.durationMinutes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff */}
      {selectedStaff && (
        <div className="py-4 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Staff</h4>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">{selectedStaff.name}</span>
          </div>
        </div>
      )}

      {/* Date & Time */}
      {selectedDate && selectedSlot && (
        <div className="py-4 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Date & Time</h4>
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDate(selectedDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              {formatTime(selectedSlot.startTime)} -{' '}
              {formatTime(getEndTime(selectedSlot.startTime, totalDuration))}
            </span>
          </div>
        </div>
      )}

      {/* Total */}
      {showPrice && selectedServices.length > 0 && (
        <div className="pt-4">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Duration: {formatDuration(totalDuration)}
          </p>
        </div>
      )}
    </Card>
  );
};

export { BookingSummary };
