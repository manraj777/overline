import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import {
  normalizeIndianPhone,
} from '@/lib/firebase';
import { getDefaultRouteForRole } from '@/lib/role-routing';
import { Shield, Users, ArrowRight, Lock, Mail, Eye, EyeOff, Smartphone, Building2 } from 'lucide-react';
import { AuthResponse } from '@/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';

interface LoginForm {
  email: string;
  password: string;
}

interface StaffShopSummary {
  id: string;
  name: string;
  address: string;
  city: string;
}

type RoleChoice = 'owner' | 'staff' | null;

export default function LoginPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    pendingOtpVerification,
    otpPhone,
    setOtpPending,
    clearOtpPending,
    login,
    setShopId,
    logout,
  } = useAuthStore();

  const [error, setError] = React.useState<string | null>(null);
  const [otp, setOtp] = React.useState('');
  const [resendInSeconds, setResendInSeconds] = React.useState(0);
  const [otpBusy, setOtpBusy] = React.useState(false);
  const [roleChoice, setRoleChoice] = React.useState<RoleChoice>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [staffPhone, setStaffPhone] = React.useState('');
  const [staffPin, setStaffPin] = React.useState('');
  const [staffAuthMode, setStaffAuthMode] = React.useState<'PIN' | 'OTP'>('PIN');
  const [staffShops, setStaffShops] = React.useState<StaffShopSummary[]>([]);
  const [selectedShop, setSelectedShop] = React.useState<StaffShopSummary | null>(null);
  const [loadingShops, setLoadingShops] = React.useState(false);
  const [staffAuthBusy, setStaffAuthBusy] = React.useState(false);
  const [otpRequestedRole, setOtpRequestedRole] = React.useState<'OWNER' | 'STAFF' | null>(null);
  const [otpSelectedShopId, setOtpSelectedShopId] = React.useState<string | null>(null);

  const maskedPhone = React.useMemo(() => {
    if (!otpPhone) return '';
    return `${otpPhone.slice(0, 3)}******${otpPhone.slice(-2)}`;
  }, [otpPhone]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  React.useEffect(() => {
    if (isAuthenticated && !pendingOtpVerification) {
      const role = useAuthStore.getState().user?.role;
      // Explicit routing — no ambiguity
      if (role === 'STAFF') {
        router.replace('/staff/dashboard');
      } else {
        // OWNER, SUPER_ADMIN, or any other role defaults to owner dashboard
        router.replace('/owner/dashboard');
      }
    }
  }, [isAuthenticated, pendingOtpVerification, router]);

  React.useEffect(() => {
    if (resendInSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendInSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendInSeconds]);

  const sendOtp = async (phone: string, options?: { staffShopId?: string }) => {
    if (options?.staffShopId) {
      await api.post('/auth/staff/send-otp', { shopId: options.staffShopId, phone });
    } else {
      await api.post('/auth/send-otp', { phone });
    }
    setResendInSeconds(60);
  };

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const { data: auth } = await api.post<AuthResponse>('/auth/login', {
        ...data,
        requestedRole: 'OWNER',
      });

      login(auth.user, auth.accessToken, auth.refreshToken, auth.user.shopId);
      if (auth.user.shopId) {
        setShopId(auth.user.shopId);
      }

      // Do not block navigation on optional shop lookup.
      // If shopId is missing in auth payload, resolve in background.
      if (!auth.user.shopId) {
        void api
          .get<Array<{ id: string; name: string }>>('/admin/my-shops')
          .then(({ data: shops }) => {
            if (shops?.length) {
              setShopId(shops[0].id);
            }
          })
          .catch(() => {
            // Keep login successful even if shop lookup fails.
          });
      }

      // Owner is already authenticated via email+password.
      // Go directly to owner dashboard — no OTP needed.
      router.push('/owner/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  const handleFindStaffShops = async () => {
    const digits = staffPhone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setError(null);
    setLoadingShops(true);
    try {
      const normalizedPhone = `+91${digits}`;
      const { data } = await api.post<{ phone: string; shops: StaffShopSummary[] }>('/auth/staff/shops', {
        phone: normalizedPhone,
      });
      const shops = Array.isArray(data.shops) ? data.shops : [];
      setStaffShops(shops);
      setSelectedShop(shops[0] || null);
      if (!shops.length) {
        setError('No active staff assignment found for this mobile number.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to fetch assigned shops');
    } finally {
      setLoadingShops(false);
    }
  };

  const handleStaffPinLogin = async () => {
    if (!selectedShop) {
      setError('Select your assigned shop first');
      return;
    }
    const digits = staffPhone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!/^\d{6}$/.test(staffPin)) {
      setError('Enter a valid 6-digit staff PIN');
      return;
    }

    setError(null);
    setStaffAuthBusy(true);
    try {
      const normalizedPhone = `+91${digits}`;
      const payload = {
        shopId: selectedShop.id,
        phone: normalizedPhone,
        pin: staffPin,
      };

      let auth: any;
      try {
        const primary = await api.post<any>('/auth/staff-login', payload);
        auth = primary.data;
      } catch (primaryError: any) {
        // Compatibility fallback for environments that expose staff login at a legacy path.
        const shouldTryFallback = !primaryError?.response || primaryError?.response?.status === 404;
        if (!shouldTryFallback) {
          throw primaryError;
        }
        const fallback = await api.post<any>('/auth/staff/login', payload);
        auth = fallback.data;
      }

      if (auth.mustSetPin) {
        setError('Please set up your PIN first using the temporary token.');
        // Add functionality to redirect or show set-pin modal.
        return;
      }

      login(auth.user, auth.accessToken, auth.refreshToken, selectedShop.id);
      setShopId(selectedShop.id);
      router.push(getDefaultRouteForRole(auth.user.role));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid mobile number or PIN for selected shop');
    } finally {
      setStaffAuthBusy(false);
    }
  };

  const handleStaffOtpLogin = async () => {
    if (!selectedShop) {
      setError('Select your assigned shop first');
      return;
    }
    const digits = staffPhone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setError(null);
    setStaffAuthBusy(true);
    try {
      const normalizedPhone = `+91${digits}`;
      await sendOtp(normalizedPhone, { staffShopId: selectedShop.id });
      setOtpRequestedRole('STAFF');
      setOtpSelectedShopId(selectedShop.id);
      setOtpPending(normalizedPhone);
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setStaffAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpPhone) return;
    if (!otp || otp.length < 4) {
      setError('Enter a valid OTP');
      return;
    }
    setError(null);
    setOtpBusy(true);
    try {
      // Owner login currently does not use OTP state. This guard avoids accidental fallback.
      if (otpRequestedRole === 'OWNER') {
        clearOtpPending();
        router.push('/owner/dashboard');
        return;
      }

      // ── STAFF FLOW ──
      // For staff, OTP IS the authentication — we need backend token generation.
      let auth: AuthResponse;
      if (otpRequestedRole === 'STAFF' && otpSelectedShopId) {
        const { data } = await api.post<AuthResponse>('/auth/staff/verify-otp', {
          shopId: otpSelectedShopId,
          phone: otpPhone,
          otp,
        });
        auth = data;
      } else {
        const { data } = await api.post<AuthResponse>('/auth/verify-otp', {
          phone: otpPhone,
          otp,
          requestedRole: otpRequestedRole || undefined,
        });
        auth = data;
      }

      if (otpRequestedRole === 'STAFF' && auth.user.role !== 'STAFF') {
        throw new Error('This OTP is not linked to a staff account.');
      }

      login(auth.user, auth.accessToken, auth.refreshToken, auth.user.shopId);
      if (otpSelectedShopId) {
        setShopId(otpSelectedShopId);
      }
      clearOtpPending();
      router.push(getDefaultRouteForRole(auth.user.role));
    } catch (err: any) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpPhone || resendInSeconds > 0) return;
    setError(null);
    try {
      await sendOtp(otpPhone);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleCancelOtp = () => {
    clearOtpPending();
    logout();
    setOtp('');
    setResendInSeconds(0);
    setOtpRequestedRole(null);
    setOtpSelectedShopId(null);
  };

  return (
    <>
      <Head>
        <title>Login — Overline Admin</title>
        <meta name="description" content="Sign in to the Overline Admin portal to manage your shop." />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden p-4">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-secondary/10 to-transparent rounded-full blur-[100px] translate-x-1/4 translate-y-1/4 pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src="/overline-logo.png" 
              alt="Overline" 
              className="w-16 h-16 mx-auto mb-5 rounded-2xl object-cover shadow-button"
            />
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Admin Portal</h1>
            <p className="text-on-surface-variant text-sm mt-1.5">Manage your shop with Overline</p>
          </div>

          <div className="card-m3 p-8">
            <div id="recaptcha-container" className="h-0 overflow-hidden" />
            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-error-container/50 border border-error/20 rounded-xl text-error text-sm font-medium">
                {error}
              </div>
            )}

            {/* ── Step 1: Role Selection ── */}
            {!roleChoice && !pendingOtpVerification && (
              <div className="space-y-4 animate-fade-in">
                <p className="label-m3 text-center mb-6">How are you signing in?</p>
                <button
                  onClick={() => setRoleChoice('owner')}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container-high hover:border-primary/20 transition-all group active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-sm">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-base font-bold text-on-surface block">Shop Owner</span>
                    <span className="text-xs text-on-surface-variant">Full access to manage your shop</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors" />
                </button>

                <button
                  onClick={() => setRoleChoice('staff')}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container-high hover:border-secondary/20 transition-all group active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center shadow-sm">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-base font-bold text-on-surface block">Staff Member</span>
                    <span className="text-xs text-on-surface-variant">View bookings & manage your queue</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-outline-variant group-hover:text-secondary transition-colors" />
                </button>
              </div>
            )}

            {/* ── Step 2: Login Form ── */}
            {roleChoice && !pendingOtpVerification && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <button
                    onClick={() => setRoleChoice(null)}
                    className="text-xs font-bold text-outline hover:text-primary transition-colors"
                  >
                    ← Back
                  </button>
                  <span className="text-xs text-outline">|</span>
                  <span className={`badge-m3 ${roleChoice === 'owner' ? 'bg-primary-fixed text-primary' : 'bg-secondary-fixed text-secondary'}`}>
                    {roleChoice === 'owner' ? 'Owner' : 'Staff'}
                  </span>
                </div>

                {roleChoice === 'owner' ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <label className="label-m3">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        className="input-m3 pl-11"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email',
                          },
                        })}
                      />
                    </div>
                    {errors.email && <p className="text-error text-xs font-medium">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="label-m3">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="input-m3 pl-11 pr-11"
                        {...register('password', { required: 'Password is required' })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-error text-xs font-medium">{errors.password.message}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-primary py-3.5"
                    isLoading={isSubmitting}
                  >
                    Sign In
                  </Button>
                  </form>
                ) : (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="label-m3">Registered Mobile</label>
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                        <input
                          type="tel"
                          placeholder="10-digit mobile"
                          className="input-m3 pl-11"
                          value={staffPhone}
                          onChange={(e) => setStaffPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="w-full btn-primary py-3.5"
                      isLoading={loadingShops}
                      onClick={handleFindStaffShops}
                    >
                      Find Assigned Shops
                    </Button>

                    {staffShops.length > 0 && (
                      <div className="space-y-2">
                        <label className="label-m3">Assigned Shop</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                          <select
                            className="input-m3 pl-11"
                            value={selectedShop?.id || ''}
                            onChange={(e) => setSelectedShop(staffShops.find((s) => s.id === e.target.value) || null)}
                          >
                            {staffShops.map((shop) => (
                              <option key={shop.id} value={shop.id}>
                                {shop.name} - {shop.city}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 rounded-xl bg-surface-container-low p-1">
                      <button
                        type="button"
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${staffAuthMode === 'PIN' ? 'bg-white text-primary' : 'text-outline'}`}
                        onClick={() => setStaffAuthMode('PIN')}
                      >
                        PIN
                      </button>
                      <button
                        type="button"
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${staffAuthMode === 'OTP' ? 'bg-white text-primary' : 'text-outline'}`}
                        onClick={() => setStaffAuthMode('OTP')}
                      >
                        OTP
                      </button>
                    </div>

                    {staffAuthMode === 'PIN' ? (
                      <>
                        <div className="space-y-2">
                          <label className="label-m3">6-digit PIN</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                            <input
                              type="password"
                              placeholder="Enter staff PIN"
                              className="input-m3 pl-11"
                              value={staffPin}
                              onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          className="w-full btn-primary py-3.5"
                          isLoading={staffAuthBusy}
                          onClick={handleStaffPinLogin}
                        >
                          Sign In with PIN
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        className="w-full btn-primary py-3.5"
                        isLoading={staffAuthBusy}
                        onClick={handleStaffOtpLogin}
                      >
                        Send OTP
                      </Button>
                    )}
                  </div>
                )}

                {/* Divider */}
                {roleChoice === 'owner' && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-outline-variant/15" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-4 text-outline font-bold">OR</span>
                      </div>
                    </div>

                    {/* Google Sign-In */}
                    <div className="flex justify-center w-full">
                      <a
                        href={`${BACKEND_URL}/api/v1/auth/google/redirect?from=admin`}
                        className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-[#dadce0] rounded-[4px] hover:bg-[#f8f9fa] transition-all text-sm font-medium text-[#3c4043]"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Sign in with Google
                      </a>
                    </div>
                    <p className="mt-2 text-center text-[11px] text-on-surface-variant/70 leading-relaxed max-w-sm mx-auto">
                      Overline uses your Google name and email address to create your account, sign you in securely, and send booking confirmations.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ── Step 3: OTP Verification ── */}
            {pendingOtpVerification && (
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 bg-primary-fixed/30 border border-primary/15 rounded-xl text-sm text-on-surface font-medium text-center">
                  OTP sent to <span className="font-bold">{maskedPhone || 'your phone'}</span>
                </div>

                <div className="space-y-2">
                  <label className="label-m3">Enter OTP</label>
                  <input
                    type="text"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-m3 text-center text-xl tracking-[0.5em] font-bold"
                  />
                </div>

                <Button
                  type="button"
                  className="w-full btn-primary py-3.5"
                  isLoading={otpBusy}
                  onClick={handleVerifyOtp}
                >
                  Verify OTP
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-primary font-semibold disabled:text-outline"
                    disabled={resendInSeconds > 0}
                    onClick={handleResendOtp}
                  >
                    {resendInSeconds > 0 ? `Resend in ${resendInSeconds}s` : 'Resend OTP'}
                  </button>
                  <button
                    type="button"
                    className="text-on-surface-variant font-semibold hover:text-on-surface"
                    onClick={handleCancelOtp}
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-outline">
              Need help?{' '}
              <a href="mailto:support@overline.in" className="text-primary font-semibold hover:underline">
                Contact Support
              </a>
              <span className="mx-2">·</span>
              <span 
                onClick={() => router.push('/register')} 
                className="text-primary font-semibold hover:underline cursor-pointer"
              >
                Sign Up as New Owner
              </span>
            </p>
            <p className="text-[10px] text-outline-variant font-medium mt-2">
              Google is a trademark of Google LLC.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
