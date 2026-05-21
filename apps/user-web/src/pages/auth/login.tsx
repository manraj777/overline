import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Alert } from '@/components/ui';
import { useLogin, useSendOtp, useVerifyOtp, useFirebasePhoneLogin } from '@/hooks';
import {
  signInWithPhoneFirebase,
  confirmPhoneOtp,
  getFreshFirebaseIdToken,
} from '@/lib/firebase';
import type { ConfirmationResult } from 'firebase/auth';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';

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
  const firebasePhoneLogin = useFirebasePhoneLogin();

  const [showPassword, setShowPassword] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'phone' | 'emailOtp' | 'password'>('phone');
  const [phone, setPhone] = React.useState('');
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = React.useState(false);
  const [resendCountdown, setResendCountdown] = React.useState(0);
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [sendMethod, setSendMethod] = React.useState<'SMS' | 'WHATSAPP' | null>(null);
  const [firebaseConfirmation, setFirebaseConfirmation] = React.useState<ConfirmationResult | null>(null);
  const [isNewUser, setIsNewUser] = React.useState(false);
  const [userName, setUserName] = React.useState('');
  const [emailForOtp, setEmailForOtp] = React.useState('');
  const [emailOtpSent, setEmailOtpSent] = React.useState(false);
  const [emailOtpDigits, setEmailOtpDigits] = React.useState(['', '', '', '', '', '']);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = React.useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = React.useState(false);

  const otpInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const emailOtpInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1078652399281729';
    
    (window as any).fbAsyncInit = function() {
      (window as any).FB.init({
        appId      : appId,
        cookie     : true,
        xfbml      : true,
        version    : 'v20.0'
      });
      (window as any).FB.AppEvents.logPageView();
    };

    if (!document.getElementById('facebook-jssdk')) {
      const fjs = document.getElementsByTagName('script')[0];
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      if (fjs && fjs.parentNode) {
        fjs.parentNode.insertBefore(js, fjs);
      } else {
        document.head.appendChild(js);
      }
    }
  }, []);

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
      const response = await login.mutateAsync(data);
      if (!response.user.isPhoneVerified) {
        router.push('/auth/verify-phone');
      } else {
        router.push((redirect as string) || '/');
      }
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

  const handleFacebookLogin = async () => {
    setIsFacebookLoading(true);
    setLocalError(null);

    const FB = (window as any).FB;
    if (!FB) {
      setLocalError('Facebook SDK not loaded yet. Please refresh and try again.');
      setIsFacebookLoading(false);
      return;
    }

    FB.login((response: any) => {
      if (response.status === 'connected') {
        const accessToken = response.authResponse.accessToken;
        
        api.post('/auth/facebook', { accessToken, requestedRole: 'USER' })
          .then(async (res: any) => {
            const { accessToken: jwtAccess, refreshToken: jwtRefresh, user } = res.data;
            
            // Log in via Zustand store
            useAuthStore.getState().login(user, jwtAccess, jwtRefresh);

            // Set browser cookies for Next.js SSR/Middleware
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: jwtAccess, refreshToken: jwtRefresh }),
            });

            router.push((redirect as string) || '/');
          })
          .catch((err: any) => {
            console.error('[FacebookLogin] Backend exchange failed:', err);
            setLocalError(err.response?.data?.message || 'Failed to authenticate with Facebook');
          })
          .finally(() => {
            setIsFacebookLoading(false);
          });
      } else {
        setLocalError('Facebook sign-in was cancelled or not fully authorized.');
        setIsFacebookLoading(false);
      }
    }, { scope: 'public_profile,email' });
  };

  React.useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSendOtp = async (method: 'SMS' | 'WHATSAPP' = 'SMS') => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setLocalError('Phone number must be exactly 10 digits starting with 6-9');
      return;
    }
    setLocalError(null);
    setIsSendingOtp(true);
    try {
      setSendMethod(method);
      if (method === 'SMS') {
        const result = await signInWithPhoneFirebase(phone);
        setFirebaseConfirmation(result);
      } else {
        await api.post('/auth/whatsapp/send-otp', { phone });
      }
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

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>, isEmail = false) => {
    event.preventDefault();
    const pasteData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasteData.length; i++) {
      nextDigits[i] = pasteData[i];
    }

    if (isEmail) {
      setEmailOtpDigits(nextDigits);
      const focusIndex = Math.min(pasteData.length, 5);
      emailOtpInputRefs.current[focusIndex]?.focus();
    } else {
      setOtpDigits(nextDigits);
      const focusIndex = Math.min(pasteData.length, 5);
      otpInputRefs.current[focusIndex]?.focus();
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
      if (sendMethod === 'SMS' && firebaseConfirmation) {
        const userCredential = await confirmPhoneOtp(firebaseConfirmation, otp);
        const idToken = await getFreshFirebaseIdToken(userCredential);
        await firebasePhoneLogin.mutateAsync({ idToken });
      } else {
        const { data } = await api.post('/auth/whatsapp/verify-otp', {
          phone,
          otp,
          ...(isNewUser && userName ? { name: userName } : {}),
        });
        const { accessToken: jwtAccess, refreshToken: jwtRefresh, user } = data;
        useAuthStore.getState().login(user, jwtAccess, jwtRefresh);
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: jwtAccess, refreshToken: jwtRefresh }),
        });
      }
      router.push((redirect as string) || '/');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'OTP verification failed';
      if (msg === 'NEW_USER_SIGNUP_REQUIRED') {
        setIsNewUser(true);
        setLocalError(null);
        return;
      }
      setLocalError(msg);
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
              <div className="mb-6 grid grid-cols-3 rounded-xl bg-surface-container-high p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('phone')}
                  className={`rounded-lg px-2 py-2.5 text-sm font-bold transition-all ${
                    authMode === 'phone'
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm border border-outline-variant/40'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Phone
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('emailOtp')}
                  className={`rounded-lg px-2 py-2.5 text-sm font-bold transition-all ${
                    authMode === 'emailOtp'
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm border border-outline-variant/40'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('password')}
                  className={`rounded-lg px-2 py-2.5 text-sm font-bold transition-all ${
                    authMode === 'password'
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm border border-outline-variant/40'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Password
                </button>
              </div>

              {authMode === 'password' ? (
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
              ) : authMode === 'phone' ? (
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
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="input-m3"
                      disabled={otpSent}
                    />
                  </div>

                  {!otpSent ? (
                    <div className="flex flex-col gap-3">
                      <Button
                        type="button"
                        onClick={() => handleSendOtp('WHATSAPP')}
                        isLoading={isSendingOtp && sendMethod === 'WHATSAPP'}
                        disabled={!phone || isSendingOtp}
                        className="w-full h-14 flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-button hover:shadow-button-hover active:scale-[0.97] transition-all disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                        Send OTP via WhatsApp
                      </Button>
                      <p className="text-xs text-center text-on-surface-variant">
                        OTP will be sent to your WhatsApp. Make sure this number has WhatsApp installed.
                      </p>
                    </div>
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
                            onPaste={(e) => handleOtpPaste(e, false)}
                            className="h-14 rounded-xl bg-surface-container-low text-center text-lg font-bold text-on-surface border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                          />
                        ))}
                      </div>

                      {isNewUser && (
                        <div className="space-y-2">
                          <label htmlFor="userName" className="label-m3">Your Name</label>
                          <input
                            id="userName"
                            type="text"
                            autoComplete="name"
                            placeholder="Enter your full name"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="input-m3"
                            autoFocus
                          />
                          <p className="text-xs text-on-surface-variant">
                            Looks like you're new here! Please enter your name to create your account.
                          </p>
                        </div>
                      )}

                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        isLoading={verifyOtp.isPending}
                        disabled={isNewUser && userName.trim().length < 2}
                        className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-button hover:shadow-button-hover active:scale-[0.97] transition-all disabled:opacity-50"
                      >
                        {isNewUser ? 'Create Account & Sign In' : 'Verify OTP'}
                      </Button>

                      <div className="text-center text-sm text-on-surface-variant">
                        {resendCountdown > 0 ? (
                          <span>Resend OTP in {resendCountdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendOtp(sendMethod || 'SMS')}
                            className="font-bold text-primary hover:underline underline-offset-4"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : authMode === 'emailOtp' ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="emailOtp" className="label-m3">Email Address</label>
                      {emailOtpSent && (
                        <button
                          type="button"
                          onClick={() => {
                            setEmailOtpSent(false);
                            setEmailOtpDigits(['', '', '', '', '', '']);
                          }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Change
                        </button>
                      )}
                    </div>
                    <input
                      id="emailOtp"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      value={emailForOtp}
                      onChange={(e) => setEmailForOtp(e.target.value)}
                      className="input-m3"
                      disabled={emailOtpSent}
                    />
                  </div>

                  {!emailOtpSent ? (
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!emailForOtp) return;
                        setIsSendingEmailOtp(true);
                        setLocalError(null);
                        try {
                          await api.post('/otp/email/send', { email: emailForOtp });
                          setEmailOtpSent(true);
                          setResendCountdown(30);
                        } catch (err: any) {
                          setLocalError(err?.response?.data?.message || 'Failed to send email OTP');
                        } finally {
                          setIsSendingEmailOtp(false);
                        }
                      }}
                      isLoading={isSendingEmailOtp}
                      disabled={!emailForOtp || isSendingEmailOtp}
                      className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-button hover:shadow-button-hover active:scale-[0.97] transition-all disabled:opacity-50"
                    >
                      Send OTP to Email
                    </Button>
                  ) : (
                    <>
                      <div className="grid grid-cols-6 gap-3">
                        {emailOtpDigits.map((digit, index) => (
                          <input
                            key={index}
                            id={`email-otp-digit-${index}`}
                            ref={(el) => {
                              emailOtpInputRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              const newDigits = [...emailOtpDigits];
                              newDigits[index] = val;
                              setEmailOtpDigits(newDigits);
                              if (val && index < 5) {
                                emailOtpInputRefs.current[index + 1]?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !emailOtpDigits[index] && index > 0) {
                                emailOtpInputRefs.current[index - 1]?.focus();
                              }
                            }}
                            onPaste={(e) => handleOtpPaste(e, true)}
                            className="h-14 rounded-xl bg-surface-container-low text-center text-lg font-bold text-on-surface border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                          />
                        ))}
                      </div>

                      <Button
                        type="button"
                        onClick={async () => {
                          const otp = emailOtpDigits.join('');
                          if (otp.length !== 6) {
                            setLocalError('Please enter a valid 6-digit OTP');
                            return;
                          }
                          setIsVerifyingEmailOtp(true);
                          setLocalError(null);
                          try {
                            const { data } = await api.post('/otp/email/verify', { email: emailForOtp, otp });
                            if (data.tokenResponse) {
                              const { accessToken, refreshToken, user } = data.tokenResponse;
                              useAuthStore.getState().login(user, accessToken, refreshToken);
                              await fetch('/api/auth/session', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ accessToken, refreshToken }),
                              });
                              router.push((redirect as string) || '/');
                            } else if (data.phoneVerificationRequired) {
                              router.push('/auth/verify-phone');
                            }
                          } catch (err: any) {
                            setLocalError(err?.response?.data?.message || 'OTP verification failed');
                          } finally {
                            setIsVerifyingEmailOtp(false);
                          }
                        }}
                        isLoading={isVerifyingEmailOtp}
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
                            onClick={async () => {
                              setIsSendingEmailOtp(true);
                              try {
                                await api.post('/otp/email/send', { email: emailForOtp });
                                setResendCountdown(30);
                              } catch (err: any) {
                                setLocalError(err?.response?.data?.message || 'Failed to resend OTP');
                              } finally {
                                setIsSendingEmailOtp(false);
                              }
                            }}
                            className="font-bold text-primary hover:underline underline-offset-4"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* Divider */}
              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full h-[1px] bg-outline-variant/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                  <span className="bg-surface px-4 text-outline">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  {isGoogleLoading ? 'Connecting...' : 'Google'}
                </button>

                {/* Facebook Sign-In */}
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={isFacebookLoading}
                  className="w-full h-14 flex items-center justify-center gap-3 rounded-[6px] bg-surface-container-high border border-outline-variant/40 font-semibold text-on-surface hover:bg-surface-container transition-colors active:scale-[0.97] duration-200"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  {isFacebookLoading ? 'Connecting...' : 'Facebook'}
                </button>
              </div>
              <p className="mt-4 text-center text-[11px] text-on-surface-variant/70 leading-relaxed max-w-sm mx-auto">
                Overline uses your Google or Facebook name and email address to create your account, sign you in securely, and send booking confirmations.
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
