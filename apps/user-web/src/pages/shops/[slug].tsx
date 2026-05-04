import React from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import {
  ArrowLeft, MapPin, Clock, Star, Phone, Share2,
  MessageSquare, ChevronLeft, ChevronRight, X, Camera, Check, RefreshCw,
} from 'lucide-react';
import { Badge, Loading } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ServiceList, LiveQueueStatus, ShopMap } from '@/components/shop';
import { BookingSummary } from '@/components/booking';
import { ReviewList } from '@/components/reviews';
import { useShop, useShopQueueStats, useShopRatingStats } from '@/hooks';
import { useBookingStore } from '@/stores/booking';
import { format } from 'date-fns';
import { SeoHead, jsonLd } from '@/components/seo/SeoHead';
import type { ShopWithDetails } from '@/types';

type BookingStep = 'services' | 'staff' | 'datetime' | 'confirm';

interface ShopPageProps {
  initialShop: ShopWithDetails | null;
  slug: string;
}

const getStepLabels = (type?: string): Record<BookingStep, string> => ({
  services: type === 'CLINIC' ? 'Consultation Type' : type === 'SALON' ? 'Grooming Services' : 'Select Services',
  staff: type === 'CLINIC' ? 'Choose Specialist' : type === 'SALON' ? 'Choose Stylist' : 'Choose Staff',
  datetime: 'Pick a Time',
  confirm: 'Confirm Details',
});

