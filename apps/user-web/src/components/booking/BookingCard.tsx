import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { formatDate, formatTime, formatPrice, getEndTime } from '@/lib/utils';
import type { Booking } from '@/types';
import { BookingStatus } from '@/types';

interface BookingCardProps {
  booking: Booking;
}

const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  [BookingStatus.PENDING]: { label: 'Pending', variant: 'warning' },
  [BookingStatus.PENDING_APPROVAL]: { label: 'Pending Approval', variant: 'warning' },
  [BookingStatus.CONFIRMED]: { label: 'Confirmed', variant: 'info' },
  [BookingStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'info' },
  [BookingStatus.COMPLETED]: { label: 'Completed', variant: 'success' },
  [BookingStatus.CANCELLED]: { label: 'Cancelled', variant: 'error' },
  [BookingStatus.NO_SHOW]: { label: 'No Show', variant: 'error' },
  [BookingStatus.REJECTED]: { label: 'Rejected', variant: 'error' },
};

const BookingCard: React.FC<BookingCardProps> = ({ booking }) => {
  const baseConfig = statusConfig[booking.status as BookingStatus] || statusConfig[BookingStatus.PENDING];
  const config =
    booking.status === BookingStatus.REJECTED && booking.adminNotes?.toUpperCase().includes('FAKE_USER')
      ? { label: 'Fake User', variant: 'error' as const }
      : booking.status === BookingStatus.REJECTED
        ? { label: 'Disapproved', variant: 'error' as const }
        : baseConfig;
  const totalDuration = booking.totalDurationMinutes || booking.services?.reduce((acc, bs) => acc + (bs.durationMinutes || 0), 0) || 0;
  const shouldShowCode = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS].includes(
    booking.status as BookingStatus,
  );

  return (
    <Link href={`/bookings/${booking.id}`}>
      <Card
        variant="bordered"
        className="hover:shadow-card-hover transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high overflow-hidden flex-shrink-0">
              {booking.shop?.logoUrl ? (
                <img
                  src={booking.shop.logoUrl}
                  alt={booking.shop.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary text-on-primary font-bold">
                  {booking.shop?.name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-on-surface truncate">{booking.shop?.name}</h4>
              <p className="text-sm text-on-surface-variant flex items-center mt-0.5 truncate">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{booking.shop?.address}</span>
              </p>
            </div>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>

        {/* Services */}
        <div className="text-sm text-on-surface-variant mb-3">
          {booking.services?.map((bs) => bs.serviceName).join(', ')}
        </div>

        {shouldShowCode && booking.verificationCode && (
          <div className="mb-3 rounded-xl bg-primary-container/40 dark:bg-primary-container/20 border border-primary/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Service Code</p>
            <p className="text-base font-black text-on-primary-container dark:text-on-surface tracking-[0.12em]">{booking.verificationCode}</p>
          </div>
        )}

        {/* Date & Time */}
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30">
          <div className="flex items-center gap-4 text-sm text-on-surface-variant">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(booking.startTime)}
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-outline" />
        </div>
      </Card>
    </Link>
  );
};

export { BookingCard };
