import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Clock, MapPin, Trash2, UserPlus, Check } from 'lucide-react';
import { Alert, Button } from '@/components/ui';
import { DatePicker, SlotPicker } from '@/components/booking';
import { useAvailableSlots, useCreateBooking, useShopQueueStats, useMyBookings } from '@/hooks';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';
import { format } from 'date-fns';
import { saveQueueSession } from '@/lib/queue-session';
import api from '@/lib/api';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const {
    shop,
    selectedServices,
    selectedStaff,
    selectedDate,
    selectedSlot,
    notes,
    setDate,
    setSlot,
    setNotes,
    bookingForOther,
    customerName,
    customerPhone,
    setBookingForOther,
    setCustomerName,
    setCustomerPhone,
    removeService,
    getTotalDuration,
  } = useBookingStore();

  const [error, setError] = React.useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<'ONLINE' | 'PAY_AT_SHOP'>('PAY_AT_SHOP');
  const submittingRef = React.useRef(false);

  const { data: queueStats } = useShopQueueStats(shop?.id || '');
  const { data: slots, isLoading: loadingSlots } = useAvailableSlots({
    shopId: shop?.id || '',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    staffId: selectedStaff?.id,
    serviceIds: selectedServices.map((s) => s.id),
  });
  
  const { data: myBookingsData } = useMyBookings('all');
  const hasActiveBooking = React.useMemo(() => {
    if (!myBookingsData?.data || !selectedDate || !selectedSlot) return false;
    
    // Calculate new booking time window
    const newStart = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedSlot.startTime}`).getTime();
    const newEnd = newStart + (getTotalDuration() * 60 * 1000);

    return myBookingsData.data.some(b => {
      if (!['PENDING', 'PENDING_APPROVAL', 'CONFIRMED', 'WAITLISTED', 'IN_PROGRESS', 'IN_SERVICE'].includes(b.status)) {
        return false;
      }
      
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      
      // Check for overlap: New start is before old end AND old start is before new end
      return newStart < bEnd && bStart < newEnd;
    });
  }, [myBookingsData, selectedDate, selectedSlot, getTotalDuration]);

  const createBooking = useCreateBooking();

  const canBook = selectedServices.length > 0 && !!selectedDate && !!selectedSlot && !hasActiveBooking;

  const handleConfirmBooking = async () => {
    // Double-submit guard
    if (submittingRef.current || createBooking.isPending) return;

    if (!shop) {
      router.push('/explore');
      return;
    }

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/cart');
      return;
    }

    if (hasActiveBooking) {
      setError('You already have an active booking during this time window. Please select a different time or cancel your existing booking.');
      return;
    }

    if (!canBook) {
      setError('Please add services and select date/time.');
      return;
    }

    if (bookingForOther && !customerName.trim()) {
      setError('Please enter the guest name when booking for someone else.');
      return;
    }

    submittingRef.current = true;
    setError(null);

    try {
      const booking = await createBooking.mutateAsync({
        shopId: shop.id,
        serviceIds: selectedServices.map((s) => s.id),
        staffId: selectedStaff?.id,
        scheduledDate: format(selectedDate!, 'yyyy-MM-dd'),
        scheduledTime: selectedSlot!.startTime,
        notes,
        ...(bookingForOther && customerName
          ? {
              customerName,
              customerPhone: customerPhone || undefined,
            }
          : {}),
      });

      const totalAmount = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);

      // If total > 0, create the payment order using the selected method
      if (totalAmount > 0) {
        try {
          // Create Order via Backend
          const orderResponse = await api.post('/payments/create-order', {
            bookingId: booking.id,
            method: paymentMethod
          });
          const order = orderResponse.data;

          if (order.method === 'RAZORPAY' && order.keyId) {
            const isLoaded = await loadRazorpay();
            if (!isLoaded) {
              throw new Error('Razorpay SDK failed to load. Are you online?');
            }

            const options = {
              key: order.keyId,
              amount: order.amount,
              currency: order.currency,
              name: order.shopName || shop.name,
              description: 'Booking Payment',
              order_id: order.orderId,
              handler: async function (response: any) {
                try {
                  await api.post('/payments/verify', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  });

                  if (booking?.bookingNumber) {
                    saveQueueSession({
                      shopId: shop.id,
                      bookingId: booking.id,
                      tokenCode: booking.bookingNumber,
                    });
                  }
                  router.push(`/bookings/${booking.id}?success=true`);
                } catch (err: any) {
                  setError('Payment verification failed. If money was deducted, it will be refunded.');
                }
              },
              prefill: {
                name: customerName || useAuthStore.getState().user?.name,
                email: useAuthStore.getState().user?.email,
                contact: customerPhone || useAuthStore.getState().user?.phone,
              },
              theme: {
                color: '#09090b',
              },
            };

            const paymentObject = new (window as any).Razorpay(options);
            paymentObject.on('payment.failed', function (response: any) {
              setError(response.error.description);
            });
            paymentObject.open();
            return; // Exit here, let Razorpay handler do the routing
          }
        } catch (paymentErr: any) {
          // If payment setup fails (e.g., no provider configured), we gracefully fallback to booking creation
          console.warn('Online payment failed to initialize:', paymentErr);
        }
      }

      // Fallback or zero-amount flow
      if (booking?.bookingNumber) {
        saveQueueSession({
          shopId: shop.id,
          bookingId: booking.id,
          tokenCode: booking.bookingNumber,
        });
      }
      router.push(`/bookings/${booking.id}?success=true`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create booking');
    } finally {
      submittingRef.current = false;
    }
  };

  if (!shop || selectedServices.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-on-surface mb-3">Your cart is empty</h1>
        <p className="text-on-surface-variant mb-8">Add services from a shop menu to continue.</p>
        <Link href="/explore" className="btn-primary px-8 py-3 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Explore Shops
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Cart — Overline</title>
        <meta name="description" content="Review services and confirm your booking." />
      </Head>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            onClick={() => router.push(`/shops/${shop.slug}`)}
            className="btn-tonal px-4 py-2.5 rounded-xl font-bold inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Menu
          </button>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">Your Cart</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="card-m3 p-6">
              <h2 className="text-lg font-black text-on-surface mb-4">Selected Services</h2>
              <div className="space-y-3">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <div>
                      <p className="font-bold text-on-surface">{service.name}</p>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> {service.durationMinutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-on-surface">₹{Number(service.price || 0)}</span>
                      <button
                        onClick={() => removeService(service.id)}
                        className="p-2 rounded-lg hover:bg-error-container/20 text-error"
                        aria-label={`Remove ${service.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-m3 p-6">
              <h2 className="text-lg font-black text-on-surface mb-3">Pick Date & Time</h2>
              {queueStats && (
                <p className="text-sm text-on-surface-variant mb-4">
                  Queue now: {queueStats.waitingCount} waiting, estimated {queueStats.estimatedWaitMinutes} min.
                </p>
              )}

              <DatePicker selectedDate={selectedDate} onSelectDate={setDate} />

              {selectedDate && (
                <div className="mt-8">
                  <h3 className="text-base font-bold text-on-surface mb-4">
                    Available on {format(selectedDate, 'MMM d, yyyy')}
                  </h3>
                  <SlotPicker
                    slots={slots || []}
                    selectedSlot={selectedSlot}
                    onSelectSlot={setSlot}
                    isLoading={loadingSlots}
                  />
                </div>
              )}
            </div>

            <div className="card-m3 p-6 space-y-5">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={bookingForOther}
                    onChange={(e) => setBookingForOther(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-6 h-6 border-2 border-outline-variant rounded-lg peer-checked:bg-primary peer-checked:border-primary transition-colors" />
                  <Check className="w-4 h-4 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-bold text-on-surface">Booking for someone else?</span>
                </div>
              </label>

              {bookingForOther && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Guest name"
                    className="input-m3"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Guest phone (optional)"
                    className="input-m3"
                  />
                </div>
              )}

              <div>
                <label className="label-m3 mb-2 block">Special Requests</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything we should know before you arrive?"
                  className="input-m3 min-h-[120px] resize-none"
                  rows={4}
                />
              </div>
            </div>

            {error && <Alert variant="error">{error}</Alert>}
          </div>

          <div className="lg:col-span-5">
            <div className="card-m3 p-6 sticky top-24">
              <h2 className="text-lg font-black text-on-surface mb-4">Checkout</h2>
              <div className="space-y-3 text-sm">
                <p className="text-on-surface-variant flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {shop.name}
                </p>
                <p className="text-on-surface-variant">{shop.address}, {shop.city}</p>
                <div className="pt-3 border-t border-outline-variant/20">
                  <div className="flex justify-between mb-2">
                    <span className="text-on-surface-variant">Services ({selectedServices.length})</span>
                    <span className="font-bold">₹{selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-on-surface-variant">Total duration</span>
                    <span className="font-bold">{getTotalDuration()} min</span>
                  </div>
                  <div className="flex justify-between text-base pt-2 border-t border-outline-variant/20">
                    <span className="font-black text-on-surface">Total</span>
                    <span className="font-black text-primary">₹{selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0)}</span>
                  </div>
                </div>
              </div>

              {selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0) > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-on-surface mb-3">Payment Method</h3>
                  <div className="space-y-3">
                    <label 
                      onClick={() => setPaymentMethod('PAY_AT_SHOP')}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'PAY_AT_SHOP' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 bg-surface-container-low hover:bg-surface-container'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'PAY_AT_SHOP' ? 'border-primary' : 'border-outline-variant'}`}>
                          {paymentMethod === 'PAY_AT_SHOP' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="font-bold text-sm">Pay at Shop</span>
                      </div>
                      <span className="text-xs text-on-surface-variant font-medium bg-surface-container px-2 py-1 rounded-md">No extra fees</span>
                    </label>

                    <label 
                      onClick={() => setPaymentMethod('ONLINE')}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'ONLINE' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 bg-surface-container-low hover:bg-surface-container'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'ONLINE' ? 'border-primary' : 'border-outline-variant'}`}>
                          {paymentMethod === 'ONLINE' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="font-bold text-sm">Prepay Online</span>
                      </div>
                      <span className="text-xs text-on-surface-variant font-medium bg-surface-container px-2 py-1 rounded-md">Via Razorpay</span>
                    </label>
                  </div>
                </div>
              )}

              {!isAuthenticated ? (
                <button
                  onClick={() => router.push('/auth/login?redirect=/cart')}
                  className="w-full btn-primary py-3 mt-6"
                >
                  Login to Complete Booking
                </button>
              ) : (
                <Button
                  onClick={handleConfirmBooking}
                  isLoading={createBooking.isPending}
                  disabled={!canBook || createBooking.isPending || hasActiveBooking}
                  className="w-full btn-primary py-3 mt-6 font-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasActiveBooking 
                    ? 'Active Booking Exists' 
                    : createBooking.isPending ? 'Booking...' : 'Confirm & Book Now'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
