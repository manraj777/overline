import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Clock, MapPin, Trash2, UserPlus, Check } from 'lucide-react';
import { Alert, Button } from '@/components/ui';
import { DatePicker, SlotPicker } from '@/components/booking';
import { useAvailableSlots, useCreateBooking, useShopQueueStats } from '@/hooks';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';
import { format } from 'date-fns';
import { saveQueueSession } from '@/lib/queue-session';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
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

  const { data: queueStats } = useShopQueueStats(shop?.id || '');
  const { data: slots, isLoading: loadingSlots } = useAvailableSlots({
    shopId: shop?.id || '',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    staffId: selectedStaff?.id,
    serviceIds: selectedServices.map((s) => s.id),
  });

  const createBooking = useCreateBooking();

  const canBook = selectedServices.length > 0 && !!selectedDate && !!selectedSlot;

  const handleConfirmBooking = async () => {
    if (!shop) {
      router.push('/explore');
      return;
    }

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/cart');
      return;
    }

    if (!canBook) {
      setError('Please add services and select date/time.');
      return;
    }

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

      if (booking?.id && booking?.bookingNumber) {
        saveQueueSession({
          shopId: shop.id,
          bookingId: booking.id,
          tokenCode: booking.bookingNumber,
        });
      }

      router.push(`/bookings/${booking.id}?success=true`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create booking');
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
                  disabled={!canBook}
                  className="w-full btn-primary py-3 mt-6 font-black"
                >
                  Confirm & Book Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
