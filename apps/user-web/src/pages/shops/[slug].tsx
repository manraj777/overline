import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeft, MapPin, Clock, Star, Phone, Globe, Share2 } from 'lucide-react';
import { Button, Badge, Loading, Alert } from '@/components/ui';
import { ServiceList, StaffPicker } from '@/components/shop';
import { DatePicker, SlotPicker, BookingSummary } from '@/components/booking';
import { useShop, useShopQueueStats, useAvailableSlots, useCreateBooking } from '@/hooks';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';
import { format } from 'date-fns';

type BookingStep = 'services' | 'staff' | 'datetime' | 'confirm';

export default function ShopDetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { isAuthenticated } = useAuthStore();

  const [step, setStep] = React.useState<BookingStep>('services');
  const [error, setError] = React.useState<string | null>(null);

  const { data: shop, isLoading: loadingShop } = useShop(slug as string);
  const { data: queueStats } = useShopQueueStats(shop?.id || '');

  const {
    selectedServices,
    selectedStaff,
    selectedDate,
    selectedSlot,
    notes,
    setShop,
    toggleService,
    setStaff,
    setDate,
    setSlot,
    setNotes,
    getTotalDuration,
    reset,
  } = useBookingStore();

  // Fetch available slots when date is selected
  const { data: slots, isLoading: loadingSlots } = useAvailableSlots({
    shopId: shop?.id || '',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    staffId: selectedStaff?.id,
    serviceIds: selectedServices.map((s) => s.id),
  });

  const createBooking = useCreateBooking();

  // Set shop when loaded
  React.useEffect(() => {
    if (shop) {
      setShop(shop);
    }
  }, [shop, setShop]);

  // Reset on unmount
  React.useEffect(() => {
    return () => reset();
  }, [reset]);

  const handleNextStep = () => {
    const steps: BookingStep[] = ['services', 'staff', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevStep = () => {
    const steps: BookingStep[] = ['services', 'staff', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/shops/${slug}`);
      return;
    }

    if (!shop || !selectedDate || !selectedSlot || selectedServices.length === 0) {
      setError('Please complete all booking steps');
      return;
    }

    try {
      const booking = await createBooking.mutateAsync({
        shopId: shop.id,
        serviceIds: selectedServices.map((s) => s.id),
        staffId: selectedStaff?.id,
        scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
        scheduledTime: selectedSlot.startTime,
        notes,
      });

      router.push(`/bookings/${booking.id}?success=true`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create booking');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'services':
        return selectedServices.length > 0;
      case 'staff':
        return true; // Staff is optional
      case 'datetime':
        return selectedDate && selectedSlot;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  if (loadingShop) {
    return <Loading text="Loading shop details..." />;
  }

  if (!shop) {
    return (
      <div className="container-app py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Shop not found</h1>
        <p className="text-gray-500 mb-4">
          The shop you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => router.push('/explore')}>Explore Shops</Button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{shop.name} - Overline</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="container-app flex items-center justify-between h-14">
            <button
              onClick={handlePrevStep}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">
                {step === 'services' ? 'Back' : 'Previous'}
              </span>
            </button>

            {/* Progress Steps */}
            <div className="flex items-center gap-2">
              {['services', 'staff', 'datetime', 'confirm'].map((s, i) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full ${
                    step === s
                      ? 'bg-primary-500'
                      : i <
                        ['services', 'staff', 'datetime', 'confirm'].indexOf(step)
                      ? 'bg-primary-300'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <div className="w-20" />
          </div>
        </div>

        <div className="container-app py-6">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Shop Header (only on first step) */}
              {step === 'services' && (
                <div className="mb-6">
                  <div className="relative h-48 md:h-64 rounded-xl overflow-hidden mb-4">
                    {shop.logoUrl ? (
                      <img
                        src={shop.logoUrl}
                        alt={shop.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                        <span className="text-6xl text-white font-bold">
                          {shop.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4">
                      <Badge variant="success">Open Now</Badge>
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {shop.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {shop.address}
                    </span>
                    {queueStats && (
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />~{queueStats.estimatedWaitMinutes} min wait
                      </span>
                    )}
                    <span className="flex items-center text-amber-500">
                      <Star className="w-4 h-4 fill-current mr-1" />
                      4.8 (120 reviews)
                    </span>
                  </div>

                  {shop.description && (
                    <p className="text-gray-600 mb-4">{shop.description}</p>
                  )}
                </div>
              )}

              {/* Step Content */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                {step === 'services' && (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Select Services
                    </h2>
                    {shop.services && shop.services.length > 0 ? (
                      <ServiceList
                        services={shop.services}
                        selectedServices={selectedServices}
                        onToggleService={toggleService}
                      />
                    ) : (
                      <p className="text-gray-500">No services available</p>
                    )}
                  </>
                )}

                {step === 'staff' && (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Choose Staff (Optional)
                    </h2>
                    {shop.staff && shop.staff.length > 0 ? (
                      <StaffPicker
                        staff={shop.staff}
                        selectedStaff={selectedStaff}
                        onSelectStaff={setStaff}
                      />
                    ) : (
                      <p className="text-gray-500">
                        Staff selection not available for this shop
                      </p>
                    )}
                  </>
                )}

                {step === 'datetime' && (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Select Date
                    </h2>
                    <DatePicker
                      selectedDate={selectedDate}
                      onSelectDate={setDate}
                    />

                    {selectedDate && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Available Times
                        </h3>
                        <SlotPicker
                          slots={slots || []}
                          selectedSlot={selectedSlot}
                          onSelectSlot={setSlot}
                          isLoading={loadingSlots}
                        />
                      </div>
                    )}
                  </>
                )}

                {step === 'confirm' && (
                  <>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Confirm Booking
                    </h2>

                    {error && (
                      <Alert variant="error" className="mb-4">
                        {error}
                      </Alert>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any special requests or notes for your appointment..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          rows={3}
                        />
                      </div>

                      {!isAuthenticated && (
                        <Alert variant="info">
                          You'll need to login to complete your booking
                        </Alert>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={handlePrevStep}>
                  {step === 'services' ? 'Cancel' : 'Back'}
                </Button>

                {step !== 'confirm' ? (
                  <Button onClick={handleNextStep} disabled={!canProceed()}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    onClick={handleConfirmBooking}
                    isLoading={createBooking.isPending}
                    disabled={!canProceed()}
                  >
                    {isAuthenticated ? 'Confirm Booking' : 'Login to Book'}
                  </Button>
                )}
              </div>
            </div>

            {/* Sidebar - Booking Summary */}
            <div className="hidden lg:block">
              <BookingSummary />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
