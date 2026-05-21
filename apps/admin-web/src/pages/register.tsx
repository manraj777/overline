import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui';
import { useRegisterShop } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import Link from 'next/link';
import {
  Check,
  User,
  Store,
  MapPin,
  Mail,
  Shield,
  Smartphone,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Building2,
  Sparkles,
} from 'lucide-react';
import LocationPicker, { type LocationData } from '@/components/register/LocationPicker';

// ─── Form Data ──────────────────────────────────────────────
interface RegisterForm {
  // Step 1: Shop Basics + Owner
  shopName: string;
  shopType: 'SALON' | 'CLINIC' | 'BARBER' | 'SPA' | 'OTHER';
  shopDescription: string;
  ownerName: string;
  email: string;
  password: string;
  ownerPhone: string;
  // Step 3: Address
  building: string;
  floor: string;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  landmark: string;
}

const STEPS = [
  { label: 'Basics & Owner', icon: Store },
  { label: 'Verification', icon: Shield },
  { label: 'Location', icon: MapPin },
];

const TOTAL_STEPS = 3;

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const registerShop = useRegisterShop();

  const [step, setStep] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  // Email verification state
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [emailSending, setEmailSending] = React.useState(false);
  const [emailOtp, setEmailOtp] = React.useState('');
  const [emailOtpSent, setEmailOtpSent] = React.useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = React.useState(false);

  // Phone verification state
  const [phoneVerified, setPhoneVerified] = React.useState(false);
  const [phoneSending, setPhoneSending] = React.useState(false);
  const [phoneOtp, setPhoneOtp] = React.useState('');
  const [otpSent, setOtpSent] = React.useState(false);
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);

  // Location state
  const [locationData, setLocationData] = React.useState<LocationData | undefined>();

  const {
    register,
    handleSubmit,
    watch,
    control,
    trigger,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    defaultValues: {
      shopType: 'SALON',
    },
  });

  const formValues = watch();

  React.useEffect(() => {
    if (isAuthenticated) router.replace('/owner/dashboard');
  }, [isAuthenticated, router]);

  // ── Step Navigation ──
  const canGoNext = (): boolean => {
    if (step === 1) return !!formValues.shopName && !!formValues.shopType && !!formValues.ownerName && !!formValues.email && !!formValues.password && !!formValues.ownerPhone;
    if (step === 2) return phoneVerified; // email verify is optional but phone is required
    if (step === 3) return !!locationData?.lat && !!formValues.city; // must have picked location and city
    return true;
  };

  const onNextStep = async () => {
    setError(null);
    let isValid = true;

    if (step === 1) isValid = await trigger(['shopName', 'shopType', 'ownerName', 'email', 'password', 'ownerPhone']);
    else if (step === 3) isValid = await trigger(['city']);

    if (isValid && canGoNext()) setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    else if (step === 2 && !phoneVerified) setError('Please verify your phone number before proceeding.');
  };

  const onPrevStep = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // ── Backend Phone OTP ──
  const handleSendPhoneOtp = async () => {
    const phone = getValues('ownerPhone');
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid phone number first');
      return;
    }
    setError(null);
    setPhoneSending(true);
    try {
      await api.post('/otp/send', {
        phone,
        purpose: 'REGISTER',
      });
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to send OTP');
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length < 6) return;
    setVerifyingOtp(true);
    setError(null);
    try {
      await api.post('/otp/verify', {
        phone: getValues('ownerPhone'),
        otp: phoneOtp,
        purpose: 'REGISTER',
      });
      setPhoneVerified(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Invalid OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const email = getValues('email');
    if (!email) {
      setError('Enter a valid email first');
      return;
    }
    setError(null);
    setEmailSending(true);
    try {
      await api.post('/otp/email/send', {
        email,
        purpose: 'REGISTER',
      });
      setEmailOtpSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to send Email OTP');
    } finally {
      setEmailSending(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtp.length < 6) return;
    setVerifyingEmailOtp(true);
    setError(null);
    try {
      await api.post('/otp/email/verify', {
        email: getValues('email'),
        otp: emailOtp,
        purpose: 'REGISTER',
        requestedRole: 'SHOP_OWNER'
      });
      setEmailVerified(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Invalid Email OTP. Please try again.');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // ── Final Submit ──
  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      // Compose address from structured parts for the backend DTO
      const composedAddress = [data.building, data.floor, data.locality, data.city]
        .filter(Boolean)
        .join(', ') || locationData?.formattedAddress || data.city || 'Address';

      const result = await registerShop.mutateAsync({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        ownerName: data.ownerName,
        ownerPhone: data.ownerPhone,
        emailVerified,
        phoneVerified,
        shopName: data.shopName,
        shopType: data.shopType,
        shopDescription: data.shopDescription,
        address: composedAddress,
        building: data.building,
        floor: data.floor,
        locality: data.locality,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        landmark: data.landmark,
        // Default contact to owner phone — owner can customize later in Settings
        phone: data.ownerPhone,
        publicPhone: data.ownerPhone,
        sameAsOwnerPhone: true,
        whatsappOptIn: false,
        latitude: locationData?.lat || 0,
        longitude: locationData?.lng || 0,
        googlePlaceId: locationData?.placeId,
        formattedAddress: locationData?.formattedAddress,
      });
      // If tokens were stored by the hook, go directly to settings
      if (result?.accessToken) {
        router.push('/settings');
      } else {
        router.push('/login?registrationSubmitted=1');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  // ── Progress Calculation ──
  const progress = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <>
      <Head>
        <title>Register Shop — Overline Admin</title>
        <meta name="description" content="Create your shop on Overline and start managing bookings." />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden p-4">
        {/* Background Gradient Orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-secondary/10 to-transparent rounded-full blur-[100px] translate-x-1/4 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-[120px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="w-full max-w-2xl relative z-10">
          {/* Logo */}
          <div className="text-center mb-6">
            <img 
              src="/overline-logo.png" 
              alt="Overline" 
              className="w-14 h-14 mx-auto mb-4 rounded-2xl object-cover shadow-button"
            />
            <h1 className="text-2xl font-black tracking-tight text-on-surface">
              Register Your Shop
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">Step {step} of {TOTAL_STEPS}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step Indicator — Horizontal pills */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto no-scrollbar px-1">
            {STEPS.map((s, i) => {
              const isActive = step === i + 1;
              const isDone = step > i + 1;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => { if (isDone) setStep(i + 1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-primary text-white shadow-button'
                      : isDone
                        ? 'bg-tertiary/10 text-tertiary cursor-pointer'
                        : 'bg-surface-container-low text-outline cursor-default'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>

          <div className="card-m3 p-6 sm:p-8">
            <div id="recaptcha-container" className="h-0 overflow-hidden" />

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-error-container/50 border border-error/20 rounded-xl text-error text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* ═══ Step 1: Shop Basics + Owner Details ═══ */}
              {step === 1 && (
                <div className="space-y-5 animate-fade-in">
                  {/* Shop Section */}
                  <h2 className="text-lg font-black text-on-surface flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" /> Shop Identity
                  </h2>
                  <p className="text-sm text-on-surface-variant">Tell us about your business and yourself.</p>

                  <div className="space-y-2">
                    <label className="label-m3">Shop Name <span className="text-error">*</span></label>
                    <input
                      className="input-m3"
                      placeholder="My Awesome Salon"
                      {...register('shopName', { required: 'Shop name is required', minLength: { value: 3, message: 'Min 3 characters' }, maxLength: { value: 80, message: 'Max 80 characters' } })}
                    />
                    {errors.shopName && <p className="text-error text-xs font-medium">{errors.shopName.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="label-m3">Category <span className="text-error">*</span></label>
                      <select className="input-m3" {...register('shopType', { required: true })}>
                        <option value="SALON">Salon</option>
                        <option value="BARBER">Barber Shop</option>
                        <option value="CLINIC">Clinic</option>
                        <option value="SPA">Spa & Wellness</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-m3">Full Name <span className="text-error">*</span></label>
                      <input className="input-m3" placeholder="John Doe" {...register('ownerName', { required: 'Name is required' })} />
                      {errors.ownerName && <p className="text-error text-xs font-medium">{errors.ownerName.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="label-m3">Short Description</label>
                    <textarea
                      className="input-m3 min-h-[80px] resize-none"
                      placeholder="Tell customers what makes your shop special (max 500 chars)"
                      maxLength={500}
                      {...register('shopDescription')}
                    />
                  </div>

                  {/* Owner Section — seamless continuation */}
                  <div className="border-t border-outline-variant/10 pt-5">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-4">
                      <User className="w-4 h-4 text-primary" /> Owner Account
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="label-m3">Email <span className="text-error">*</span></label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                          <input
                            type="email"
                            className="input-m3 pl-11"
                            placeholder="you@example.com"
                            {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' } })}
                          />
                        </div>
                        {errors.email && <p className="text-error text-xs font-medium">{errors.email.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="label-m3">Phone <span className="text-error">*</span></label>
                          <div className="relative">
                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                            <input
                              type="tel"
                              className="input-m3 pl-11"
                              placeholder="9876543210"
                              {...register('ownerPhone', { 
                                required: 'Phone is required',
                                pattern: {
                                  value: /^\d{10}$/,
                                  message: 'Phone number must be exactly 10 digits'
                                },
                                onChange: (e) => {
                                  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                }
                              })}
                            />
                          </div>
                          {errors.ownerPhone && <p className="text-error text-xs font-medium">{errors.ownerPhone.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="label-m3">Password <span className="text-error">*</span></label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className="input-m3 pr-11"
                              placeholder="••••••••"
                              {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {errors.password && <p className="text-error text-xs font-medium">{errors.password.message}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ Step 2: Verification ═══ */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-lg font-black text-on-surface flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" /> Verify Your Identity
                  </h2>
                  <p className="text-sm text-on-surface-variant">We need to verify your phone and email to keep your shop secure.</p>

                  {/* Phone Verification */}
                  <div className={`p-5 rounded-2xl border-2 transition-colors ${phoneVerified ? 'border-tertiary/30 bg-tertiary-fixed/10' : 'border-outline-variant/20 bg-surface-container-low'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-primary" />
                        <span className="font-bold text-on-surface">Phone Verification</span>
                        <span className="text-error text-xs font-bold">Required</span>
                      </div>
                      {phoneVerified && <Check className="w-5 h-5 text-tertiary" />}
                    </div>
                    
                    {phoneVerified ? (
                      <p className="text-sm text-tertiary font-medium">✓ Phone verified successfully</p>
                    ) : !otpSent ? (
                      <Button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        isLoading={phoneSending}
                        className="btn-primary py-2.5 w-full"
                      >
                        Send OTP to {formValues.ownerPhone || 'your phone'}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit OTP"
                          className="input-m3 text-center text-lg tracking-[0.4em] font-bold"
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyPhoneOtp}
                          isLoading={verifyingOtp}
                          className="btn-primary py-2.5 w-full"
                          disabled={phoneOtp.length < 6}
                        >
                          Verify OTP
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Email Verification */}
                  <div className={`p-5 rounded-2xl border-2 transition-colors ${emailVerified ? 'border-tertiary/30 bg-tertiary-fixed/10' : 'border-outline-variant/20 bg-surface-container-low'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-secondary" />
                        <span className="font-bold text-on-surface">Email Verification</span>
                        <span className="text-outline text-xs font-bold">Recommended</span>
                      </div>
                      {emailVerified && <Check className="w-5 h-5 text-tertiary" />}
                    </div>

                    {emailVerified ? (
                      <p className="text-sm text-tertiary font-medium">✓ Email verified successfully</p>
                    ) : !emailOtpSent ? (
                      <Button
                        type="button"
                        onClick={handleSendEmailOtp}
                        isLoading={emailSending}
                        className="btn-tonal py-2.5 w-full"
                      >
                        Send OTP to {formValues.email || 'your email'}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit OTP"
                          className="input-m3 text-center text-lg tracking-[0.4em] font-bold"
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyEmailOtp}
                          isLoading={verifyingEmailOtp}
                          className="btn-primary py-2.5 w-full"
                          disabled={emailOtp.length < 6}
                        >
                          Verify Email OTP
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══ Step 3: Location + Address + Submit ═══ */}
              {step === 3 && (
                <div className="space-y-5 animate-fade-in">
                  <h2 className="text-lg font-black text-on-surface flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" /> Shop Location
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    Search for your area, then drag the pin to your exact shop entrance.
                  </p>

                  <LocationPicker value={locationData} onChange={(loc) => {
                    setLocationData(loc);
                    // Auto-fill address fields from map data
                    if (loc.city) setValue('city', loc.city);
                    if (loc.locality) setValue('locality', loc.locality);
                    if (loc.state) setValue('state', loc.state);
                    if (loc.postalCode) setValue('postalCode', loc.postalCode);
                  }} />

                  {/* Inline Address Details */}
                  <div className="border-t border-outline-variant/10 pt-5">
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-4">
                      <Building2 className="w-4 h-4 text-primary" /> Address Details
                    </h3>

                    {locationData?.formattedAddress && (
                      <div className="p-3 mb-4 bg-primary-fixed/20 border border-primary/15 rounded-xl text-sm text-on-surface">
                        <span className="font-bold">Map Address:</span> {locationData.formattedAddress}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="label-m3">Building / Complex</label>
                        <input className="input-m3" placeholder="Sapphire Complex" {...register('building')} />
                      </div>
                      <div className="space-y-2">
                        <label className="label-m3">Floor</label>
                        <input className="input-m3" placeholder="Ground Floor" {...register('floor')} />
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <label className="label-m3">Locality / Area</label>
                      <input className="input-m3" placeholder="Andheri West" {...register('locality')} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <label className="label-m3">City <span className="text-error">*</span></label>
                        <input className="input-m3" placeholder="Mumbai" {...register('city', { required: 'City is required' })} />
                        {errors.city && <p className="text-error text-xs font-medium">{errors.city.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="label-m3">State</label>
                        <input className="input-m3" placeholder="Maharashtra" {...register('state')} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <label className="label-m3">Pincode</label>
                        <input className="input-m3" placeholder="400058" {...register('postalCode')} />
                      </div>
                      <div className="space-y-2">
                        <label className="label-m3">Landmark</label>
                        <input className="input-m3" placeholder="Near HDFC Bank ATM" {...register('landmark')} />
                      </div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="p-4 bg-surface-container-low rounded-xl text-xs text-on-surface-variant leading-relaxed">
                    By submitting, you agree to Overline's <Link href="/terms" className="text-primary font-bold hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary font-bold hover:underline">Privacy Policy</Link>. Your shop will be submitted for review.
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200/50 rounded-xl text-sm text-amber-800 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Almost there!</p>
                      <p className="text-xs mt-1">You can add photos, public contact details, and WhatsApp preferences from Settings after registration.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ Navigation ═══ */}
              <div className="flex gap-3 mt-8 pt-5 border-t border-outline-variant/10">
                {step > 1 && (
                  <button
                    type="button"
                    className="flex-1 btn-tonal py-3.5 flex items-center justify-center gap-2"
                    onClick={onPrevStep}
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}

                {step < TOTAL_STEPS ? (
                  <button
                    type="button"
                    className={`flex-1 btn-primary py-3.5 flex items-center justify-center gap-2 ${!canGoNext() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={onNextStep}
                    disabled={!canGoNext()}
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 btn-primary py-3.5"
                    isLoading={isSubmitting || registerShop.isPending}
                  >
                    🚀 Register My Shop
                  </Button>
                )}
              </div>
            </form>

            <p className="text-center text-xs text-outline mt-6 pt-4 border-t border-outline-variant/10">
              Already have a shop account?{' '}
              <span onClick={() => router.push('/login')} className="text-primary font-semibold hover:underline cursor-pointer">
                Sign In
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
