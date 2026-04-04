import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Button, Input, Card } from '@/components/ui';
import { useLogin } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import { getDefaultRouteForRole } from '@/lib/role-routing';
import { Shield, Users, ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';

interface LoginForm {
  email: string;
  password: string;
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
    logout,
  } = useAuthStore();
  const login = useLogin();

  const [error, setError] = React.useState<string | null>(null);
  const [otp, setOtp] = React.useState('');
  const [resendInSeconds, setResendInSeconds] = React.useState(0);
  const [otpBusy, setOtpBusy] = React.useState(false);
  const [roleChoice, setRoleChoice] = React.useState<RoleChoice>(null);
  const [showPassword, setShowPassword] = React.useState(false);

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
      router.replace(getDefaultRouteForRole(useAuthStore.getState().user?.role));
    }
  }, [isAuthenticated, pendingOtpVerification, router]);

  React.useEffect(() => {
    if (resendInSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendInSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendInSeconds]);

  const sendOtp = async (phone: string) => {
    await api.post('/otp/send', { phone, purpose: 'LOGIN' });
    setResendInSeconds(60);
  };

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const auth = await login.mutateAsync(data);
      const phone = auth?.user?.phone;
      const nextRoute = getDefaultRouteForRole(auth?.user?.role);
      if (!phone) {
        router.push(nextRoute);
        return;
      }
      await sendOtp(phone);
      setOtpPending(phone);
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
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
      await api.post('/otp/verify', { phone: otpPhone, otp, purpose: 'LOGIN' });
      clearOtpPending();
      router.push(getDefaultRouteForRole(useAuthStore.getState().user?.role));
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
            <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-button">
              <span className="text-white font-black text-2xl">O</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Admin Portal</h1>
            <p className="text-on-surface-variant text-sm mt-1.5">Manage your shop with Overline</p>
          </div>

          <div className="card-m3 p-8">
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
                    isLoading={isSubmitting || login.isPending}
                  >
                    Sign In
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant/15" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-4 text-outline font-bold">OR</span>
                  </div>
                </div>

                {/* Google Sign-In */}
                <a
                  href={`${BACKEND_URL}/api/v1/auth/google/redirect?from=admin`}
                  className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-surface-container-low border border-outline-variant/10 rounded-xl hover:bg-surface-container-high transition-all text-sm font-semibold text-on-surface active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </a>
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

          <p className="text-center text-xs text-outline mt-6">
            Need help?{' '}
            <a href="mailto:support@overline.app" className="text-primary font-semibold hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
