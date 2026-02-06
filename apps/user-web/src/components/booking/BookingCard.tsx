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
  [BookingStatus.CONFIRMED]: { label: 'Confirmed', variant: 'info' },
  [BookingStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'info' },
  [BookingStatus.COMPLETED]: { label: 'Completed', variant: 'success' },
  [BookingStatus.CANCELLED]: { label: 'Cancelled', variant: 'error' },
  [BookingStatus.NO_SHOW]: { label: 'No Show', variant: 'error' },
  [BookingStatus.REJECTED]: { label: 'Rejected', variant: 'error' },
};

const BookingCard: React.FC<BookingCardProps> = ({ booking }) => {
  const config = statusConfig[booking.status as BookingStatus] || statusConfig[BookingStatus.PENDING];
  const totalDuration = booking.totalDurationMinutes || booking.services?.reduce((acc, bs) => acc + (bs.durationMinutes || 0), 0) || 0;

  return (
    <Link href={`/bookings/${booking.id}`}>
      <Card
        variant="bordered"
        className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
              {booking.shop?.logoUrl ? (
                <img
                  src={booking.shop.logoUrl}
                  alt={booking.shop.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white font-bold">
                  {booking.shop?.name?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{booking.shop?.name}</h4>
              <p className="text-sm text-gray-500 flex items-center mt-0.5">
                <MapPin className="w-3 h-3 mr-1" />
                {booking.shop?.address}
              </p>
            </div>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>

        {/* Services */}
        <div className="text-sm text-gray-600 mb-3">
          {booking.services?.map((bs) => bs.serviceName).join(', ')}
        </div>

        {/* Date & Time */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(booking.startTime)}
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </Card>
    </Link>
  );
};

export { BookingCard };
