import React from 'react';
import { Calendar, Clock, MapPin, User, ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui';
import { formatDate, formatTime, formatPrice, formatDuration, getEndTime } from '@/lib/utils';
import { useBookingStore } from '@/stores/booking';

interface BookingSummaryProps {
  showPrice?: boolean;
  /**
   * The shop the user is currently *viewing* (independent of cart state).
   * When the cart is empty we render an empty-state placeholder pointing
   * at this shop so the desktop sidebar doesn't appear as a blank
   * rectangle. Optional — without it we fall back to `null` and let the
   * parent decide.
   */
  currentShop?: { id?: string; name?: string; logoUrl?: string | null; address?: string | null } | null;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({ showPrice = true, currentShop }) => {
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

  // Empty-state: nothing in cart yet. Show a friendly prompt anchored to
  // the shop the user is viewing so the sidebar doesn't look broken.
  if (!shop) {
    if (!currentShop) return null;
    return (
      <Card variant="bordered" className="sticky top-4">
        <div className="flex flex-col items-center text-center py-6 px-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ShoppingBag className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-black text-on-surface mb-1">Your booking will appear here</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">
            Pick one or more services from {currentShop.name || 'this shop'} to start your booking.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="bordered" className="sticky top-4">
      <h3 className="font-semibold text-on-surface mb-4">Booking Summary</h3>

      {/* Shop Info */}
      <div className="flex items-start gap-3 pb-4 border-b border-outline-variant/20">
        <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
          {shop.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary text-on-primary font-bold">
              {shop.name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h4 className="font-medium text-on-surface">{shop.name}</h4>
          <p className="text-sm text-on-surface-variant flex items-center mt-0.5">
            <MapPin className="w-3 h-3 mr-1" />
            {shop.address}
          </p>
        </div>
      </div>

      {/* Selected Services */}
      {selectedServices.length > 0 && (
        <div className="py-4 border-b border-outline-variant/20">
          <h4 className="text-sm font-medium text-on-surface-variant mb-2">Services</h4>
          <div className="space-y-2">
            {selectedServices.map((service) => (
              <div key={service.id} className="flex justify-between text-sm">
                <span className="text-on-surface">{service.name}</span>
                <span className="text-on-surface-variant">{formatDuration(service.durationMinutes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff */}
      {selectedStaff && (
        <div className="py-4 border-b border-outline-variant/20">
          <h4 className="text-sm font-medium text-on-surface-variant mb-2">Staff</h4>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-outline" />
            <span className="text-sm text-on-surface">{selectedStaff.name}</span>
          </div>
        </div>
      )}

      {/* Date & Time */}
      {selectedDate && selectedSlot && (
        <div className="py-4 border-b border-outline-variant/20">
          <h4 className="text-sm font-medium text-on-surface-variant mb-2">Date & Time</h4>
          <div className="flex items-center gap-2 text-sm text-on-surface mb-1">
            <Calendar className="w-4 h-4 text-outline" />
            <span>{formatDate(selectedDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-on-surface">
            <Clock className="w-4 h-4 text-outline" />
            <span>
              {formatTime(selectedSlot.startTime)} -{' '}
              {formatTime(getEndTime(selectedSlot.startTime, totalDuration))}
            </span>
          </div>
        </div>
      )}

      {/* Total & Offers */}
      {showPrice && selectedServices.length > 0 && (
        <div className="pt-4">
          <p className="text-xs text-on-surface-variant mb-4">
            Discounts and promo campaigns are applied automatically when available.
          </p>

          <div className="flex justify-between items-center">
            <span className="font-medium text-on-surface">Total</span>
            <div className="text-right">
              <span className="text-xl font-bold text-on-surface">
                {formatPrice(totalPrice)}
              </span>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Duration: {formatDuration(totalDuration)}
          </p>
        </div>
      )}
    </Card>
  );
};

export { BookingSummary };
