import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Alert } from '@/components/ui';
import { useLogin, useSendOtp, useVerifyOtp } from '@/hooks';
import { useAuthStore } from '@/stores/auth';

import { buildAuthUrl } from '@/lib/backend-url';
import { SeoHead } from '@/components/seo/SeoHead';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { redirect, error } = router.query;
  const { isAuthenticated } = useAuthStore();
  const login = useLogin();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const [showPassword, setShowPassword] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'email' | 'phone'>('email');
  const [phone, setPhone] = React.useState('');
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = React.useState(false);
  const [resendCountdown, setResendCountdown] = React.useState(0);
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);

  const otpInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push((redirect as string) || '/');
    }
  }, [isAuthenticated, redirect, router]);

  React.useEffect(() => {
    if (error) {
      const errorMessages: Record<string, string> = {
        google_auth_failed: 'Google sign-in failed. Please try again or use email/password.',
        google_not_configured: 'Google authentication is not configured. Please try email/password.',
        invalid_token: 'Your session expired. Please sign in again.',
        access_denied: 'Access denied. Please check your credentials and try again.',
        account_deactivated: 'This account has been deactivated. Contact support for help.',
        internal_server_error: 'Something went wrong on our end. Please try again in a moment.',
        session_expired: 'Your session has expired. Please sign in again.',
      };
      setLocalError(
        errorMessages[error as string] ||
        'Something went wrong. Please try again or use a different sign-in method.'
      );
    }
  }, [error]);

  const onSubmit = async (data: LoginForm) => {
    setLocalError(null);
    try {
      await login.mutateAsync(data);
      router.push((redirect as string) || '/');
    } catch (err: any) {
      setLocalError(err.response?.data?.message || 'Invalid email or password');
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setLocalError(null);
    try {
      window.location.href = buildAuthUrl('/auth/google', { from: 'user' });
    } catch (err: any) {
      setLocalError('Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  React.useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSendOtp = async () => {
    setLocalError(null);
    setIsSendingOtp(true);
    try {
      await sendOtp.mutateAsync({ phone, purpose: 'LOGIN' });
      setOtpSent(true);
      setResendCountdown(60);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
    } catch (err: any) {
      setLocalError(err?.message || err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = sanitized;
    setOtpDigits(nextDigits);

    if (sanitized && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setLocalError(null);
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setLocalError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await verifyOtp.mutateAsync({ phone, otp, purpose: 'LOGIN' });
      router.push((redirect as string) || '/');
    } catch (err: any) {
      setLocalError(err?.response?.data?.message || err?.message || 'OTP verification failed');
    }
  };

  return (
    <>
      <SeoHead
        title="Sign In"
        description="Sign in to Overline to manage your bookings and discover premium services near you."
        canonical="/auth/login"
        noindex
      />

      <div className="min-h-screen flex overflow-hidden bg-surface">
        {/* ── Left: Visual Hero ── */}
        <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
          <div className="absolute inset-0 z-0">
            <img
              alt="Professional grooming salon"
              src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80"
              crossOrigin="anonymous"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/90 via-primary/40 to-transparent" />
          </div>
          <div className="relative z-10 flex flex-col justify-between p-16 w-full">
            <div className="flex items-center gap-3">
              <img src="/overline-logo.png" alt="Overline" className="h-10 w-auto object-contain brightness-0 invert" />
            </div>
            <div className="max-w-md">
              <h1 className="text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Excellence in every detail.
              </h1>
              <p className="text-white/80 text-lg leading-relaxed">
                Join the elite circle of grooming professionals and manage your boutique experience with our Digital Concierge.
              </p>
            </div>
            <div className="flex items-center gap-4 text-white/60 text-sm">
              <span className="w-12 h-[1px] bg-white/30" />
              <span className="tracking-[0.2em] uppercase font-medium">Est. 2024</span>
            </div>
          </div>
        </section>

        {/* ── Right: Content Canvas ── */}
        <section className="w-full lg:w-1/2 flex flex-col bg-surface relative">
          {/* Mobile Logo */}
          <div className="lg:hidden p-8">
            <Link href="/" className="flex items-center gap-3">
              <img src="/overline-logo.png" alt="Overline" className="h-8 w-auto object-contain dark:invert" />
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center px-8 lg:px-24">
            <div className="w-full max-w-[440px]">
              {/* Header */}
              <div className="mb-10">
                <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                  Welcome back
                </h2>
                <p className="text-on-surface-variant font-medium">
                  Please enter your details to sign in.
                </p>
              </div>

              {/* Error Alert */}
              {localError && (
                <Alert variant="error" className="mb-6">
                  {localError}
                </Alert>
              )}

              {/* Auth Mode Toggle */}
              <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface-container-high dark:bg-gray-800 p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('email')}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                    authMode === 'email'
                      ? 'bg-surface dark:bg-surface-container-highest text-on-surface shadow-sm border border-outline-variant/30'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('phone')}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                    authMode === 'phone'
                      ? 'bg-surface dark:bg-surface-container-highest text-on-surface shadow-sm border border-outline-variant/30'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Phone OTP
                </button>
              </div>

              {authMode === 'email' ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="label-m3">Email or Phone</label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      className="input-m3"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                    />
                    {errors.email && (
                      <p className="text-error text-xs font-medium mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end px-1">
                      <label htmlFor="password" className="label-m3">Password</label>
                      <Link
                        className="text-xs font-semibold text-primary hover:text-primary-container transition-colors"
                        href="/auth/forgot-password"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="input-m3 pr-12"
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                          },
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-error text-xs font-medium mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                      className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-button hover:shadow-button-hover active:scale-[0.97] transition-all"
                    >
                      Sign In
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div id="recaptcha-container" className="h-0 overflow-hidden" />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="phone" className="label-m3">Phone Number</label>
                      {otpSent && (
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpDigits(['', '', '', '', '', '']);
                          }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Change
                        </button>
                      )}
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+91XXXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-m3"
                      disabled={otpSent}
                    />
                  </div>

                  {!otpSent ? (
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      isLoading={isSendingOtp}
                      disabled={!phone}
                      className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-button hover:shadow-button-hover active:scale-[0.97] transition-all disabled:opacity-50"
                    >
                      Send OTP
                    </Button>
                  ) : (
                    <>
                      <div className="grid grid-cols-6 gap-3">
                        {otpDigits.map((digit, index) => (
                          <input
                            key={index}
                            id={`otp-digit-${index}`}
                            name={`otp-digit-${index}`}
                            ref={(el) => {
                              otpInputRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="h-14 rounded-xl bg-surface-container-low text-center text-lg font-bold text-on-surface border-none focus:ring-2 focus:ring-primary/30 transition-all"
                          />
                        ))}
                      </div>

                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        isLoading={verifyOtp.isPending}
                        className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-button hover:shadow-button-hover active:scale-[0.97] transition-all"
                      >
                        Verify OTP
                      </Button>

                      <div className="text-center text-sm text-on-surface-variant">
                        {resendCountdown > 0 ? (
                          <span>Resend OTP in {resendCountdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="font-bold text-primary hover:underline underline-offset-4"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full h-[1px] bg-outline-variant/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                  <span className="bg-surface px-4 text-outline">Or continue with</span>
                </div>
              </div>

              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full h-14 flex items-center justify-center gap-3 rounded-[6px] bg-surface-container-high border border-outline-variant/40 font-semibold text-on-surface hover:bg-surface-container transition-colors active:scale-[0.97] duration-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}
              </button>
              <p className="mt-2 text-center text-[11px] text-on-surface-variant/70 leading-relaxed max-w-sm mx-auto">
                Overline uses your Google name and email address to create your account, sign you in securely, and send booking confirmations.
              </p>

              {/* Sign Up Link */}
              <p className="mt-10 text-center text-sm font-medium text-on-surface-variant">
                Don&apos;t have an account?{' '}
                <Link
                  href={`/auth/signup${redirect ? `?redirect=${encodeURIComponent(redirect as string)}` : ''}`}
                  className="text-primary font-bold hover:underline underline-offset-4"
                >
                  Create account
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="w-full py-8 px-12 flex flex-col items-center gap-4 text-[11px] font-bold tracking-widest uppercase text-outline">
            <div className="flex flex-wrap justify-center gap-6">
              <Link className="hover:text-primary transition-colors" href="/auth/forgot-password">
                Forgot Password
              </Link>
              <Link className="hover:text-primary transition-colors" href="/privacy">
                Privacy
              </Link>
              <Link className="hover:text-primary transition-colors" href="/terms">
                Terms
              </Link>
              <a className="hover:text-primary transition-colors" href="mailto:support@overline.in">
                Support
              </a>
              <a className="hover:text-primary transition-colors" href="mailto:support@overline.in">
                ?
              </a>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span>© 2026 Overline. Built for clarity.</span>
              <span className="normal-case text-[10px] text-outline-variant font-medium">Google is a trademark of Google LLC.</span>
            </div>
          </footer>
        </section>
      </div>

      {/* Floating Help Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-12 h-12 flex items-center justify-center bg-surface-container-high text-primary rounded-full shadow-lg shadow-primary/10 active:scale-95 hover:bg-primary hover:text-white transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
      </div>
    </>
  );
}