export default function ShopDetailPage({ initialShop, slug: ssrSlug }: ShopPageProps) {
  const router = useRouter();
  const slug = (router.query.slug as string) || ssrSlug;

  const [step] = React.useState<BookingStep>('services');
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [galleryIndex, setGalleryIndex] = React.useState(0);

  const { data: shop, isLoading: loadingShop, refetch: refetchShop } = useShop(slug, initialShop || undefined);
  const { data: queueStats, refetch: refetchQueue } = useShopQueueStats(shop?.id || '');
  const { data: ratingStats, refetch: refetchRating } = useShopRatingStats(shop?.id || '');

  const [activeTab, setActiveTab] = React.useState('Book Service');
  const tabs = ['Overview', 'Book Service', 'Team', 'Reviews', 'Photos', 'Info'];

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastRefreshAt, setLastRefreshAt] = React.useState<Date | null>(null);

  const {
    selectedServices,
    selectedStaff,
    shop: storeShop,
    setShop,
    clearCartAndSetShop,
    toggleService,
    setStaff,
  } = useBookingStore();

  const [pendingServiceToggle, setPendingServiceToggle] = React.useState<any>(null);
  const [showCartConflictModal, setShowCartConflictModal] = React.useState(false);
  const [fastSearchOpen, setFastSearchOpen] = React.useState(false);
  const [fastSearchStaffId, setFastSearchStaffId] = React.useState<string | null>(null);

  const isStaffAbsent = React.useCallback((person: any) => {
    if (!person) return false;
    const now = new Date();
    const todayStr = format(now, 'EEEE').toUpperCase();
    const wh = person.staffWorkingHours?.find((h: any) => h.dayOfWeek === todayStr);
    if (wh?.isOff) return true;
    
    if (person.staffTimeOffs?.length > 0) {
      return person.staffTimeOffs.some((to: any) => {
        const start = new Date(to.startTime);
        const end = new Date(to.endTime);
        return now >= start && now <= end;
      });
    }
    return false;
  }, []);

  const todayStr = React.useMemo(() => format(new Date(), 'EEEE').toUpperCase(), []);
  const todayHours = React.useMemo(() => shop?.workingHours?.find((h: any) => h.dayOfWeek === todayStr), [shop, todayStr]);
  const isShopClosedToday = !shop || !todayHours || todayHours.isClosed;


  const eligibleStaff = React.useMemo(() => {
    if (!shop?.staff || selectedServices.length === 0) {
      return (shop?.staff || []).filter((person: any) => !isStaffAbsent(person));
    }
    const selectedServiceIds = new Set(selectedServices.map((service) => service.id));
    return shop.staff.filter((person: any) => {
      if (isStaffAbsent(person)) {
        return false;
      }
      const personServiceIds = new Set(
        (person.staffServices || []).map((staffService: any) => staffService.serviceId),
      );
      return Array.from(selectedServiceIds).every((serviceId) => personServiceIds.has(serviceId));
    });
  }, [shop?.staff, selectedServices, isStaffAbsent]);

  React.useEffect(() => {
    if (eligibleStaff.length === 0) {
      setStaff(null);
      return;
    }

    if (!selectedStaff || !eligibleStaff.some((person) => person.id === selectedStaff.id)) {
      setStaff(eligibleStaff[0]);
    }
  }, [eligibleStaff, selectedStaff, setStaff]);

  React.useEffect(() => {
    if (!selectedStaff) return;
    const stillEligible = eligibleStaff.some((person) => person.id === selectedStaff.id);
    if (!stillEligible) setStaff(null);
  }, [eligibleStaff, selectedStaff, setStaff]);

  const handleToggleService = (service: any) => {
    if (storeShop && storeShop.id !== shop?.id && selectedServices.length > 0) {
      setPendingServiceToggle(service);
      setShowCartConflictModal(true);
    } else {
      if (!storeShop || storeShop.id !== shop?.id) {
        if (shop) setShop(shop);
      }
      toggleService(service);
    }
  };

  const confirmReplaceCart = () => {
    if (shop) clearCartAndSetShop(shop);
    if (pendingServiceToggle) toggleService(pendingServiceToggle);
    setPendingServiceToggle(null);
    setShowCartConflictModal(false);
  };

  const cancelReplaceCart = () => {
    setPendingServiceToggle(null);
    setShowCartConflictModal(false);
  };

  const allPhotos = React.useMemo(() => {
    if (!shop) return [];
    const photos: string[] = [];
    if (shop.coverUrl) photos.push(shop.coverUrl);
    if (shop.photoUrls?.length) photos.push(...shop.photoUrls);
    return photos;
  }, [shop]);

  const servicesByCategory = React.useMemo(() => {
    const grouped = new Map<string, any[]>();
    const source = shop?.services || [];

    source.forEach((service) => {
      const category = (service.category || 'Popular').trim();
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(service);
    });

    return Array.from(grouped.entries()).map(([category, services]) => ({ category, services }));
  }, [shop?.services]);

  const serviceStaffLabels = React.useMemo(() => {
    const labels: Record<string, string> = {};
    if (!shop?.services?.length || !shop?.staff?.length) {
      return labels;
    }

    for (const service of shop.services) {
      const names = shop.staff
        .filter((person: any) => !isStaffAbsent(person))
        .filter((person: any) => (person.staffServices || []).some((ss: any) => ss.serviceId === service.id))
        .map((person: any) => person.name)
        .filter(Boolean);
      if (names.length > 0) {
        labels[service.id] = names.join(', ');
      }
    }

    return labels;
  }, [shop?.services, shop?.staff, isStaffAbsent]);

  const steps: BookingStep[] = ['services'];

  const handlePrevStep = () => {
    router.back();
  };

  const handleNextStep = () => {
    router.push('/cart');
  };

  const handleShareShop = async () => {
    if (!shop) return;

    const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://overline.in/shops/${shop.slug}`;
    const sharePayload = {
      title: shop.name,
      text: `Book services at ${shop.name} on Overline`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      alert('Shop link copied to clipboard');
    } catch {
      // Ignore cancelled share flows.
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchShop(), refetchQueue(), refetchRating()]);
      setLastRefreshAt(new Date());
    } finally {
      setIsRefreshing(false);
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

  const shopForSeo = shop || initialShop;
  const aggregateServices = shopForSeo?.services || [];
  const shopPrices = aggregateServices.map((s) => s.price).filter((p): p is number => typeof p === 'number' && !isNaN(p));
  const priceRange = shopPrices.length
    ? `\u20B9${Math.min(...shopPrices)} - \u20B9${Math.max(...shopPrices)}`
    : undefined;
  const googleRating =
    typeof shopForSeo?.googleRating === 'number'
      ? shopForSeo.googleRating
      : shopForSeo?.googleRating
      ? parseFloat(String(shopForSeo.googleRating))
      : undefined;
  const seoTitle = shopForSeo
    ? `${shopForSeo.name} \u2014 Book Online${shopForSeo.city ? ` in ${shopForSeo.city}` : ''}`
    : 'Shop';
  const seoDescription = shopForSeo
    ? (shopForSeo.description?.slice(0, 158) ||
        `Book appointments online at ${shopForSeo.name}${shopForSeo.city ? `, ${shopForSeo.city}` : ''}. Skip the queue with real-time availability on Overline.`)
    : 'Book an appointment on Overline.';
  const seoCanonical = shopForSeo ? `/shops/${shopForSeo.slug || slug}` : `/shops/${slug}`;
  const seoImage = shopForSeo?.coverUrl || shopForSeo?.photoUrls?.[0] || undefined;

  const seoJsonLd = shopForSeo
    ? [
        jsonLd.localBusiness({
          id: shopForSeo.id,
          slug: shopForSeo.slug,
          name: shopForSeo.name,
          description: shopForSeo.description,
          address: shopForSeo.address,
          city: shopForSeo.city,
          state: shopForSeo.state,
          postalCode: shopForSeo.postalCode,
          country: shopForSeo.country,
          latitude: shopForSeo.latitude,
          longitude: shopForSeo.longitude,
          phone: shopForSeo.phone,
          email: shopForSeo.email,
          coverImage: shopForSeo.coverUrl,
          photos: shopForSeo.photoUrls,
          priceRange,
          shopType: shopForSeo.tenant?.type,
          rating: googleRating,
          reviewCount: shopForSeo.googleReviewsCount,
          workingHours: shopForSeo.workingHours as any,
          services: aggregateServices.map((s) => ({ id: s.id, name: s.name, price: s.price })),
        }),
        jsonLd.breadcrumbs([
          { name: 'Home', url: '/' },
          { name: 'Explore', url: '/explore' },
          { name: shopForSeo.name, url: `/shops/${shopForSeo.slug || slug}` },
        ]),
      ]
    : undefined;

  return (
    <>
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        canonical={seoCanonical}
        ogImage={seoImage}
        ogType="business.business"
        jsonLd={seoJsonLd}
      />

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

      {/* Cart Conflict Modal */}
      <ConfirmModal
        isOpen={showCartConflictModal}
        title="Start new booking?"
        description="Adding this service will clear your cart from the other shop. Do you want to continue?"
        confirmLabel="Yes, start fresh"
        cancelLabel="Cancel"
        onConfirm={confirmReplaceCart}
        onCancel={cancelReplaceCart}
      />

      {/* Fast Search Modal */}
      {fastSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
              <h2 className="text-xl font-black text-on-surface">Fast Menu Search</h2>
              <button 
                onClick={() => setFastSearchOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {!fastSearchStaffId ? (
                <div>
                  <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-4">Select Staff Member</h3>
                  <div className="space-y-3">
                    {shop?.staff?.length > 0 ? shop.staff.map((staff: any) => (
                      <button
                        key={staff.id}
                        onClick={() => setFastSearchStaffId(staff.id)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/10"
                      >
                        <span className="font-bold text-on-surface text-lg">{staff.name}</span>
                        <ChevronRight className="w-5 h-5 text-outline" />
                      </button>
                    )) : (
                      <p className="text-on-surface-variant">No staff found.</p>
                    )}
                  </div>
                </div>
              ) : (() => {
                const selectedStaffData = shop?.staff?.find((s: any) => s.id === fastSearchStaffId);
                const staffServiceIds = new Set((selectedStaffData?.staffServices || []).map((ss: any) => ss.serviceId));
                const staffServices = shop?.services?.filter((s: any) => staffServiceIds.has(s.id)) || [];

                return (
                  <div>
                    <button 
                      onClick={() => setFastSearchStaffId(null)}
                      className="flex items-center gap-2 text-primary font-bold text-sm mb-6 hover:underline"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Staff
                    </button>
                    <h3 className="text-xl font-black text-on-surface mb-6">{selectedStaffData?.name}'s Services</h3>
                    
                    {staffServices.length > 0 ? (
                      <ServiceList
                        services={staffServices}
                        selectedServices={selectedServices}
                        onToggleService={handleToggleService}
                      />
                    ) : (
                      <p className="text-on-surface-variant font-medium text-center p-6 bg-surface-container-low rounded-2xl">
                        No services found for this staff member.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Floating Fast Search Button */}
      {step === 'services' && !fastSearchOpen && (
        <button
          onClick={() => {
            setFastSearchStaffId(null);
            setFastSearchOpen(true);
          }}
          className="fixed bottom-32 lg:bottom-10 right-6 lg:right-10 w-16 h-16 bg-primary text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-center z-40 hover:-translate-y-1 transition-all duration-300"
          title="Fast Menu Search"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}

      <div className="min-h-screen bg-surface pb-32 overflow-hidden">
        {/* ── Sticky Progress Bar ── */}
        <div className="bg-surface-container-lowest/70 dark:bg-surface/70 backdrop-blur-xl border-b border-outline-variant/10 sticky top-16 z-30">
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
                        <span className={`px-3 py-1 rounded-lg text-white text-[10px] font-black uppercase tracking-widest ${isShopClosedToday ? 'bg-error' : 'bg-tertiary'}`}>{isShopClosedToday ? 'Closed' : 'Open'}</span>
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
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6 text-on-surface">
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
                    <button
                      onClick={handleShareShop}
                      className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
                      disabled={isRefreshing}
                      title="Refresh shop details"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing' : 'Refresh'}
                    </button>
                  </div>

                  <div className="mt-3 text-xs font-semibold tracking-wide text-outline">
                    Auto-refreshes every 30s{lastRefreshAt ? ` • Last refresh ${format(lastRefreshAt, 'HH:mm:ss')}` : ''}
                  </div>

                  {shop.latitude && shop.longitude && (
                    <div className="mt-8 h-64 w-full rounded-3xl overflow-hidden shadow-sm">
                      <ShopMap
                        shops={[shop as any]}
                        userLocation={{ lat: Number(shop.latitude), lng: Number(shop.longitude) }}
                        zoom={15}
                      />
                    </div>
                  )}

                  {shop.description && (
                    <p className="mt-4 text-on-surface-variant leading-relaxed max-w-3xl">{shop.description}</p>
                  )}

                  {/* Zomato-style Tabs */}
                  <div className="mt-10 overflow-x-auto no-scrollbar border-b border-outline-variant/20 sticky top-[120px] z-20 bg-surface/95 backdrop-blur-md">
                    <div className="flex items-center gap-6 min-w-max px-2">
                      {tabs.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`pb-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
                            activeTab === tab
                              ? 'text-primary'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {tab}
                          {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step Content */}
              <div className="card-m3 p-6 sm:p-8 mb-8">
                {step === 'services' && activeTab === 'Book Service' && (
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
                      <div className="space-y-10">
                        {servicesByCategory.map((group) => (
                          <section key={group.category}>
                            <h3 className="text-lg font-black tracking-tight text-on-surface mb-4">{group.category}</h3>
                            <ServiceList
                              services={group.services}
                              selectedServices={selectedServices}
                              onToggleService={handleToggleService}
                              staffLabelByServiceId={serviceStaffLabels}
                            />
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/20">
                        <p className="text-on-surface-variant font-medium">No services currently available.</p>
                      </div>
                    )}

                  </div>
                )}

                {step === 'services' && activeTab === 'Overview' && (
                  <div className="animate-fade-in space-y-8">
                     <h2 className="text-2xl font-black tracking-tight text-on-surface mb-4">About {shop.name}</h2>
                     <p className="text-on-surface-variant leading-relaxed text-lg">{shop.description || 'Welcome to our shop.'}</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                          <h3 className="font-bold text-on-surface flex items-center gap-2 mb-3"><Clock className="w-5 h-5 text-primary" /> Today's Hours</h3>
                          <p className="text-on-surface-variant font-bold">
                            {isShopClosedToday ? (
                              <span className="text-error">Closed Today</span>
                            ) : (
                              <span>Open • Closes at {todayHours.closeTime}</span>
                            )}
                          </p>
                       </div>
                       <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                          <h3 className="font-bold text-on-surface flex items-center gap-2 mb-3"><MapPin className="w-5 h-5 text-primary" /> Location</h3>
                          <p className="text-on-surface-variant">{shop.address}</p>
                       </div>
                     </div>
                  </div>
                )}

                {step === 'services' && activeTab === 'Reviews' && (
                  <div className="animate-fade-in">
                    <h2 className="text-xl font-black tracking-tight text-on-surface mb-6 flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-outline" />
                      What people are saying
                    </h2>
                    <ReviewList shopId={shop.id} />
                  </div>
                )}

                {step === 'services' && activeTab === 'Photos' && (
                  <div className="animate-fade-in">
                    <h2 className="text-xl font-black tracking-tight text-on-surface mb-6 flex items-center gap-3">
                      <Camera className="w-5 h-5 text-outline" />
                      Photos
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                       {allPhotos.map((photo, i) => (
                         <div key={i} className="aspect-square rounded-2xl overflow-hidden cursor-pointer hover:opacity-90" onClick={() => { setGalleryIndex(i); setGalleryOpen(true); }}>
                           <img src={photo} alt="" className="w-full h-full object-cover" />
                         </div>
                       ))}
                       {allPhotos.length === 0 && <p className="text-on-surface-variant">No photos yet.</p>}
                    </div>
                  </div>
                )}

                {step === 'services' && activeTab === 'Info' && (
                  <div className="animate-fade-in space-y-6">
                    <h2 className="text-xl font-black tracking-tight text-on-surface mb-6 flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-outline" />
                      Contact & Info
                    </h2>
                    <p className="text-on-surface-variant">Address: {shop.address}, {shop.city}, {shop.postalCode}</p>
                    {shop.phone && <p className="text-on-surface-variant">Phone: {shop.phone}</p>}
                    {shop.email && <p className="text-on-surface-variant">Email: {shop.email}</p>}
                    <p className="text-on-surface-variant mt-4">We accept cash, UPI, and major cards.</p>
                  </div>
                )}

                {step === 'services' && activeTab === 'Team' && (
                  <div className="animate-fade-in space-y-8">
                    <h2 className="text-2xl font-black tracking-tight text-on-surface mb-6">Our Experts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {shop.staff?.map((person: any) => {
                        const personServiceIds = new Set((person.staffServices || []).map((ss: any) => ss.serviceId));
                        const personServices = shop.services?.filter((s: any) => personServiceIds.has(s.id)) || [];
                        const isAbsent = isStaffAbsent(person);

                        return (
                          <div key={person.id} className={`p-6 rounded-3xl bg-surface-container-low border transition-all ${isAbsent ? 'opacity-60 grayscale border-outline-variant/5' : 'border-outline-variant/10 hover:border-primary/20'}`}>
                             <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center relative">
                                   {person.avatarUrl ? (
                                     <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                                   ) : (
                                     <span className="text-2xl font-black text-primary">{person.name?.charAt(0)}</span>
                                   )}
                                </div>
                                <div>
                                   <div className="flex items-center gap-2">
                                     <h3 className="text-xl font-black text-on-surface leading-tight">{person.name}</h3>
                                     {isAbsent && <span className="px-2 py-0.5 rounded-md bg-error/10 text-error text-[10px] font-black uppercase">Absent</span>}
                                   </div>
                                   <p className="text-sm font-bold text-primary uppercase tracking-widest">{person.role || 'Professional'}</p>
                                </div>
                             </div>
                             
                             <div className="space-y-3">
                                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Services</p>
                                {personServices.length > 0 ? (
                                  <div className="space-y-2">
                                    {personServices.map((service: any) => (
                                      <div key={service.id} className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface-container transition-colors border border-outline-variant/5">
                                         <div className="flex flex-col">
                                            <span className="text-sm font-black text-on-surface">{service.name}</span>
                                            <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                                               <Clock className="w-3 h-3" /> {service.durationMinutes} min
                                            </span>
                                         </div>
                                         <button 
                                          onClick={() => {
                                            if (isAbsent) return;
                                            if (!selectedServices.some(s => s.id === service.id)) {
                                              handleToggleService(service);
                                            }
                                          }}
                                          disabled={isAbsent}
                                          className="btn-tonal px-3 py-1.5 text-xs font-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                         >
                                             ADD
                                         </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-on-surface-variant">No specific services assigned.</p>
                                )}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {step === 'services' && selectedServices.length > 0 && (
                <div className="fixed bottom-32 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none animate-fade-in-up">
                  <div className="bg-primary text-white rounded-2xl shadow-glass-strong w-full max-w-lg lg:max-w-2xl px-6 py-4 flex items-center justify-between pointer-events-auto">
                    <div>
                      <p className="text-sm font-medium text-white/80 uppercase tracking-widest">{selectedServices.length} ITEM{selectedServices.length > 1 ? 'S' : ''} ADDED</p>
                      <p className="font-black text-xl">
                        ₹{selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0)}
                      </p>
                    </div>
                    <button
                      onClick={handleNextStep}
                      className="flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-black shadow-button hover:scale-105 active:scale-95 transition-all"
                    >
                      View Cart <ChevronRight className="w-5 h-5 -ml-1" />
                    </button>
                  </div>
                </div>
              )}
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

export const getServerSideProps: GetServerSideProps<ShopPageProps> = async ({ params, res }) => {
  const slug = (params?.slug as string) || '';
  // Reject obviously-bad slugs with a 301 to /explore instead of a 404 page.
  // "undefined" leaks in when a buggy link is built from a shop object that
  // lacks a slug; empty slugs come from /shops/ with a trailing slash.
  const isBadSlug = !slug || slug.trim() === '' || slug === 'undefined' || slug === 'null';
  if (isBadSlug) {
    return {
      redirect: { destination: '/explore', permanent: false },
    };
  }

  const backendUrl = (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '') ||
    'https://api.overline.in'
  ).replace(/\/$/, '');

  try {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 6000);
    const response = await fetch(`${backendUrl}/api/v1/shops/${encodeURIComponent(slug)}`, {
      signal: ac.signal,
      headers: { accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (response.status === 404) return { notFound: true };
    if (!response.ok) {
      // Fall back to client-side fetch; don't 500 the page.
      return { props: { initialShop: null, slug } };
    }

    const initialShop = (await response.json()) as ShopWithDetails;

    // Cache at the CDN for 60s, allow stale-while-revalidate for 5m.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    return { props: { initialShop, slug } };
  } catch {
    return { props: { initialShop: null, slug } };
  }
};
