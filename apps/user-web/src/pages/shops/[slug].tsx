import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft, MapPin, Clock, Star, Phone, Globe, Share2,
  MessageSquare, ChevronLeft, ChevronRight, X, Camera, UserPlus, Check,
} from 'lucide-react';
import { Button, Badge, Loading, Alert, Card, Input } from '@/components/ui';
import { ServiceList, StaffPicker, LiveQueueStatus } from '@/components/shop';
import { DatePicker, SlotPicker, BookingSummary } from '@/components/booking';
import { ReviewList } from '@/components/reviews';
import { useShop, useShopQueueStats, useAvailableSlots, useCreateBooking, useShopRatingStats } from '@/hooks';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';
import { format } from 'date-fns';

type BookingStep = 'services' | 'staff' | 'datetime' | 'confirm';

const getStepLabels = (type?: string): Record<BookingStep, string> => ({
  services: type === 'CLINIC' ? 'Consultation Type' : type === 'SALON' ? 'Grooming Services' : 'Select Services',
  staff: type === 'CLINIC' ? 'Choose Specialist' : type === 'SALON' ? 'Choose Stylist' : 'Choose Staff',
  datetime: 'Pick a Time',
  confirm: 'Confirm Details',
});

export default function ShopDetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { isAuthenticated } = useAuthStore();

  const [step, setStep] = React.useState<BookingStep>('services');
  const [error, setError] = React.useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [galleryIndex, setGalleryIndex] = React.useState(0);

  const { data: shop, isLoading: loadingShop } = useShop(slug as string);
  const { data: queueStats } = useShopQueueStats(shop?.id || '');
  const { data: ratingStats } = useShopRatingStats(shop?.id || '');

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
    offerCode,
    bookingForOther,
    customerName,
    customerPhone,
    setBookingForOther,
    setCustomerName,
    setCustomerPhone,
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

  const eligibleStaff = React.useMemo(() => {
    if (!shop?.staff || selectedServices.length === 0) {
      return shop?.staff || [];
    }

    const selectedServiceIds = new Set(selectedServices.map((service) => service.id));

    return shop.staff.filter((person: any) => {
      const personServiceIds = new Set(
        (person.staffServices || []).map((staffService: any) => staffService.serviceId),
      );

      return Array.from(selectedServiceIds).every((serviceId) => personServiceIds.has(serviceId));
    });
  }, [shop?.staff, selectedServices]);

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

  React.useEffect(() => {
    if (!selectedStaff) {
      return;
    }

    const stillEligible = eligibleStaff.some((person) => person.id === selectedStaff.id);
    if (!stillEligible) {
      setStaff(null);
    }
  }, [eligibleStaff, selectedStaff, setStaff]);

  // Gather all photos for gallery
  const allPhotos = React.useMemo(() => {
    if (!shop) return [];
    const photos: string[] = [];
    if (shop.coverUrl) photos.push(shop.coverUrl);
    if (shop.photoUrls?.length) photos.push(...shop.photoUrls);
    return photos;
  }, [shop]);

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
        ...(offerCode ? { offerCode } : {}),
        ...(bookingForOther && customerName ? {
          customerName,
          customerPhone: customerPhone || undefined,
        } : {}),
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

  const heroImage = shop.coverUrl || shop.photoUrls?.[0] || shop.logoUrl;
  const isClinic = shop.tenant?.type === 'CLINIC';
  const isSalon = shop.tenant?.type === 'SALON' || shop.tenant?.type === 'BARBER';

  // Dynamic Theming Variables
  const themeBgColor = isClinic ? 'bg-blue-50/50' : isSalon ? 'bg-zinc-950' : 'bg-[#F8F9FA]';
  const themeNavBgColor = isClinic ? 'bg-white/90' : isSalon ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/80';
  const themeTextColorPrimary = isClinic ? 'text-blue-950' : isSalon ? 'text-white' : 'text-lexo-black';
  const themeTextColorSecondary = isClinic ? 'text-blue-700/70' : isSalon ? 'text-zinc-400' : 'text-lexo-gray';
  const stepLabels = getStepLabels(shop.tenant?.type);

  return (
    <>
      <Head>
        <title>{shop.name} - Overline</title>
        <meta name="description" content={shop.description || `Book an appointment at ${shop.name}`} />
      </Head>

      {/* Photo Gallery Lightbox */}
      {galleryOpen && allPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setGalleryOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={() => setGalleryIndex((i) => (i > 0 ? i - 1 : allPhotos.length - 1))}
            className="absolute left-4 p-2 text-white/80 hover:text-white"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <img
            src={allPhotos[galleryIndex]}
            alt={`Photo ${galleryIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
          />

          <button
            onClick={() => setGalleryIndex((i) => (i < allPhotos.length - 1 ? i + 1 : 0))}
            className="absolute right-4 p-2 text-white/80 hover:text-white"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <div className="absolute bottom-4 text-white/80 text-sm">
            {galleryIndex + 1} / {allPhotos.length}
          </div>
        </div>
      )}

      <div className={`relative min-h-screen pb-32 transition-colors duration-500 ${themeBgColor} overflow-hidden`}>
        {/* Abstract 3D Gradients blending with Theme */}
        {isSalon ? (
          <>
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-purple-900/40 via-blue-900/20 to-transparent blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-rose-900/20 to-transparent blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />
          </>
        ) : (
          <>
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary-400/20 via-purple-400/10 to-transparent blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-accent-400/10 to-transparent blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />
          </>
        )}

        {/* Sleek Breadcrumb/Top Nav */}
        <div className={`${themeNavBgColor} backdrop-blur-md border-b sticky top-0 z-40 transition-all`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <button
              onClick={handlePrevStep}
              className={`flex items-center gap-2 font-semibold transition-colors ${themeTextColorSecondary} hover:${themeTextColorPrimary}`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">
                {step === 'services' ? 'Back to Explore' : 'Previous Step'}
              </span>
            </button>

            {/* Progress Steps */}
            <div className="flex items-center gap-2">
              {(['services', 'staff', 'datetime', 'confirm'] as BookingStep[]).map((s, i) => {
                const stepIndex = ['services', 'staff', 'datetime', 'confirm'].indexOf(step);
                const isActive = i <= stepIndex;

                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isActive
                        ? isSalon ? 'bg-white text-black shadow-md scale-110' : 'bg-lexo-black text-white shadow-md scale-110'
                        : isSalon ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                      {i + 1}
                    </div>
                    {i < 3 && (
                      <div className={`w-8 h-1 rounded-full transition-colors ${i < stepIndex ? (isSalon ? 'bg-white' : 'bg-lexo-black') : (isSalon ? 'bg-zinc-800' : 'bg-gray-200')}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <span className={`text-sm font-bold hidden sm:block ${themeTextColorPrimary}`}>
              {stepLabels[step]}
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

          <div className="lg:grid lg:grid-cols-12 lg:gap-12 relative">

            {/* Main Content (Left) */}
            <div className="lg:col-span-7 xl:col-span-8">

              {/* Massive Header & Cover (Always show on top) */}
              {step === 'services' && (
                <div className="mb-12 relative">
                  {/* Title absolutely massive */}
                  <h1 className={`text-5xl md:text-7xl font-black tracking-tight leading-[0.9] mb-8 relative z-10 text-balance ${themeTextColorPrimary}`}>
                    {shop.name}
                  </h1>

                  {/* Cover Image / Gallery (3D Transform) */}
                  <div
                    className="relative h-64 md:h-96 w-full rounded-[2.5rem] overflow-hidden cursor-pointer group shadow-[0_20px_60px_rgba(0,0,0,0.15)] z-0 -mt-8 md:-mt-12 ml-0 md:ml-12 transform perspective-[2000px] hover:[transform:rotateX(2deg)_rotateY(-2deg)_scale(1.02)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    onClick={() => {
                      if (allPhotos.length > 0) {
                        setGalleryIndex(0);
                        setGalleryOpen(true);
                      }
                    }}
                  >
                    {/* Decorative glass shine over the image on hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-1000 ease-out z-20 pointer-events-none -skew-x-12 w-[150%]" />
                    {heroImage ? (
                      <img
                        src={heroImage}
                        alt={shop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-lexo-black flex items-center justify-center">
                        <span className="text-9xl text-white/20 font-black tracking-tighter">
                          {shop.name.charAt(0)}
                        </span>
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                    {/* Shop Info Overlay */}
                    <div className="absolute bottom-6 left-8 right-8 flex flex-col sm:flex-row justify-between items-end gap-4">
                      <div className="flex gap-3">
                        <Badge variant="success" className="bg-green-500 hover:bg-green-400 text-white font-bold px-4 py-1! rounded-full shadow-lg border-0">Open</Badge>
                        {ratingStats && (
                          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-white font-bold shadow-lg">
                            <Star className="w-4 h-4 text-amber-400 fill-current" />
                            {ratingStats.averageRating?.toFixed(1) || 'New'}
                          </div>
                        )}
                      </div>

                      {allPhotos.length > 1 && (
                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg hover:bg-black/60 transition-colors">
                          <Camera className="w-4 h-4" />
                          {allPhotos.length} Photos
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Minimal Info Row */}
                  <div className={`flex flex-wrap items-center gap-x-8 gap-y-4 mt-8 md:pl-12 ${themeTextColorPrimary}`}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.address}, ${shop.city}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-medium text-lg hover:text-primary-500 transition-colors"
                    >
                      <MapPin className={`w-5 h-5 ${themeTextColorSecondary}`} />
                      {shop.address}, {shop.city}
                    </a>
                    {shop.phone && (
                      <a href={`tel:${shop.phone}`} className="flex items-center gap-2 font-medium text-lg hover:text-indigo-500 transition-colors">
                        <Phone className={`w-5 h-5 ${themeTextColorSecondary}`} />
                        {shop.phone}
                      </a>
                    )}
                  </div>

                  {shop.description && (
                    <p className={`mt-6 md:pl-12 text-lg leading-relaxed max-w-3xl ${themeTextColorSecondary}`}>
                      {shop.description}
                    </p>
                  )}
                </div>
              )}

              {/* Step Content Area */}
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-8">
                {step === 'services' && (
                  <div className="animate-fade-in">
                    {/* Inline Queue Banner embedded here if active */}
                    {shop?.id && (
                      <div className="mb-8">
                        <LiveQueueStatus
                          shopId={shop.id}
                          fallbackStats={queueStats ? {
                            waitingCount: queueStats.waitingCount,
                            estimatedWaitMinutes: queueStats.estimatedWaitMinutes,
                          } : null}
                        />
                      </div>
                    )}

                    <h2 className="text-3xl font-black text-lexo-black mb-8 tracking-tight">
                      Curated Services
                    </h2>
                    {shop.services && shop.services.length > 0 ? (
                      <ServiceList
                        services={shop.services}
                        selectedServices={selectedServices}
                        onToggleService={toggleService}
                      />
                    ) : (
                      <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-lg text-lexo-gray font-medium">No services currently available.</p>
                      </div>
                    )}

                    {/* Reviews injected naturally below services */}
                    <div className="mt-16 pt-12 border-t border-gray-100">
                      <h2 className="text-2xl font-black text-lexo-black mb-8 tracking-tight flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-lexo-gray" />
                        What people are saying
                      </h2>
                      <ReviewList shopId={shop.id} />
                    </div>
                  </div>
                )}

                {step === 'staff' && (
                  <div className="animate-fade-in">
                    <h2 className="text-3xl font-black text-lexo-black mb-8 tracking-tight">
                      Select Professional
                    </h2>
                    {eligibleStaff.length > 0 ? (
                      <StaffPicker
                        staff={eligibleStaff}
                        selectedStaff={selectedStaff}
                        onSelectStaff={setStaff}
                      />
                    ) : (
                      <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-lg text-lexo-gray font-medium">No specific professionals available for request.</p>
                      </div>
                    )}
                  </div>
                )}

                {step === 'datetime' && (
                  <div className="animate-fade-in">
                    <h2 className="text-3xl font-black text-lexo-black mb-8 tracking-tight">
                      When is good?
                    </h2>
                    <DatePicker
                      selectedDate={selectedDate}
                      onSelectDate={setDate}
                    />

                    {selectedDate && (
                      <div className="mt-12 animate-fade-in-up">
                        <h3 className="text-xl font-bold text-lexo-charcoal mb-6">
                          Available Times on {format(selectedDate, 'MMM d, yyyy')}
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
                )}

                {step === 'confirm' && (
                  <div className="animate-fade-in max-w-2xl mx-auto">
                    <h2 className="text-3xl font-black text-lexo-black mb-8 tracking-tight text-center">
                      Final Details
                    </h2>

                    {error && (
                      <Alert variant="error" className="mb-8 rounded-2xl">
                        {error}
                      </Alert>
                    )}

                    <div className="space-y-8">
                      {/* Booking For Someone Else */}
                      <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 transition-all focus-within:ring-2 ring-lexo-black/5">
                        <label className="flex items-center gap-4 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={bookingForOther}
                              onChange={(e) => setBookingForOther(e.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="w-6 h-6 border-2 border-gray-300 rounded-md peer-checked:bg-lexo-black peer-checked:border-lexo-black transition-colors"></div>
                            <Check className="w-4 h-4 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-lexo-gray group-hover:text-lexo-black transition-colors">
                              <UserPlus className="w-5 h-5" />
                            </div>
                            <span className="text-lg font-bold text-lexo-charcoal group-hover:text-lexo-black transition-colors">
                              Booking for someone else?
                            </span>
                          </div>
                        </label>

                        {bookingForOther && (
                          <div className="mt-6 space-y-5 animate-fade-in-up">
                            <Input
                              label="Guest Name"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Enter full name"
                              className="h-14 text-lg bg-white rounded-xl"
                              required
                            />
                            <Input
                              label="Guest Phone (optional)"
                              type="tel"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              placeholder="+91 XXXXX XXXXX"
                              className="h-14 text-lg bg-white rounded-xl"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-lexo-gray uppercase tracking-wider mb-2 pl-2">
                          Special Requests
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Anything we should know before you arrive?"
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-lexo-black focus:border-lexo-black transition-all text-lg resize-none"
                          rows={4}
                        />
                      </div>

                      {!isAuthenticated && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                          <p className="text-amber-800 font-bold mb-3">Almost there!</p>
                          <Button
                            onClick={() => router.push(`/auth/login?redirect=/shops/${slug}`)}
                            className="w-full bg-lexo-black text-white hover:bg-lexo-dark rounded-xl h-12"
                          >
                            Login to Complete Booking
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Action Buttons (Mobile View handled cleanly) */}
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-8 pb-8">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  className="rounded-full h-14 px-8 text-lg font-bold border-2 border-gray-200 text-lexo-charcoal hover:border-lexo-black hover:bg-transparent"
                >
                  {step === 'services' ? 'Cancel' : 'Go Back'}
                </Button>

                {step !== 'confirm' ? (
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceed()}
                    className="rounded-full h-14 px-8 text-lg font-bold bg-lexo-black hover:bg-lexo-dark text-white shadow-xl hover:-translate-y-1 transition-transform"
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    onClick={handleConfirmBooking}
                    isLoading={createBooking.isPending}
                    disabled={!canProceed() || (!isAuthenticated)}
                    className="rounded-full h-14 px-12 text-lg font-black bg-lexo-black hover:bg-lexo-dark text-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-transform"
                  >
                    Confirm & Book Now
                  </Button>
                )}
              </div>

            </div>

            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 relative">
              <div className="sticky top-24 pt-6 perspective-[1500px]">
                <div className="transform transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-2 hover:[transform:rotateX(2deg)_rotateY(-1deg)_scale(1.02)] shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.15)] rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/40">
                  <BookingSummary />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
