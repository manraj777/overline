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

        {shouldShowCode && booking.verificationCode && (
          <div className="mb-3 rounded-lg bg-indigo-50 border border-indigo-100 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Service Code</p>
            <p className="text-base font-black text-indigo-900 tracking-[0.12em]">{booking.verificationCode}</p>
          </div>
        )}

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
