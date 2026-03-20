import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Phone, CheckCircle, LogIn } from 'lucide-react';
import { Button, Input, Card, Alert } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useLogout } from '@/hooks/useAuth';
import api from '@/lib/api';

export default function VerifyPhonePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { mutate: logoutMutate } = useLogout();

  const [phone, setPhone] = React.useState(user?.phone || '');
  const [otpCode, setOtpCode] = React.useState('');
  const [isOtpSent, setIsOtpSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  // shown when the phone is already linked to another account
  const [showLoginInstead, setShowLoginInstead] = React.useState(false);

  React.useEffect(() => {
    if (user?.isPhoneVerified) {
      router.replace('/');
    }
  }, [user, router]);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setError(null);
    setShowLoginInstead(false);
    setIsLoading(true);

    try {
      await api.patch('/users/me', { phone });
      await api.post('/users/me/otp/send');
      setIsOtpSent(true);
    } catch (err: any) {
      const msg: string = err.response?.data?.message || 'Failed to send OTP';
      setError(msg);
      // If the error is about the number being taken, surface the login prompt
      if (
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('registered') ||
        msg.toLowerCase().includes('in use')
      ) {
        setShowLoginInstead(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      await api.post('/users/me/otp/verify', { code: otpCode });
      if (user) {
        setUser({ ...user, phone, isPhoneVerified: true });
      }
      router.replace('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Verify Phone - Overline</title>
      </Head>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <Card variant="bordered" className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              {isOtpSent ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Phone className="w-8 h-8 text-primary-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isOtpSent ? 'Verify your phone' : 'Add your mobile number'}
            </h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              {isOtpSent
                ? `We've sent a 6-digit code via SMS to ${phone}.`
                : 'Phone verification is required for bookings and communication.'}
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* "Log in instead" card shown when the phone is on another account */}
          {showLoginInstead && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <LogIn className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">This number is already registered</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    It looks like you already have an account with this number. Would you like to sign in instead?
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    logoutMutate();
                    router.replace('/auth/login');
                  }}
                >
                  Log in instead
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowLoginInstead(false); setError(null); setPhone(''); }}
                >
                  Use different number
                </Button>
              </div>
            </div>
          )}

          {!isOtpSent ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} className="space-y-4">
              <Input
                label="OTP Code"
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-bold"
              />
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Verify &amp; Continue
              </Button>
              <Button
                type="button"
                onClick={() => setIsOtpSent(false)}
                variant="outline"
                className="w-full"
                size="sm"
                disabled={isLoading}
              >
                Change Phone Number
              </Button>
            </form>
          )}

          {/* Always present escape hatch */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-400">
              Already verified on another account?{' '}
              <button
                onClick={() => { logoutMutate(); router.replace('/auth/login'); }}
                className="text-primary-600 font-semibold hover:underline"
              >
                Sign out &amp; log in
              </button>
            </p>
            <Link href="/" className="block text-xs text-gray-400 hover:text-gray-600">
              ← Back to home (verification required for bookings)
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
