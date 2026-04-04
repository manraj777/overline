import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft, MapPin, Clock, Star, Phone, Share2,
  MessageSquare, ChevronLeft, ChevronRight, X, Camera, UserPlus, Check,
} from 'lucide-react';
import { Button, Badge, Loading, Alert, Input } from '@/components/ui';
import { ServiceList, StaffPicker, LiveQueueStatus } from '@/components/shop';
import { DatePicker, SlotPicker, BookingSummary } from '@/components/booking';
import { ReviewList } from '@/components/reviews';
import { useShop, useShopQueueStats, useAvailableSlots, useCreateBooking, useShopRatingStats } from '@/hooks';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';
import { format } from 'date-fns';
import { saveQueueSession } from '@/lib/queue-session';

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

  React.useEffect(() => {
    if (shop) setShop(shop);
  }, [shop, setShop]);

  React.useEffect(() => {
    return () => reset();
  }, [reset]);

  React.useEffect(() => {
    if (!selectedStaff) return;
    const stillEligible = eligibleStaff.some((person) => person.id === selectedStaff.id);
    if (!stillEligible) setStaff(null);
  }, [eligibleStaff, selectedStaff, setStaff]);

  const allPhotos = React.useMemo(() => {
    if (!shop) return [];
    const photos: string[] = [];
    if (shop.coverUrl) photos.push(shop.coverUrl);
    if (shop.photoUrls?.length) photos.push(...shop.photoUrls);
    return photos;
  }, [shop]);

  const steps: BookingStep[] = ['services', 'staff', 'datetime', 'confirm'];

  const handleNextStep = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const handlePrevStep = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    else router.back();
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

  const canProceed = () => {
    switch (step) {
      case 'services': return selectedServices.length > 0;
      case 'staff': return true;
      case 'datetime': return selectedDate && selectedSlot;
      case 'confirm': return true;
      default: return false;
    }
  };

  if (loadingShop) return <Loading text="Loading shop details..." />;

  if (!shop) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-on-surface mb-2">Shop not found</h1>
        <p className="text-on-surface-variant mb-6">The shop you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => router.push('/explore')} className="btn-primary px-8 py-3">
          Explore Shops
        </button>
      </div>
    );
  }

  const heroImage = shop.coverUrl || shop.photoUrls?.[0] || shop.logoUrl;
  const stepLabels = getStepLabels(shop.tenant?.type);
  const stepIndex = steps.indexOf(step);

  return (
    <>
      <Head>
        <title>{shop.name} — Overline</title>
        <meta name="description" content={shop.description || `Book an appointment at ${shop.name}`} />
      </Head>

      {/* Photo Gallery Lightbox */}
      {galleryOpen && allPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-2xl">
          <button onClick={() => setGalleryOpen(false)} className="absolute top-6 right-6 p-2 text-white/60 hover:text-white z-10">
            <X className="w-6 h-6" />
          </button>
          <button onClick={() => setGalleryIndex((i) => (i > 0 ? i - 1 : allPhotos.length - 1))} className="absolute left-6 p-2 text-white/60 hover:text-white">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <img src={allPhotos[galleryIndex]} alt={`Photo ${galleryIndex + 1}`} className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl" />
          <button onClick={() => setGalleryIndex((i) => (i < allPhotos.length - 1 ? i + 1 : 0))} className="absolute right-6 p-2 text-white/60 hover:text-white">
            <ChevronRight className="w-8 h-8" />
          </button>
          <div className="absolute bottom-6 text-white/50 text-sm font-bold">{galleryIndex + 1} / {allPhotos.length}</div>
        </div>
      )}

      <div className="min-h-screen bg-surface pb-32 overflow-hidden">
        {/* ── Sticky Progress Bar ── */}
        <div className="bg-white/70 backdrop-blur-xl border-b border-outline-variant/10 sticky top-16 z-30">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
            <button
              onClick={handlePrevStep}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary font-semibold transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{step === 'services' ? 'Back' : 'Previous'}</span>
            </button>

            {/* Step Indicators */}
            <div className="flex items-center gap-1.5">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                    i <= stepIndex
                      ? 'bg-primary text-white shadow-button scale-105'
                      : 'bg-surface-container-high text-outline'
                  }`}>
                    {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < 3 && (
                    <div className={`w-6 lg:w-10 h-0.5 rounded-full transition-colors ${
                      i < stepIndex ? 'bg-primary' : 'bg-surface-container-high'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            <span className="text-xs font-bold tracking-widest text-outline uppercase hidden sm:block">
              {stepLabels[step]}
            </span>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 relative">
            {/* ── Main Content ── */}
            <div className="lg:col-span-7 xl:col-span-8">
              {/* Hero Header — only on services step */}
              {step === 'services' && (
                <div className="mb-10">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-on-surface mb-6 leading-tight">
                    {shop.name}
                  </h1>

                  {/* Cover Image */}
                  <div
                    className="relative h-64 md:h-80 w-full rounded-3xl overflow-hidden cursor-pointer group shadow-card-hover"
                    onClick={() => { if (allPhotos.length > 0) { setGalleryIndex(0); setGalleryOpen(true); } }}
                  >
                    {heroImage ? (
                      <img src={heroImage} alt={shop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <span className="text-8xl text-white/20 font-black">{shop.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                      <div className="flex gap-2">
                        <span className="px-3 py-1 rounded-lg bg-tertiary text-white text-[10px] font-black uppercase tracking-widest">Open</span>
                        {ratingStats && (
                          <span className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 backdrop-blur-md text-white text-xs font-bold">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            {ratingStats.averageRating?.toFixed(1) || 'New'}
                          </span>
                        )}
                      </div>
                      {allPhotos.length > 1 && (
                        <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white text-xs font-bold">
                          <Camera className="w-3.5 h-3.5" /> {allPhotos.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-6 text-on-surface">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.address}, ${shop.city}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-outline" />
                      {shop.address}, {shop.city}
                    </a>
                    {shop.phone && (
                      <a href={`tel:${shop.phone}`} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                        <Phone className="w-4 h-4 text-outline" />
                        {shop.phone}
                      </a>
                    )}
                    <button className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>

                  {shop.description && (
                    <p className="mt-4 text-on-surface-variant leading-relaxed max-w-3xl">{shop.description}</p>
                  )}
                </div>
              )}

              {/* Step Content */}
              <div className="card-m3 p-6 sm:p-8 mb-8">
                {step === 'services' && (
                  <div className="animate-fade-in">
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
                    <h2 className="text-2xl font-black tracking-tight text-on-surface mb-6">Curated Services</h2>
                    {shop.services && shop.services.length > 0 ? (
                      <ServiceList
                        services={shop.services}
                        selectedServices={selectedServices}
                        onToggleService={toggleService}
                      />
                    ) : (
                      <div className="p-10 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/20">
                        <p className="text-on-surface-variant font-medium">No services currently available.</p>
                      </div>
                    )}

                    <div className="mt-12 pt-8 border-t border-outline-variant/10">
                      <h2 className="text-xl font-black tracking-tight text-on-surface mb-6 flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-outline" />
                        What people are saying
                      </h2>
                      <ReviewList shopId={shop.id} />
                    </div>
                  </div>
                )}

                {step === 'staff' && (
                  <div className="animate-fade-in">
                    <h2 className="text-2xl font-black tracking-tight text-on-surface mb-6">Select Professional</h2>
                    {eligibleStaff.length > 0 ? (
                      <StaffPicker staff={eligibleStaff} selectedStaff={selectedStaff} onSelectStaff={setStaff} />
                    ) : (
                      <div className="p-10 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/20">
                        <p className="text-on-surface-variant font-medium">
                          {selectedServices.length > 0
                            ? 'No professionals are currently mapped for the selected service(s).'
                            : 'No specific professionals available.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {step === 'datetime' && (
                  <div className="animate-fade-in">
                    <h2 className="text-2xl font-black tracking-tight text-on-surface mb-6">When is good?</h2>
                    <DatePicker selectedDate={selectedDate} onSelectDate={setDate} />
                    {selectedDate && (
                      <div className="mt-10 animate-fade-in-up">
                        <h3 className="text-lg font-bold text-on-surface mb-4">
                          Available on {format(selectedDate, 'MMM d, yyyy')}
                        </h3>
                        <SlotPicker slots={slots || []} selectedSlot={selectedSlot} onSelectSlot={setSlot} isLoading={loadingSlots} />
                      </div>
                    )}
                  </div>
                )}

                {step === 'confirm' && (
                  <div className="animate-fade-in max-w-2xl mx-auto">
                    <h2 className="text-2xl font-black tracking-tight text-on-surface mb-8 text-center">Final Details</h2>
                    {error && <Alert variant="error" className="mb-6">{error}</Alert>}

                    <div className="space-y-6">
                      {/* Booking For Someone Else */}
                      <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/10">
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
                          <div className="mt-5 space-y-4 animate-fade-in-up">
                            <div className="space-y-2">
                              <label className="label-m3">Guest Name</label>
                              <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Enter full name"
                                className="input-m3"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="label-m3">Guest Phone (optional)</label>
                              <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="+91 XXXXX XXXXX"
                                className="input-m3"
                              />
                            </div>
                          </div>
                        )}
                      </div>

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

                      {!isAuthenticated && (
                        <div className="bg-tertiary-fixed/30 border border-tertiary/20 rounded-2xl p-5 text-center">
                          <p className="text-on-surface font-bold mb-3">Almost there!</p>
                          <button
                            onClick={() => router.push(`/auth/login?redirect=/shops/${slug}`)}
                            className="w-full btn-primary py-3"
                          >
                            Login to Complete Booking
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-6 pb-8">
                <button
                  onClick={handlePrevStep}
                  className="btn-tonal px-8 py-3.5 rounded-xl font-bold"
                >
                  {step === 'services' ? 'Cancel' : 'Go Back'}
                </button>

                {step !== 'confirm' ? (
                  <button
                    onClick={handleNextStep}
                    disabled={!canProceed()}
                    className="btn-primary px-10 py-3.5 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                ) : (
                  <Button
                    onClick={handleConfirmBooking}
                    isLoading={createBooking.isPending}
                    disabled={!canProceed() || !isAuthenticated}
                    className="btn-primary px-12 py-3.5 rounded-xl font-black shadow-button-hover"
                  >
                    Confirm & Book Now
                  </Button>
                )}
              </div>
            </div>

            {/* ── Sticky Sidebar Summary ── */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 relative">
              <div className="sticky top-36 pt-2">
                <div className="card-m3 overflow-hidden">
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
