import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Button, Input, Card } from '@/components/ui';
import { useLogin } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';

interface LoginForm {
  email: string;
  password: string;
}

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
      router.replace('/dashboard');
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
    await api.post('/otp/send', {
      phone,
      purpose: 'LOGIN',
    });
    setResendInSeconds(60);
  };

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const auth = await login.mutateAsync(data);
      const phone = auth?.user?.phone;

      if (!phone) {
        router.push('/dashboard');
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
      await api.post('/otp/verify', {
        phone: otpPhone,
        otp,
        purpose: 'LOGIN',
      });
      clearOtpPending();
      router.push('/dashboard');
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
        <title>Login - Overline Admin</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">O</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-gray-500 mt-1">Sign in to manage your shop</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {!pendingOtpVerification ? (
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email',
                    },
                  })}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password', {
                    required: 'Password is required',
                  })}
                />

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={isSubmitting || login.isPending}
                >
                  Sign In
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-gray-500">or continue with</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <a
                href={`${BACKEND_URL}/api/v1/auth/google/redirect?from=admin`}
                className="flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </a>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                OTP sent to {maskedPhone || 'your phone'}
              </div>
              <Input
                label="Enter OTP"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Button
                type="button"
                className="w-full"
                size="lg"
                isLoading={otpBusy}
                onClick={handleVerifyOtp}
              >
                Verify OTP
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-primary-600 disabled:text-gray-400"
                  disabled={resendInSeconds > 0}
                  onClick={handleResendOtp}
                >
                  {resendInSeconds > 0 ? `Resend in ${resendInSeconds}s` : 'Resend OTP'}
                </button>
                <button
                  type="button"
                  className="text-sm text-gray-600 hover:text-gray-900"
                  onClick={handleCancelOtp}
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Need help?{' '}
            <a href="mailto:support@overline.app" className="text-primary-600 hover:text-primary-700">
              Contact Support
            </a>
          </p>
        </Card>
      </div>
    </>
  );
}
