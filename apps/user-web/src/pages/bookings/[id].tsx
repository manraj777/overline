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
  Star,
  CreditCard,
} from 'lucide-react';
import { Button, Card, Badge, Alert, Loading } from '@/components/ui';
import { PaymentForm, LiveBookingTracker } from '@/components/booking';
import { ReviewForm } from '@/components/reviews';
import { useBooking, useCancelBooking, useCreatePaymentIntent, useQueueSocket, useRespondCounterOffer } from '@/hooks';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { formatDate, formatTime, formatPrice, formatDuration, getEndTime } from '@/lib/utils';
import { removeQueueSession } from '@/lib/queue-session';
import { BookingStatus } from '@/types';
import { Timer } from 'lucide-react';

interface RazorpayPaymentData {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  bookingNumber: string;
  shopName?: string;
}

/** Live count-up timer shown during active service */
function ServiceTimer({ startedAt, totalDurationMinutes }: { startedAt: string; totalDurationMinutes: number }) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const totalSecs = totalDurationMinutes * 60;
  const progress = Math.min(elapsed / totalSecs, 1);
  const isOvertime = elapsed > totalSecs;

  return (
    <Card variant="bordered" className={`border-2 ${isOvertime ? 'border-error/40 bg-error/5' : 'border-primary/20 bg-primary/5'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-on-surface flex items-center gap-2">
            <Timer className={`w-5 h-5 ${isOvertime ? 'text-error' : 'text-primary'}`} />
            Service In Progress
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            {isOvertime
              ? `Over by ${mins - totalDurationMinutes} min ${secs.toString().padStart(2, '0')}s`
              : `Est. ${totalDurationMinutes} min total`}
          </p>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-black tabular-nums tracking-tight ${isOvertime ? 'text-error' : 'text-primary'}`}>
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </div>
          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-surface-container-high rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isOvertime ? 'bg-error' : 'bg-primary'}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function BookingDetailPage() {
  const router = useRouter();
  const { id, success } = router.query;

  const { data: booking, isLoading, refetch } = useBooking(id as string);
  const cancelBooking = useCancelBooking();
  const respondCounterOffer = useRespondCounterOffer();
  const createPaymentIntent = useCreatePaymentIntent();

  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const [showReviewForm, setShowReviewForm] = React.useState(false);
  const [reviewSubmitted, setReviewSubmitted] = React.useState(false);
  const [showPayment, setShowPayment] = React.useState(false);
  const [paymentData, setPaymentData] = React.useState<RazorpayPaymentData | null>(null);

  // Track previous status to chime when it transitions (e.g. shop
  // approves while the user is staring at this page). The shared hook
  // also handles the user's mute preference and vibration.
  const { play: playChime } = useNotificationSound();
  const prevStatusRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (booking?.status && prevStatusRef.current && prevStatusRef.current !== booking.status) {
      playChime();
    }
    prevStatusRef.current = booking?.status || null;
  }, [booking?.status, playChime]);

  // Real-time booking status tracking
  const [queuePosition, setQueuePosition] = React.useState<number | null>(null);
  const { connected: wsConnected } = useQueueSocket({
    bookingId: booking?.id,
    shopId: booking?.shopId,
    enabled: !!booking && ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status),
    onBookingUpdate: () => refetch(),
    onPositionUpdate: (update) => setQueuePosition(update.position),
    onQueueUpdate: () => refetch(),
  });

  const [paymentError, setPaymentError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!booking?.shopId) return;
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.NO_SHOW
    ) {
      removeQueueSession(booking.shopId);
    }
  }, [booking?.shopId, booking?.status]);

  const handlePayNow = async () => {
    if (!booking) return;
    try {
      setPaymentError(null);
      const data = await createPaymentIntent.mutateAsync({
        bookingId: booking.id,
      });

      if (data.method !== 'RAZORPAY') {
        setPaymentError(
          'Online Razorpay checkout is not configured for this booking. Please pay at the counter.',
        );
        return;
      }

      setPaymentData({
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        keyId: data.keyId,
        bookingNumber: data.bookingNumber,
        shopName: data.shopName,
      });
      setShowPayment(true);
    } catch (err: any) {
      console.error('Failed to create payment intent:', err);
      // Surface backend provider/config errors directly for easier troubleshooting.
      setPaymentError(err.response?.data?.message || err.message || 'Failed to initialize payment');
    }
  };

  const handleCancel = async () => {
    if (!booking) return;

    try {
      await cancelBooking.mutateAsync(booking.id);
      removeQueueSession(booking.shopId);
      setShowCancelConfirm(false);
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    }
  };

  const handleRespondCounterOffer = async (accept: boolean) => {
    if (!booking) return;
    try {
      await respondCounterOffer.mutateAsync({ bookingId: booking.id, accept });
      if (!accept) {
        removeQueueSession(booking.shopId);
      }
    } catch (err) {
      console.error('Failed to respond to counter offer:', err);
    }
  };

  if (isLoading) {
    return <Loading text="Loading booking details..." />;
  }

  if (!booking) {
    return (
      <div className="container-app py-12 text-center">
        <h1 className="text-2xl font-bold text-on-surface mb-2">
          Booking not found
        </h1>
        <p className="text-on-surface-variant mb-4">
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
    booking.status === BookingStatus.PENDING_APPROVAL ||
    booking.status === BookingStatus.CONFIRMED;

  // Status palette: every entry uses semantic, dark-mode-safe tints so the
  // detail page stays legible across themes without per-color overrides.
  const STATUS_PENDING = 'text-warning-600 bg-warning-50 dark:text-amber-200 dark:bg-amber-950/40';
  const STATUS_INFO = 'text-primary bg-primary/10 dark:text-primary-200 dark:bg-primary/20';
  const STATUS_SUCCESS = 'text-success-700 bg-success-50 dark:text-green-300 dark:bg-green-950/40';
  const STATUS_ERROR = 'text-error-600 bg-error-50 dark:text-red-300 dark:bg-error-container/40';

  const statusConfig: Record<
    BookingStatus,
    { icon: React.ReactNode; color: string; label: string }
  > = {
    [BookingStatus.PENDING]: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: STATUS_PENDING,
      label: 'Pending Confirmation',
    },
    [BookingStatus.PENDING_APPROVAL]: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: STATUS_PENDING,
      label: 'Pending Staff Approval',
    },
    [BookingStatus.CONFIRMED]: {
      icon: <CheckCircle className="w-5 h-5" />,
      color: STATUS_INFO,
      label: 'Confirmed',
    },
    [BookingStatus.IN_PROGRESS]: {
      icon: <Clock className="w-5 h-5" />,
      color: STATUS_INFO,
      label: 'In Progress',
    },
    [BookingStatus.COMPLETED]: {
      icon: <CheckCircle className="w-5 h-5" />,
      color: STATUS_SUCCESS,
      label: 'Completed',
    },
    [BookingStatus.CANCELLED]: {
      icon: <XCircle className="w-5 h-5" />,
      color: STATUS_ERROR,
      label: 'Cancelled',
    },
    [BookingStatus.NO_SHOW]: {
      icon: <XCircle className="w-5 h-5" />,
      color: STATUS_ERROR,
      label: 'No Show',
    },
    [BookingStatus.REJECTED]: {
      icon: <XCircle className="w-5 h-5" />,
      color: STATUS_ERROR,
      label: 'Rejected',
    },
  };

  const baseStatus = statusConfig[booking.status as BookingStatus];
  const status =
    booking.status === BookingStatus.REJECTED && booking.adminNotes?.toUpperCase().includes('FAKE_USER')
      ? {
          icon: <XCircle className="w-5 h-5" />,
          color: STATUS_ERROR,
          label: 'Rejected as Fake User',
        }
      : booking.status === BookingStatus.REJECTED
        ? {
            icon: <XCircle className="w-5 h-5" />,
            color: STATUS_ERROR,
            label: 'Disapproved',
          }
        : baseStatus;

  return (
    <>
      <Head>
        <title>Booking Details - Overline</title>
      </Head>

      <div className="container-app py-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/bookings')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Bookings
        </button>

        {/* Success Message */}
        {success === 'true' && (
          (booking.status === BookingStatus.PENDING_APPROVAL || booking.status === BookingStatus.PENDING) ? (
            <Alert variant="success" title="Booking Placed!" className="mb-6">
              Your appointment request has been sent to {booking.shop?.name || 'the shop'}. You&apos;ll be notified the moment it is confirmed.
            </Alert>
          ) : (
            <Alert variant="success" title="Booking Confirmed!" className="mb-6">
              Your appointment has been confirmed. See you at the shop!
            </Alert>
          )
        )}

        {/* Counter Offer Notification */}
        {booking.status === BookingStatus.PENDING_APPROVAL && booking.proposedStartTime && booking.proposedEndTime && (
          <Alert variant="warning" title="Time Change Proposed" className="mb-6">
            <p className="mb-3">
              The shop has proposed a new time for your booking:
              <br />
              <span className="font-semibold text-amber-900">
                {formatDate(booking.proposedStartTime)} at {formatTime(booking.proposedStartTime)} - {formatTime(booking.proposedEndTime)}
              </span>
            </p>
            {booking.adminNotes && (
              <p className="mb-3 text-sm italic text-amber-800 border-l-2 border-amber-300 pl-2">
                " {booking.adminNotes} "
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRespondCounterOffer(true)}
                isLoading={respondCounterOffer.isPending}
              >
                Accept New Time
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRespondCounterOffer(false)}
                isLoading={respondCounterOffer.isPending}
              >
                Decline & Cancel
              </Button>
            </div>
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
                  <h2 className="font-semibold text-on-surface">{status.label}</h2>
                  <p className="text-sm text-on-surface-variant">
                    Booking #{booking.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 bg-surface-container-low rounded-xl text-on-surface">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-on-surface-variant" />
                  <span className="font-medium">
                    {formatDate(booking.startTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-on-surface-variant" />
                  <span className="font-medium">
                    {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                  </span>
                </div>
              </div>

              {['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status) && booking.verificationCode && (
                <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Service Verification Code</p>
                  <p className="text-2xl font-black tracking-[0.2em] text-on-surface">{booking.verificationCode}</p>
                  <p className="text-xs text-on-surface-variant mt-2">Share this code with staff to start your service.</p>
                </div>
              )}
            </Card>

            {/* Service Duration Live Timer */}
            {['IN_PROGRESS', 'IN_SERVICE'].includes(booking.status) && booking.startedAt && (
              <ServiceTimer startedAt={booking.startedAt} totalDurationMinutes={booking.totalDurationMinutes} />
            )}

            {/* Live Queue Position */}
            {['PENDING', 'CONFIRMED'].includes(booking.status) &&
              (queuePosition || booking.queuePosition) && (
                <Card variant="bordered" className="border-primary/30 bg-primary/5 dark:bg-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-on-surface">Your Queue Position</h3>
                      <p className="text-sm text-on-surface-variant">
                        {wsConnected ? 'Updating in real-time' : 'Based on booking time'}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        #{queuePosition || booking.queuePosition}
                      </div>
                      {wsConnected && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                          </span>
                          <span className="text-xs text-success-600 dark:text-green-400">Live</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

            {/* Live Tracking & Chat — available pre-service-start only */}
            {['PENDING', 'PENDING_APPROVAL', 'CONFIRMED'].includes(booking.status) && (
              <LiveBookingTracker
                bookingId={booking.id}
                shopId={booking.shopId}
                startTime={booking.startTime}
                status={booking.status}
              />
            )}

            {/* Shop Info */}
            <Card variant="bordered">
              <h3 className="font-semibold text-on-surface mb-4">Shop Details</h3>
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-surface-container-high overflow-hidden flex-shrink-0">
                  {booking.shop?.logoUrl ? (
                    <img
                      src={booking.shop.logoUrl}
                      alt={booking.shop.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary text-on-primary font-bold text-xl">
                      {booking.shop?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-on-surface">
                    {booking.shop?.name}
                  </h4>
                  <p className="text-sm text-on-surface-variant flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {booking.shop?.address}
                  </p>
                  {booking.shop?.phone && (
                    <p className="text-sm text-on-surface-variant flex items-center mt-1">
                      <Phone className="w-4 h-4 mr-1" />
                      {booking.shop.phone}
                    </p>
                  )}
                </div>
              </div>

              {booking.shop?.slug && (
                <div className="mt-4 pt-4 border-t border-outline-variant/30">
                  <Link
                    href={`/shops/${booking.shop.slug}`}
                    className="text-primary text-sm font-medium hover:text-primary-700 transition-colors"
                  >
                    View Shop Profile →
                  </Link>
                </div>
              )}
            </Card>

            {/* Services */}
            <Card variant="bordered">
              <h3 className="font-semibold text-on-surface mb-4">Services</h3>
              <div className="space-y-3">
                {booking.services?.map((bs) => (
                  <div
                    key={bs.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="font-medium text-on-surface">
                        {bs.serviceName}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {formatDuration(bs.durationMinutes || 0)}
                      </p>
                    </div>
                    <span className="font-medium text-on-surface">
                      {formatPrice(bs.price)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Staff */}
            {booking.staff && (
              <Card variant="bordered">
                <h3 className="font-semibold text-on-surface mb-4">
                  Your Specialist
                </h3>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-on-surface-variant" />
                  <span className="text-on-surface">{booking.staff.name}</span>
                </div>
              </Card>
            )}

            {/* Notes */}
            {booking.notes && (
              <Card variant="bordered">
                <h3 className="font-semibold text-on-surface mb-2">Notes</h3>
                <p className="text-on-surface-variant">{booking.notes}</p>
              </Card>
            )}

            {/* Payment Section - Disabled for now */}
            {(booking.status === BookingStatus.PENDING ||
              booking.status === BookingStatus.CONFIRMED) &&
              !booking.payment?.paidAt && (
                <Card variant="bordered">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-surface-container-high">
                      <CreditCard className="w-5 h-5 text-on-surface-variant opacity-60" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-on-surface flex items-center gap-2">
                        Pay Online
                        <span className="text-[9px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider">
                          Launching Soon
                        </span>
                      </h3>
                      <p className="text-sm text-on-surface-variant">
                        Online prepayments will be launching soon.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant mt-4 text-center bg-surface-container-low p-3 rounded-lg border border-outline-variant/10 font-medium">
                    Please pay at the counter when you arrive at the shop.
                  </p>
                </Card>
              )}

            {/* Payment Completed Badge */}
            {booking.payment?.paidAt && (
              <Alert variant="success" title="Payment Complete">
                Paid {formatPrice(booking.payment.amount)} on{' '}
                {formatDate(booking.payment.paidAt)}
              </Alert>
            )}

            {/* Leave a Review - only for completed bookings */}
            {booking.status === BookingStatus.COMPLETED && !reviewSubmitted && !(booking as any).review && (
              <Card variant="bordered">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-warning-50 dark:bg-amber-950/40">
                    <Star className="w-5 h-5 text-warning-600 dark:text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface">Rate your experience</h3>
                    <p className="text-sm text-on-surface-variant">Help others by sharing your feedback</p>
                  </div>
                </div>

                {showReviewForm ? (
                  <ReviewForm
                    bookingId={booking.id}
                    onSuccess={() => {
                      setShowReviewForm(false);
                      setReviewSubmitted(true);
                    }}
                  />
                ) : (
                  <Button onClick={() => setShowReviewForm(true)} className="w-full">
                    <Star className="w-4 h-4 mr-2" />
                    Leave a Review
                  </Button>
                )}
              </Card>
            )}

            {(reviewSubmitted || (booking as any).review) && (
              <Alert variant="success" className="mt-0">
                <p className="font-semibold">Thank you for your review!</p>
                {(booking as any).review?.comment && (
                  <p className="mt-2 text-sm italic text-success-700 dark:text-green-300">
                    "{(booking as any).review.comment}"
                  </p>
                )}
              </Alert>
            )}
          </div>

          {/* Sidebar */}
          <div className="mt-6 lg:mt-0">
            <Card variant="bordered" className="sticky top-20">
              <h3 className="font-semibold text-on-surface mb-4">Summary</h3>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Duration</span>
                  <span className="text-on-surface">
                    {formatDuration(totalDuration)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Services</span>
                  <span className="text-on-surface">
                    {booking.services?.length || 0}
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-outline-variant/30">
                <span className="font-medium text-on-surface">Total</span>
                <span className="text-xl font-bold text-on-surface">
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
                {booking.shop?.slug && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => router.push(`/shops/${booking.shop!.slug}`)}
                  >
                    Book Again
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
