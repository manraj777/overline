import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button, Card, Badge, Alert, Loading } from '@/components/ui';
import { useBooking, useCancelBooking } from '@/hooks';
import { formatDate, formatTime, formatPrice, formatDuration, getEndTime } from '@/lib/utils';
import { BookingStatus } from '@/types';

export default function BookingDetailPage() {
  const router = useRouter();
  const { id, success } = router.query;

  const { data: booking, isLoading } = useBooking(id as string);
  const cancelBooking = useCancelBooking();

  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

  const handleCancel = async () => {
    if (!booking) return;

    try {
      await cancelBooking.mutateAsync(booking.id);
      setShowCancelConfirm(false);
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    }
  };

  if (isLoading) {
    return <Loading text="Loading booking details..." />;
  }

  if (!booking) {
    return (
      <div className="container-app py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Booking not found
        </h1>
        <p className="text-gray-500 mb-4">
          This booking doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => router.push('/bookings')}>View Bookings</Button>
      </div>
    );
  }

  const totalDuration =
    booking.totalDurationMinutes ||
    booking.services?.reduce(
      (acc, bs) => acc + (bs.durationMinutes || 0),
      0
    ) || 0;
  const totalPrice =
    booking.totalAmount ||
    booking.services?.reduce((acc, bs) => acc + (bs.price || 0), 0) ||
    0;

  const canCancel =
    booking.status === BookingStatus.PENDING ||
    booking.status === BookingStatus.CONFIRMED;

  const statusConfig: Record<
    BookingStatus,
    { icon: React.ReactNode; color: string; label: string }
  > = {
    [BookingStatus.PENDING]: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-amber-600 bg-amber-100',
      label: 'Pending Confirmation',
    },
    [BookingStatus.CONFIRMED]: {
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-100',
      label: 'Confirmed',
    },
    [BookingStatus.IN_PROGRESS]: {
      icon: <Clock className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-100',
      label: 'In Progress',
    },
    [BookingStatus.COMPLETED]: {
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-green-600 bg-green-100',
      label: 'Completed',
    },
    [BookingStatus.CANCELLED]: {
      icon: <XCircle className="w-5 h-5" />,
      color: 'text-red-600 bg-red-100',
      label: 'Cancelled',
    },
    [BookingStatus.NO_SHOW]: {
      icon: <XCircle className="w-5 h-5" />,
      color: 'text-red-600 bg-red-100',
      label: 'No Show',
    },
    [BookingStatus.REJECTED]: {
      icon: <XCircle className="w-5 h-5" />,
      color: 'text-red-600 bg-red-100',
      label: 'Rejected',
    },
  };

  const status = statusConfig[booking.status as BookingStatus];

  return (
    <>
      <Head>
        <title>Booking Details - Overline</title>
      </Head>

      <div className="container-app py-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/bookings')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Bookings
        </button>

        {/* Success Message */}
        {success === 'true' && (
          <Alert variant="success" title="Booking Confirmed!" className="mb-6">
            Your appointment has been booked successfully. You'll receive a
            confirmation notification shortly.
          </Alert>
        )}

        {/* Cancel Confirmation */}
        {showCancelConfirm && (
          <Alert variant="warning" title="Cancel Booking?" className="mb-6">
            <p className="mb-3">
              Are you sure you want to cancel this booking? This action cannot be
              undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                isLoading={cancelBooking.isPending}
              >
                Yes, Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Booking
              </Button>
            </div>
          </Alert>
        )}

        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card variant="bordered">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${status.color}`}>
                  {status.icon}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{status.label}</h2>
                  <p className="text-sm text-gray-500">
                    Booking #{booking.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">
                    {formatDate(booking.startTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">
                    {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Shop Info */}
            <Card variant="bordered">
              <h3 className="font-semibold text-gray-900 mb-4">Shop Details</h3>
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {booking.shop?.logoUrl ? (
                    <img
                      src={booking.shop.logoUrl}
                      alt={booking.shop.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white font-bold text-xl">
                      {booking.shop?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {booking.shop?.name}
                  </h4>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {booking.shop?.address}
                  </p>
                  {booking.shop?.phone && (
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Phone className="w-4 h-4 mr-1" />
                      {booking.shop.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  href={`/shops/${booking.shop?.slug}`}
                  className="text-primary-600 text-sm font-medium hover:text-primary-700"
                >
                  View Shop Profile →
                </Link>
              </div>
            </Card>

            {/* Services */}
            <Card variant="bordered">
              <h3 className="font-semibold text-gray-900 mb-4">Services</h3>
              <div className="space-y-3">
                {booking.services?.map((bs) => (
                  <div
                    key={bs.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {bs.serviceName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDuration(bs.durationMinutes || 0)}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatPrice(bs.price)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Staff */}
            {booking.staff && (
              <Card variant="bordered">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Your Specialist
                </h3>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{booking.staff.name}</span>
                </div>
              </Card>
            )}

            {/* Notes */}
            {booking.notes && (
              <Card variant="bordered">
                <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-gray-600">{booking.notes}</p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="mt-6 lg:mt-0">
            <Card variant="bordered" className="sticky top-20">
              <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-gray-900">
                    {formatDuration(totalDuration)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Services</span>
                  <span className="text-gray-900">
                    {booking.services?.length || 0}
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-100">
                <span className="font-medium text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2">
                {canCancel && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel Booking
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push(`/shops/${booking.shop?.slug}`)}
                >
                  Book Again
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
