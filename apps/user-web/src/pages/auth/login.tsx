  import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card, Alert } from '@/components/ui';
import { useLogin, useFirebasePhoneLogin } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import {
  signInWithPhoneFirebase,
  confirmPhoneOtp,
  getFreshFirebaseIdToken,
} from '@/lib/firebase';
import type { ConfirmationResult } from 'firebase/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { redirect, error } = router.query;
  const { isAuthenticated } = useAuthStore();
  const login = useLogin();
  const firebasePhoneLogin = useFirebasePhoneLogin();

  const [showPassword, setShowPassword] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'email' | 'phone'>('email');
  const [phone, setPhone] = React.useState('');
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = React.useState(false);
  const [resendCountdown, setResendCountdown] = React.useState(0);
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(
    null,
  );

  const otpInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push((redirect as string) || '/');
    }
  }, [isAuthenticated, redirect, router]);

  // Handle error from redirect (e.g., google_auth_failed)
  React.useEffect(() => {
    if (error) {
      if (error === 'google_auth_failed') {
        setLocalError('Google sign-in failed. Please try again or use email/password.');
      } else if (error === 'google_not_configured') {
        setLocalError('Google authentication is not configured. Please try email/password.');
      }
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
      const redirectUri = `${BACKEND_URL}/api/v1/auth/google`;
      window.location.href = redirectUri;
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
      const result = await signInWithPhoneFirebase(phone);
      setConfirmationResult(result);
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
      if (!confirmationResult) {
        setLocalError('Please request a new OTP code.');
        return;
      }
      const userCredential = await confirmPhoneOtp(confirmationResult, otp);
      const idToken = await getFreshFirebaseIdToken(userCredential);
      await firebasePhoneLogin.mutateAsync({ idToken });
      router.push((redirect as string) || '/');
    } catch (err: any) {
      setLocalError(err?.response?.data?.message || err?.message || 'OTP verification failed');
    }
  };

  return (
    <>
      <Head>
        <title>Login - Overline</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4">
        <Card className="w-full max-w-md p-8 shadow-xl">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <Link href="/">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                O
              </div>
            </Link>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-600 mt-2">Sign in to your account to continue</p>
          </div>

          {/* Error Alert */}
          {(localError || error) && (
            <Alert variant="error" className="mb-6">
              {localError || error}
            </Alert>
          )}

          {/* Login Form */}
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setAuthMode('email')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                authMode === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('phone')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                authMode === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Phone OTP
            </button>
          </div>

          {authMode === 'email' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                leftIcon={
                  <Mail className="w-5 h-5" />
                }
                error={errors.email?.message}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={
                  <Lock className="w-5 h-5" />
                }
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox" className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                  Forgot password?
                </a>
              </div>

              <Button type="submit" isLoading={isSubmitting}>
                Sign In
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div id="recaptcha-container" className="h-0 overflow-hidden" />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              {!otpSent ? (
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  isLoading={isSendingOtp}
                  disabled={!phone}
                >
                  Send OTP
                </Button>
              ) : (
                <>
                  <div className="grid grid-cols-6 gap-2">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpInputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="h-12 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    ))}
                  </div>

                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    isLoading={firebasePhoneLogin.isPending}
                  >
                    Verify OTP
                  </Button>

                  <div className="text-center text-sm text-gray-600">
                    {resendCountdown > 0 ? (
                      <span>Resend OTP in {resendCountdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="font-medium text-primary-600 hover:text-primary-500"
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
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            loading={isGoogleLoading}
            className="w-full flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.51-2.74c-.98.66-2.23 1.06-3.77 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href={`/auth/signup${redirect ? `?redirect=${encodeURIComponent(redirect as string)}` : ''}`}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </>
  );
}
